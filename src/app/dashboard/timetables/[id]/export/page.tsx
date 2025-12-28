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
            // Fetch timetable
            const { data: ttData, error: ttError } = await supabase
                .from('timetables')
                .select('*')
                .eq('id', id)
                .single()
            if (ttError) throw ttError
            setTimetable(ttData)

            // Fetch settings
            const { data: settingsData } = await supabase
                .from('college_settings')
                .select('*')
                .single()
            setSettings(settingsData)

            // Fetch all related data in parallel
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

            // Fetch lab batches
            const slotIds = (slotsData || []).map(s => s.id)
            let batchesData: any[] = []
            if (slotIds.length > 0) {
                const { data: bData } = await supabase.from('lab_batches').select('*').in('timetable_slot_id', slotIds)
                batchesData = bData || []
            }

            // JOIN data manually
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

    // Time Helpers
    const toMinutes = (time: string) => {
        if (!time) return 0
        const [h, m] = time.split(':').map(Number)
        return h * 60 + m
    }

    const fromMinutes = (mins: number) => {
        const h = Math.floor(mins / 60)
        const m = mins % 60
        // Use 24h format for logic, formatTime12 for display
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    const formatTime12 = (timeStr: string): string => {
        if (!timeStr) return ''
        const [hours, mins] = timeStr.split(':').map(Number)
        const period = hours >= 12 ? 'PM' : 'AM'
        const hour12 = hours % 12 || 12
        return `${hour12}:${String(mins).padStart(2, '0')} ${period}`
    }

    // Generate Grid based on Actual Slots + Gaps + Lunch
    const generateTimeSlots = () => {
        if (!settings) return []

        // 1. Start with known fixed slots: Lunch
        const fixedSlots = []
        if (settings.lunch_start_time && settings.lunch_end_time) {
            fixedSlots.push({
                start: settings.lunch_start_time,
                end: settings.lunch_end_time,
                type: 'lunch'
            })
        }

        // 2. Add Actual Slots
        // We use a Map to deduplicate by start-end key
        const uniqueTimes = new Map<string, { start: string, end: string, type?: string }>()

        // Add Fixed
        fixedSlots.forEach(s => uniqueTimes.set(`${s.start}-${s.end}`, s))

        // Add Actual Data times
        slots.forEach(s => {
            const key = `${s.start_time}-${s.end_time}`
            if (!uniqueTimes.has(key)) {
                // Check if this overlaps with Lunch?
                // If it's a "Practical" overlapping lunch, we keep it.
                // Usually we just add it.
                uniqueTimes.set(key, { start: s.start_time, end: s.end_time, type: 'class' })
            }
        })

        // Convert to array and sort
        let sortedSlots = Array.from(uniqueTimes.values()).sort((a, b) => toMinutes(a.start) - toMinutes(b.start))

        // 3. Fill Gaps
        // We want to fill gaps "intelligently" to cover College Start -> College End
        // but WITHOUT creating overlaps with existing slots.

        const filledSlots: typeof sortedSlots = []
        const collegeStart = toMinutes(settings.college_start_time)
        const collegeEnd = toMinutes(settings.college_end_time)
        const duration = settings.default_class_duration || 60

        let currentTime = collegeStart

        // Helper to find next existing slot that starts >= currentTime
        const getNextSlot = (time: number) => sortedSlots.find(s => toMinutes(s.start) >= time)

        // Iterate through the timeline
        while (currentTime < collegeEnd) {
            const nextSlot = getNextSlot(currentTime)

            if (nextSlot) {
                const nextStart = toMinutes(nextSlot.start)

                // If gap exists between current and next existing slot
                if (nextStart > currentTime) {
                    // Try to fit standard slots in the gap
                    // But if the gap is small (e.g. 5 mins), ignore?
                    // If gap is large, add empty slots.

                    // While we can fit a full slot before nextStart
                    while (currentTime + duration <= nextStart) {
                        filledSlots.push({
                            start: fromMinutes(currentTime),
                            end: fromMinutes(currentTime + duration),
                            type: 'empty'
                        })
                        currentTime += duration
                    }

                    // If there is still a small gap, we force jump to nextStart
                    // (Or add a partial slot? User said "remaining one cell should show empty")
                    // We'll jump to avoid overlap.
                    currentTime = nextStart
                }

                // Add the existing nextSlot (and any others starting at same time)
                // Actually we just add this slot (and duplicates handled by next iteration logic? No, we need to skip processed)
                // But sortedSlots has unique start-ends.
                // We should add ALL slots that match this start time/range? 

                // Simplified: Just add the nextSlot and advance current
                filledSlots.push(nextSlot)
                currentTime = Math.max(currentTime, toMinutes(nextSlot.end))

                // Remove this slot from consideration? No, `getNextSlot` finds >= currentTime.
                // Since we advanced `currentTime` to `nextSlot.end`, the next call will find the NEXT one.

            } else {
                // No more existing slots, fill until end
                while (currentTime + duration <= collegeEnd) {
                    filledSlots.push({
                        start: fromMinutes(currentTime),
                        end: fromMinutes(currentTime + duration),
                        type: 'empty'
                    })
                    currentTime += duration
                }
                // Handle remaining partial time at end?
                if (currentTime < collegeEnd) {
                    filledSlots.push({
                        start: fromMinutes(currentTime),
                        end: fromMinutes(collegeEnd),
                        type: 'empty'
                    })
                    currentTime = collegeEnd
                }
            }
        }

        return filledSlots
    }

    const timeSlots = generateTimeSlots()

    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const workingDays = (settings?.working_days || []).sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b))

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
                                        <th key={i} style={{ border: '1px solid #000', padding: '8px', background: '#f3f4f6', fontSize: '12px' }}>
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
                                workingDays.map(day => (
                                    <tr key={day}>
                                        <td style={{ border: '1px solid #000', padding: '12px', fontWeight: '600', background: '#f9fafb' }}>{day}</td>
                                        {timeSlots.map((time, i) => {
                                            const slot = slots.find(s =>
                                                s.day_of_week === day &&
                                                Math.abs(toMinutes(s.start_time) - toMinutes(time.start)) < 5 // Match approximate start
                                            )
                                            // Handle Lunch in grid
                                            if (time.type === 'lunch') return <td key={i} style={{ border: '1px solid #000', padding: '8px', background: '#fef3c7', textAlign: 'center', fontWeight: 'bold', fontSize: '12px' }}>LUNCH</td>

                                            return (
                                                <td key={i} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', verticalAlign: 'middle', height: '60px' }}>
                                                    {renderSlotContent(slot)}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))
                            ) : (
                                timeSlots.map((time, i) => (
                                    <tr key={i}>
                                        <td style={{ border: '1px solid #000', padding: '12px', fontWeight: '600', background: '#f9fafb', whiteSpace: 'nowrap' }}>
                                            {formatTime12(time.start)} - {formatTime12(time.end)}
                                            {time.type === 'lunch' && <div style={{ fontSize: '10px', color: '#b45309' }}>LUNCH</div>}
                                        </td>
                                        {workingDays.map(day => {
                                            // Special Case: If it's the lunch row
                                            if (time.type === 'lunch') {
                                                if (day === workingDays[0]) { // First col
                                                    return <td key={day} colSpan={workingDays.length} style={{ border: '1px solid #000', padding: '8px', background: '#fef3c7', textAlign: 'center', fontWeight: 'bold' }}>LUNCH BREAK</td>
                                                }
                                                return null // Scip other cols
                                            }

                                            const slot = slots.find(s =>
                                                s.day_of_week === day &&
                                                Math.abs(toMinutes(s.start_time) - toMinutes(time.start)) < 5
                                            )
                                            return (
                                                <td key={day} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', verticalAlign: 'middle', minWidth: '120px' }}>
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
    if (!slot) return ''

    if (slot.slot_type === 'lunch') {
        return (
            <div style={{ fontWeight: 'bold', color: '#92400e', background: '#fef3c7', padding: '4px', borderRadius: '4px' }}>
                LUNCH BREAK
            </div>
        )
    }

    if (slot.slot_type === 'break') {
        return (
            <div style={{ fontWeight: 'bold', color: '#1e40af', background: '#dbeafe', padding: '4px', borderRadius: '4px' }}>
                BREAK
            </div>
        )
    }

    if (slot.slot_type === 'free') {
        return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>- Free -</span>
    }

    if (slot.is_practical) {
        return (
            <div style={{ fontSize: '12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '2px', color: '#059669' }}>PRACTICAL</div>
                {slot.lab_batches?.map((batch, i) => (
                    <div key={i} style={{ borderTop: i > 0 ? '1px dashed #e5e7eb' : 'none', paddingTop: '2px', marginTop: '2px' }}>
                        <span style={{ fontWeight: '600' }}>{batch.batch_name}: </span>
                        {batch.subject?.code} ({batch.classroom?.name || slot.classroom?.name})
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div>
            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{slot.subject?.code || slot.subject?.name}</div>
            <div style={{ fontSize: '11px', color: '#4b5563' }}>
                {slot.lecturer?.short_name} • {slot.classroom?.name}
            </div>
        </div>
    )
}
