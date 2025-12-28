'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, FileText, CheckCircle2, RotateCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface Timetable {
    id: string
    title: string
    class_name: string
    semester: string
    section: string
    year: string
    status: string
}

interface TimetableSlot {
    id: string
    day_of_week: string
    start_time: string
    end_time: string
    slot_type: string
    subject_id?: string
    lecturer_id?: string
    classroom_id?: string
    subject?: { name: string, code: string }
    lecturer?: { full_name: string, short_name: string }
    classroom?: { name: string }
    is_practical: boolean
    lab_batches?: any[]
}

interface CollegeSettings {
    break_duration: number
    default_class_duration: number
    working_days: string[]
    college_start_time: string
    college_end_time: string
    college_name: string
    lunch_start_time: string
    lunch_end_time: string
}

export default function ExportTimetable() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string
    const supabase = createClient()
    const { toast } = useToast()
    const printRef = useRef<HTMLDivElement>(null)

    const [timetable, setTimetable] = useState<Timetable | null>(null)
    const [slots, setSlots] = useState<TimetableSlot[]>([])
    const [settings, setSettings] = useState<CollegeSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape')
    const [isTransposed, setIsTransposed] = useState(false)

    useEffect(() => {
        fetchData()
    }, [id])

    const fetchData = async () => {
        try {
            const { data: ttData, error: ttError } = await supabase
                .from('timetables')
                .select('*')
                .eq('id', id)
                .single()
            if (ttError) throw ttError
            setTimetable(ttData)

            const { data: settingsData } = await supabase
                .from('college_settings')
                .select('*')
                .single()
            setSettings(settingsData)

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const [
                { data: slotsData },
                { data: subjectsData },
                { data: lecturersData },
                { data: classroomsData }
            ] = await Promise.all([
                supabase.from('timetable_slots').select('*').eq('timetable_id', id),
                supabase.from('subjects').select('*').eq('user_id', user.id),
                supabase.from('lecturers').select('*').eq('user_id', user.id),
                supabase.from('classrooms').select('*').eq('user_id', user.id)
            ])

            const slotIds = (slotsData || []).map(s => s.id)
            let batchesData: any[] = []
            if (slotIds.length > 0) {
                const { data: bData } = await supabase.from('lab_batches').select('*').in('timetable_slot_id', slotIds)
                batchesData = bData || []
            }

            const joinedSlots = (slotsData || []).map(slot => {
                const batches = batchesData.filter(b => b.timetable_slot_id === slot.id).map(b => ({
                    ...b,
                    subject: subjectsData?.find((s: any) => s.id === b.subject_id),
                    lecturer: lecturersData?.find((l: any) => l.id === b.lecturer_id),
                    classroom: classroomsData?.find((c: any) => c.id === b.classroom_id)
                }))

                return {
                    ...slot,
                    subject: subjectsData?.find((s: any) => s.id === slot.subject_id),
                    lecturer: lecturersData?.find((l: any) => l.id === slot.lecturer_id),
                    classroom: classroomsData?.find((c: any) => c.id === slot.classroom_id),
                    lab_batches: batches
                }
            })

            setSlots(joinedSlots)
        } catch (error) {
            console.error('Error loading export data:', error)
            toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    const toMinutes = (time: string) => {
        if (!time) return 0
        const [h, m] = time.split(':').map(Number)
        return h * 60 + m
    }

    const fromMinutes = (mins: number) => {
        const h = Math.floor(mins / 60)
        const m = mins % 60
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    const formatTime12 = (timeStr: string): string => {
        if (!timeStr) return ''
        const [hours, mins] = timeStr.split(':').map(Number)
        const period = hours >= 12 ? 'PM' : 'AM'
        const hour12 = hours % 12 || 12
        return `${hour12}:${String(mins).padStart(2, '0')} ${period}`
    }

    // Generate Standard Grid with proper break duration from settings
    const generateStandardGrid = () => {
        if (!settings) return []

        const grid: { start: string, end: string, type: 'class' | 'lunch' | 'break' }[] = []
        let current = toMinutes(settings.college_start_time)
        const end = toMinutes(settings.college_end_time)
        const lunchStart = toMinutes(settings.lunch_start_time)
        const lunchEnd = toMinutes(settings.lunch_end_time)
        const classDuration = settings.default_class_duration || 55
        const breakDuration = settings.break_duration || 15

        while (current < end) {
            // Check if we're at lunch
            if (current === lunchStart) {
                grid.push({
                    start: settings.lunch_start_time,
                    end: settings.lunch_end_time,
                    type: 'lunch'
                })
                current = lunchEnd
                continue
            }

            // Check if there's a break slot matching this time in the data
            const breakSlot = slots.find(s =>
                s.slot_type === 'break' &&
                Math.abs(toMinutes(s.start_time) - current) < 5
            )

            if (breakSlot) {
                grid.push({
                    start: breakSlot.start_time,
                    end: breakSlot.end_time,
                    type: 'break'
                })
                current = toMinutes(breakSlot.end_time)
                continue
            }

            // Normal class slot
            let next = current + classDuration

            // Cap at lunch if approaching
            if (current < lunchStart && next > lunchStart) {
                next = lunchStart
            }
            // Cap at end
            if (next > end) next = end

            if (next > current) {
                grid.push({
                    start: fromMinutes(current),
                    end: fromMinutes(next),
                    type: 'class'
                })
            }
            current = next
        }
        return grid
    }

    const timeSlots = generateStandardGrid()
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const workingDays = (settings?.working_days || []).sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b))

    const findSlotAndSpan = (day: string, slotStartMins: number) => {
        const slot = slots.find(s =>
            s.day_of_week === day &&
            Math.abs(toMinutes(s.start_time) - slotStartMins) < 5
        )

        if (!slot) return { slot: undefined, span: 1 }

        let span = 1
        const startIndex = timeSlots.findIndex(t => Math.abs(toMinutes(t.start) - slotStartMins) < 5)

        if (startIndex !== -1) {
            for (let i = startIndex + 1; i < timeSlots.length; i++) {
                const gridSlotEnd = toMinutes(timeSlots[i].end)
                if (gridSlotEnd <= toMinutes(slot.end_time) + 1) {
                    span++
                } else {
                    break
                }
            }
        }

        return { slot, span }
    }

    const occupiedCells = new Set<string>()

    const handleDownloadPDF = async () => {
        if (!printRef.current) return

        const element = printRef.current
        const canvas = await html2canvas(element, {
            scale: 2,
            logging: false,
            useCORS: true
        })

        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: 'a4'
        })

        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = pdf.internal.pageSize.getHeight()
        const imgWidth = canvas.width
        const imgHeight = canvas.height
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)

        const imgX = (pdfWidth - imgWidth * ratio) / 2
        const imgY = 10

        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio)
        pdf.save(`${timetable?.title || 'timetable'}.pdf`)

        toast({ title: 'Exported!', description: 'PDF downloaded successfully' })
    }

    const handleMarkAsFinal = async () => {
        try {
            await supabase.from('timetables').update({ status: 'done' }).eq('id', id)
            toast({ title: 'Updated', description: 'Marked as Final Version' })
            fetchData()
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' })
        }
    }

    // Find lunch column index for spanning in transposed view
    const lunchColumnIndex = timeSlots.findIndex(t => t.type === 'lunch')

    if (loading) return <div className="p-8">Loading...</div>

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <Link href={`/dashboard/timetables/${id}`}>
                    <button style={{
                        padding: '8px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        background: 'white',
                        cursor: 'pointer'
                    }}>
                        <ArrowLeft size={20} />
                    </button>
                </Link>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Export Timetable</h1>
                    <p style={{ color: '#6b7280' }}>{timetable?.title}</p>
                </div>

                {timetable?.status === 'done' ? (
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', background: '#d1fae5', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: '500' }}>
                        <CheckCircle2 size={16} />
                        Final Version
                    </div>
                ) : (
                    <button
                        onClick={handleMarkAsFinal}
                        style={{
                            marginLeft: 'auto',
                            background: '#059669',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <CheckCircle2 size={16} />
                        Mark as Final
                    </button>
                )}
            </div>

            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Export Options</h2>

                <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Page Orientation</label>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="orientation"
                                    checked={orientation === 'portrait'}
                                    onChange={() => setOrientation('portrait')}
                                />
                                Portrait
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="orientation"
                                    checked={orientation === 'landscape'}
                                    onChange={() => setOrientation('landscape')}
                                />
                                Landscape (Recommended)
                            </label>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Layout</label>
                        <button
                            onClick={() => setIsTransposed(!isTransposed)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 12px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                background: '#f9fafb',
                                cursor: 'pointer'
                            }}
                        >
                            <RotateCw size={16} />
                            {isTransposed ? 'Days x Times (Rows x Cols)' : 'Times x Days (Rows x Cols)'}
                        </button>
                    </div>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                    <button
                        onClick={handleDownloadPDF}
                        style={{
                            background: '#4f46e5',
                            color: 'white',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: '500'
                        }}
                    >
                        <FileText size={18} />
                        Download PDF
                    </button>
                </div>
            </div>

            <div style={{ background: '#f3f4f6', padding: '24px', borderRadius: '12px', overflow: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Preview</h2>
                </div>

                <div
                    ref={printRef}
                    style={{
                        background: 'white',
                        padding: '40px',
                        width: orientation === 'landscape' ? '1123px' : '794px',
                        minHeight: orientation === 'landscape' ? '794px' : '1123px',
                        margin: '0 auto',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                >
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>{settings?.college_name || 'College Name'}</h1>
                        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>{timetable?.title}</h2>
                        <p style={{ color: '#6b7280' }}>Academic Year: {timetable?.year}</p>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000' }}>
                        <thead>
                            <tr>
                                <th style={{ border: '1px solid #000', padding: '8px', background: '#f3f4f6' }}>
                                    {isTransposed ? 'Day / Time' : 'Time / Day'}
                                </th>
                                {isTransposed ? (
                                    timeSlots.map((time, i) => (
                                        <th key={i} style={{ border: '1px solid #000', padding: '8px', background: '#f3f4f6', fontSize: '11px' }}>
                                            {formatTime12(time.start)} - {formatTime12(time.end)}
                                        </th>
                                    ))
                                ) : (
                                    workingDays.map(day => (
                                        <th key={day} style={{ border: '1px solid #000', padding: '8px', background: '#f3f4f6' }}>{day}</th>
                                    ))
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {isTransposed ? (
                                // Transposed View: Days as Rows, Times as Columns
                                workingDays.map((day, dayIndex) => (
                                    <tr key={day}>
                                        <td style={{ border: '1px solid #000', padding: '12px', fontWeight: '600', background: '#f9fafb' }}>{day}</td>
                                        {timeSlots.map((time, i) => {
                                            const timeStartMins = toMinutes(time.start)
                                            if (occupiedCells.has(`${day}-${timeStartMins}`)) return null

                                            // Lunch column spans all rows
                                            if (time.type === 'lunch') {
                                                if (dayIndex === 0) {
                                                    return (
                                                        <td
                                                            key={i}
                                                            rowSpan={workingDays.length}
                                                            style={{
                                                                border: '1px solid #000',
                                                                padding: '8px',
                                                                background: '#fef3c7',
                                                                textAlign: 'center',
                                                                fontWeight: 'bold',
                                                                fontSize: '12px',
                                                                writingMode: 'vertical-rl',
                                                                textOrientation: 'mixed'
                                                            }}
                                                        >
                                                            LUNCH
                                                        </td>
                                                    )
                                                }
                                                return null
                                            }

                                            // Break column
                                            if (time.type === 'break') {
                                                if (dayIndex === 0) {
                                                    return (
                                                        <td
                                                            key={i}
                                                            rowSpan={workingDays.length}
                                                            style={{
                                                                border: '1px solid #000',
                                                                padding: '8px',
                                                                background: '#dbeafe',
                                                                textAlign: 'center',
                                                                fontWeight: 'bold',
                                                                fontSize: '12px',
                                                                writingMode: 'vertical-rl',
                                                                textOrientation: 'mixed'
                                                            }}
                                                        >
                                                            BREAK
                                                        </td>
                                                    )
                                                }
                                                return null
                                            }

                                            const { slot, span } = findSlotAndSpan(day, timeStartMins)

                                            if (slot && span > 1) {
                                                for (let k = 1; k < span; k++) {
                                                    if (timeSlots[i + k]) {
                                                        const nextStart = toMinutes(timeSlots[i + k].start)
                                                        occupiedCells.add(`${day}-${nextStart}`)
                                                    }
                                                }
                                            }

                                            return (
                                                <td key={i} colSpan={span} style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', verticalAlign: 'middle', minHeight: '50px' }}>
                                                    {renderSlotContent(slot)}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))
                            ) : (
                                // Standard View: Times as Rows, Days as Columns
                                timeSlots.map((time, i) => (
                                    <tr key={i}>
                                        <td style={{ border: '1px solid #000', padding: '12px', fontWeight: '600', background: '#f9fafb', whiteSpace: 'nowrap', fontSize: '12px' }}>
                                            {formatTime12(time.start)} - {formatTime12(time.end)}
                                        </td>
                                        {workingDays.map(day => {
                                            const timeStartMins = toMinutes(time.start)
                                            if (occupiedCells.has(`${day}-${timeStartMins}`)) return null

                                            // Lunch row spans all columns
                                            if (time.type === 'lunch') {
                                                if (day === workingDays[0]) {
                                                    return <td key={day} colSpan={workingDays.length} style={{ border: '1px solid #000', padding: '8px', background: '#fef3c7', textAlign: 'center', fontWeight: 'bold' }}>LUNCH BREAK</td>
                                                }
                                                return null
                                            }

                                            // Break row spans all columns
                                            if (time.type === 'break') {
                                                if (day === workingDays[0]) {
                                                    return <td key={day} colSpan={workingDays.length} style={{ border: '1px solid #000', padding: '8px', background: '#dbeafe', textAlign: 'center', fontWeight: 'bold' }}>BREAK</td>
                                                }
                                                return null
                                            }

                                            const { slot, span } = findSlotAndSpan(day, timeStartMins)

                                            if (slot && span > 1) {
                                                for (let k = 1; k < span; k++) {
                                                    if (timeSlots[i + k]) {
                                                        const nextStart = toMinutes(timeSlots[i + k].start)
                                                        occupiedCells.add(`${day}-${nextStart}`)
                                                    }
                                                }
                                            }

                                            return (
                                                <td key={day} rowSpan={span} style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', verticalAlign: 'middle', minWidth: '100px' }}>
                                                    {renderSlotContent(slot)}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    <div style={{ marginTop: '20px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
                        Generated by TimeTable Pro • {new Date().toLocaleDateString()}
                    </div>
                </div>
            </div>
        </div>
    )
}

function renderSlotContent(slot: TimetableSlot | undefined) {
    if (!slot) return '' // Empty cell, no placeholder

    if (slot.slot_type === 'free') {
        return '' // Leave blank for free periods
    }

    if (slot.slot_type === 'lunch') {
        return null // Handled by grid
    }

    if (slot.slot_type === 'break') {
        return null // Handled by grid
    }

    if (slot.slot_type === 'cultural' || slot.subject?.name?.toLowerCase().includes('cultural')) {
        return (
            <div>
                <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#7c3aed' }}>CULTURAL</div>
                <div style={{ fontSize: '10px', color: '#4b5563' }}>
                    {slot.subject?.code || slot.subject?.name || 'Activity'}
                </div>
                <div style={{ fontSize: '9px', color: '#9ca3af' }}>
                    {slot.classroom?.name}
                </div>
            </div>
        )
    }

    if (slot.is_practical && slot.lab_batches && slot.lab_batches.length > 0) {
        // 2x2 Grid Layout for Practical with lecturers
        return (
            <div style={{ fontSize: '10px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#059669', fontSize: '11px' }}>PRACTICAL</div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '4px',
                    fontSize: '9px'
                }}>
                    {slot.lab_batches.map((batch, i) => (
                        <div
                            key={i}
                            style={{
                                background: '#f0fdf4',
                                padding: '3px',
                                borderRadius: '3px',
                                border: '1px solid #d1fae5'
                            }}
                        >
                            <div style={{ fontWeight: '600' }}>{batch.batch_name}:</div>
                            <div>{batch.subject?.code}</div>
                            <div style={{ color: '#6b7280' }}>{batch.lecturer?.short_name || batch.lecturer?.full_name}</div>
                            <div style={{ color: '#9ca3af', fontSize: '8px' }}>({batch.classroom?.name || slot.classroom?.name})</div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // Theory class
    return (
        <div>
            <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{slot.subject?.code || slot.subject?.name}</div>
            <div style={{ fontSize: '10px', color: '#4b5563' }}>
                {slot.lecturer?.short_name} • {slot.classroom?.name}
            </div>
        </div>
    )
}
