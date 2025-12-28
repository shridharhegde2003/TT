'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
    Download,
    Loader2,
    ArrowLeft,
    FileImage,
    FileText,
    Layers,
    SplitSquareVertical
} from 'lucide-react'
import type {
    Timetable,
    TimetableSlot,
    CollegeSettings,
    Lecturer,
    Classroom,
    Subject,
    LabBatch
} from '@/lib/types'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface SlotWithDetails extends TimetableSlot {
    subject?: Subject
    lecturer?: Lecturer
    classroom?: Classroom
    lab_batches?: (LabBatch & { subject?: Subject; lecturer?: Lecturer })[]
}

interface TimetableWithSlots extends Timetable {
    slots: SlotWithDetails[]
}

export default function ExportTimetablePage() {
    const { id } = useParams()
    const router = useRouter()
    const supabase = createClient()
    const { toast } = useToast()
    const timetableRef = useRef<HTMLDivElement>(null)
    const mergedTimetableRef = useRef<HTMLDivElement>(null)

    // State
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape')
    const [timetable, setTimetable] = useState<Timetable | null>(null)
    const [slots, setSlots] = useState<SlotWithDetails[]>([])
    const [settings, setSettings] = useState<CollegeSettings | null>(null)

    // Multi-section state
    const [relatedTimetables, setRelatedTimetables] = useState<TimetableWithSlots[]>([])
    const [exportMode, setExportMode] = useState<'single' | 'merged'>('single')
    const [hasMultipleSections, setHasMultipleSections] = useState(false)

    useEffect(() => {
        fetchData()
    }, [id])

    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/auth')
                return
            }

            const [
                { data: timetableData },
                { data: slotsData },
                { data: settingsData }
            ] = await Promise.all([
                supabase.from('timetables').select('*').eq('id', id).single(),
                supabase.from('timetable_slots')
                    .select('*, subject:subjects(*), lecturer:lecturers(*), classroom:classrooms(*)')
                    .eq('timetable_id', id)
                    .order('slot_order', { ascending: true }),
                supabase.from('college_settings').select('*').eq('user_id', user.id).single()
            ])

            if (!timetableData) {
                router.push('/dashboard/timetables')
                return
            }

            // Fetch lab batches
            const practicalSlots = (slotsData || []).filter(s => s.is_practical)
            if (practicalSlots.length > 0) {
                const { data: batchesData } = await supabase
                    .from('lab_batches')
                    .select('*, subject:subjects(*), lecturer:lecturers(*)')
                    .in('timetable_slot_id', practicalSlots.map(s => s.id))

                const slotsWithBatches = (slotsData || []).map(slot => ({
                    ...slot,
                    lab_batches: (batchesData || []).filter(b => b.timetable_slot_id === slot.id)
                }))
                setSlots(slotsWithBatches)
            } else {
                setSlots(slotsData || [])
            }

            setTimetable(timetableData)
            setSettings(settingsData)

            // Check for related timetables with same class_name, semester, year but different sections
            const { data: relatedData } = await supabase
                .from('timetables')
                .select('*')
                .eq('user_id', user.id)
                .eq('class_name', timetableData.class_name)
                .eq('semester', timetableData.semester)
                .eq('year', timetableData.year)
                .neq('id', id)
                .not('section', 'is', null)

            if (relatedData && relatedData.length > 0 && timetableData.section) {
                setHasMultipleSections(true)

                // Fetch slots for all related timetables
                const allTimetables: TimetableWithSlots[] = [{
                    ...timetableData,
                    slots: slotsData || []
                }]

                for (const related of relatedData) {
                    const { data: relatedSlots } = await supabase
                        .from('timetable_slots')
                        .select('*, subject:subjects(*), lecturer:lecturers(*), classroom:classrooms(*)')
                        .eq('timetable_id', related.id)
                        .order('slot_order', { ascending: true })

                    // Fetch lab batches for related
                    const relatedPracticalSlots = (relatedSlots || []).filter(s => s.is_practical)
                    let finalRelatedSlots = relatedSlots || []

                    if (relatedPracticalSlots.length > 0) {
                        const { data: relatedBatches } = await supabase
                            .from('lab_batches')
                            .select('*, subject:subjects(*), lecturer:lecturers(*)')
                            .in('timetable_slot_id', relatedPracticalSlots.map(s => s.id))

                        finalRelatedSlots = (relatedSlots || []).map(slot => ({
                            ...slot,
                            lab_batches: (relatedBatches || []).filter(b => b.timetable_slot_id === slot.id)
                        }))
                    }

                    allTimetables.push({
                        ...related,
                        slots: finalRelatedSlots
                    })
                }

                // Sort by section
                allTimetables.sort((a, b) => (a.section || '').localeCompare(b.section || ''))
                setRelatedTimetables(allTimetables)
            }
        } catch (error) {
            console.error('Error:', error)
            toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    const getTimeSlots = (slotsToUse: SlotWithDetails[] = slots) => {
        const uniqueTimes = new Set<string>()
        slotsToUse.forEach(slot => {
            uniqueTimes.add(`${slot.start_time}-${slot.end_time}`)
        })
        return Array.from(uniqueTimes).sort()
    }

    const getAllTimeSlots = () => {
        const uniqueTimes = new Set<string>()
        relatedTimetables.forEach(tt => {
            tt.slots.forEach(slot => {
                uniqueTimes.add(`${slot.start_time}-${slot.end_time}`)
            })
        })
        return Array.from(uniqueTimes).sort()
    }

    const getSlotForDayAndTime = (day: string, timeSlot: string, slotsToUse: SlotWithDetails[] = slots) => {
        const [start, end] = timeSlot.split('-')
        return slotsToUse.find(s =>
            s.day_of_week === day &&
            s.start_time === start &&
            s.end_time === end
        )
    }

    const exportToPDF = async (merged: boolean = false) => {
        const refToUse = merged ? mergedTimetableRef.current : timetableRef.current
        if (!refToUse) return
        setExporting(true)

        try {
            const canvas = await html2canvas(refToUse, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            })

            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF(orientation === 'landscape' ? 'l' : 'p', 'mm', 'a4')

            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = pdf.internal.pageSize.getHeight()

            const imgWidth = canvas.width
            const imgHeight = canvas.height
            const ratio = Math.min((pdfWidth - 20) / imgWidth, (pdfHeight - 40) / imgHeight)

            const imgX = (pdfWidth - imgWidth * ratio) / 2
            const imgY = 10

            pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio)

            let fileName = ''
            if (merged) {
                fileName = `${timetable?.class_name}_Sem${timetable?.semester}_AllSections_${timetable?.year}.pdf`
            } else {
                fileName = `${timetable?.class_name}_Sem${timetable?.semester}${timetable?.section ? `_Section${timetable.section}` : ''}_${timetable?.year}.pdf`
            }
            pdf.save(fileName.replace(/\s+/g, '_'))

            toast({ title: 'Exported!', description: 'PDF downloaded successfully' })
        } catch (error) {
            console.error('Export error:', error)
            toast({ title: 'Error', description: 'Failed to export PDF', variant: 'destructive' })
        } finally {
            setExporting(false)
        }
    }

    const exportToImage = async (merged: boolean = false) => {
        const refToUse = merged ? mergedTimetableRef.current : timetableRef.current
        if (!refToUse) return
        setExporting(true)

        try {
            const canvas = await html2canvas(refToUse, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            })

            const link = document.createElement('a')
            let fileName = ''
            if (merged) {
                fileName = `${timetable?.class_name}_Sem${timetable?.semester}_AllSections_${timetable?.year}.png`
            } else {
                fileName = `${timetable?.class_name}_Sem${timetable?.semester}${timetable?.section ? `_Section${timetable.section}` : ''}_${timetable?.year}.png`
            }
            link.download = fileName.replace(/\s+/g, '_')
            link.href = canvas.toDataURL('image/png')
            link.click()

            toast({ title: 'Exported!', description: 'Image downloaded successfully' })
        } catch (error) {
            console.error('Export error:', error)
            toast({ title: 'Error', description: 'Failed to export image', variant: 'destructive' })
        } finally {
            setExporting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        )
    }

    if (!timetable || !settings) {
        return (
            <div className="text-center py-12">
                <p>Timetable not found</p>
                <Link href="/dashboard/timetables">
                    <Button className="mt-4">Back to Timetables</Button>
                </Link>
            </div>
        )
    }

    const workingDays = settings.working_days || []
    const timeSlots = getTimeSlots()
    const allTimeSlots = hasMultipleSections ? getAllTimeSlots() : []

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href={`/dashboard/timetables/${id}`}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Export Timetable</h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            {timetable.class_name} - Sem {timetable.semester}
                            {timetable.section && ` (Section ${timetable.section})`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Export Mode Selection for Multiple Sections */}
            {hasMultipleSections && (
                <Card className="premium-card border-purple-200 dark:border-purple-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Layers className="w-5 h-5" />
                            Multiple Sections Detected
                        </CardTitle>
                        <CardDescription>
                            Found {relatedTimetables.length} sections for {timetable.class_name} Sem {timetable.semester}.
                            Choose how you want to export.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={() => setExportMode('single')}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${exportMode === 'single'
                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <SplitSquareVertical className="w-6 h-6 text-purple-600" />
                                    <h3 className="font-semibold">Separate PDFs</h3>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Export each section's timetable as a separate PDF file
                                </p>
                            </button>

                            <button
                                onClick={() => setExportMode('merged')}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${exportMode === 'merged'
                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <Layers className="w-6 h-6 text-purple-600" />
                                    <h3 className="font-semibold">Merged Timetable</h3>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    All sections in one PDF with section rows for each time slot
                                </p>
                            </button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Export Options */}
            <Card className="premium-card">
                <CardHeader>
                    <CardTitle>Export Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Page Orientation</Label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={orientation === 'portrait'}
                                    onChange={() => setOrientation('portrait')}
                                />
                                <span>Portrait</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={orientation === 'landscape'}
                                    onChange={() => setOrientation('landscape')}
                                />
                                <span>Landscape (Recommended)</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Button
                            onClick={() => exportToPDF(exportMode === 'merged')}
                            disabled={exporting}
                            className="btn-gradient"
                        >
                            {exporting ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <FileText className="w-4 h-4 mr-2" />
                            )}
                            Download PDF
                        </Button>
                        <Button
                            onClick={() => exportToImage(exportMode === 'merged')}
                            disabled={exporting}
                            variant="outline"
                        >
                            {exporting ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <FileImage className="w-4 h-4 mr-2" />
                            )}
                            Download Image
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Preview - Single Section */}
            {exportMode === 'single' && (
                <Card className="premium-card overflow-x-auto">
                    <CardHeader>
                        <CardTitle>Preview - Section {timetable.section || 'Single'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div
                            ref={timetableRef}
                            className="bg-white p-6 min-w-[800px]"
                            style={{ fontFamily: 'Arial, sans-serif' }}
                        >
                            {/* Header */}
                            <div className="text-center mb-6">
                                <h1 className="text-xl font-bold text-gray-900 mb-1">
                                    {settings.college_name}
                                </h1>
                                <h2 className="text-lg font-semibold text-gray-800">
                                    {timetable.class_name} - Semester {timetable.semester}
                                    {timetable.section && ` (Section ${timetable.section})`}
                                </h2>
                                <p className="text-sm text-gray-600">Academic Year: {timetable.year}</p>
                            </div>

                            {/* Timetable Grid */}
                            <table className="w-full border-collapse border-2 border-gray-800 text-sm">
                                <thead>
                                    <tr>
                                        <th className="border-2 border-gray-800 p-2 bg-gray-100 font-bold">
                                            Time / Day
                                        </th>
                                        {workingDays.map((day: string) => (
                                            <th
                                                key={day}
                                                className="border-2 border-gray-800 p-2 bg-gray-100 font-bold min-w-[100px]"
                                            >
                                                {day}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {timeSlots.map((timeSlot) => {
                                        const [start, end] = timeSlot.split('-')

                                        return (
                                            <tr key={timeSlot}>
                                                <td className="border-2 border-gray-800 p-2 font-medium text-center bg-gray-50">
                                                    {start} - {end}
                                                </td>
                                                {workingDays.map((day: string) => {
                                                    const slot = getSlotForDayAndTime(day, timeSlot)

                                                    if (!slot) {
                                                        return (
                                                            <td key={day} className="border-2 border-gray-800 p-2 text-center text-gray-400">
                                                                -
                                                            </td>
                                                        )
                                                    }

                                                    if (slot.slot_type === 'lunch') {
                                                        return (
                                                            <td
                                                                key={day}
                                                                className="border-2 border-gray-800 p-2 text-center bg-orange-50 font-medium"
                                                            >
                                                                LUNCH
                                                            </td>
                                                        )
                                                    }

                                                    if (slot.slot_type === 'break') {
                                                        return (
                                                            <td
                                                                key={day}
                                                                className="border-2 border-gray-800 p-2 text-center bg-blue-50 font-medium"
                                                            >
                                                                BREAK
                                                            </td>
                                                        )
                                                    }

                                                    return (
                                                        <td
                                                            key={day}
                                                            className="border-2 border-gray-800 p-2 text-center"
                                                            style={{ backgroundColor: `${slot.subject?.color}15` }}
                                                        >
                                                            <div className="font-semibold text-gray-900">
                                                                {slot.subject?.name}
                                                            </div>
                                                            {slot.subject?.code && (
                                                                <div className="text-xs text-gray-600">
                                                                    ({slot.subject.code})
                                                                </div>
                                                            )}

                                                            {slot.is_practical && slot.lab_batches && slot.lab_batches.length > 0 ? (
                                                                <div className="text-xs text-gray-700 mt-1">
                                                                    {slot.lab_batches.map((b, i) => (
                                                                        <div key={i}>
                                                                            {b.batch_name}: {b.lecturer?.short_name || '-'}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-xs text-gray-700 mt-1">
                                                                    {slot.lecturer?.short_name}
                                                                    {slot.classroom && ` · ${slot.classroom.name}`}
                                                                </div>
                                                            )}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>

                            {/* Footer */}
                            <div className="mt-4 text-xs text-gray-500 text-center">
                                Generated by TimeTable Pro • {new Date().toLocaleDateString()}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Preview - Merged Sections */}
            {exportMode === 'merged' && hasMultipleSections && (
                <Card className="premium-card overflow-x-auto">
                    <CardHeader>
                        <CardTitle>Preview - All Sections Merged</CardTitle>
                        <CardDescription>
                            Sections: {relatedTimetables.map(t => t.section).join(', ')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div
                            ref={mergedTimetableRef}
                            className="bg-white p-6 min-w-[900px]"
                            style={{ fontFamily: 'Arial, sans-serif' }}
                        >
                            {/* Header */}
                            <div className="text-center mb-6">
                                <h1 className="text-xl font-bold text-gray-900 mb-1">
                                    {settings.college_name}
                                </h1>
                                <h2 className="text-lg font-semibold text-gray-800">
                                    {timetable.class_name} - Semester {timetable.semester} (All Sections)
                                </h2>
                                <p className="text-sm text-gray-600">Academic Year: {timetable.year}</p>
                            </div>

                            {/* Merged Timetable Grid */}
                            <table className="w-full border-collapse border-2 border-gray-800 text-sm">
                                <thead>
                                    <tr>
                                        <th className="border-2 border-gray-800 p-2 bg-gray-100 font-bold">
                                            Time
                                        </th>
                                        <th className="border-2 border-gray-800 p-2 bg-gray-100 font-bold">
                                            Sec
                                        </th>
                                        {workingDays.map((day: string) => (
                                            <th
                                                key={day}
                                                className="border-2 border-gray-800 p-2 bg-gray-100 font-bold min-w-[90px]"
                                            >
                                                {day}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {allTimeSlots.map((timeSlot) => {
                                        const [start, end] = timeSlot.split('-')

                                        return relatedTimetables.map((tt, ttIndex) => (
                                            <tr key={`${timeSlot}-${tt.id}`}>
                                                {ttIndex === 0 && (
                                                    <td
                                                        className="border-2 border-gray-800 p-2 font-medium text-center bg-gray-50"
                                                        rowSpan={relatedTimetables.length}
                                                    >
                                                        {start}<br />-<br />{end}
                                                    </td>
                                                )}
                                                <td className="border-2 border-gray-800 p-1 font-bold text-center bg-purple-50">
                                                    {tt.section}
                                                </td>
                                                {workingDays.map((day: string) => {
                                                    const slot = getSlotForDayAndTime(day, timeSlot, tt.slots)

                                                    if (!slot) {
                                                        return (
                                                            <td key={day} className="border-2 border-gray-800 p-1 text-center text-gray-400 text-xs">
                                                                -
                                                            </td>
                                                        )
                                                    }

                                                    if (slot.slot_type === 'lunch') {
                                                        return (
                                                            <td
                                                                key={day}
                                                                className="border-2 border-gray-800 p-1 text-center bg-orange-50 font-medium text-xs"
                                                            >
                                                                LUNCH
                                                            </td>
                                                        )
                                                    }

                                                    if (slot.slot_type === 'break') {
                                                        return (
                                                            <td
                                                                key={day}
                                                                className="border-2 border-gray-800 p-1 text-center bg-blue-50 font-medium text-xs"
                                                            >
                                                                BREAK
                                                            </td>
                                                        )
                                                    }

                                                    return (
                                                        <td
                                                            key={day}
                                                            className="border-2 border-gray-800 p-1 text-center text-xs"
                                                            style={{ backgroundColor: `${slot.subject?.color}15` }}
                                                        >
                                                            <div className="font-semibold text-gray-900">
                                                                {slot.subject?.name}
                                                            </div>
                                                            {slot.is_practical && slot.lab_batches && slot.lab_batches.length > 0 ? (
                                                                <div className="text-gray-600">
                                                                    {slot.lab_batches.map(b => b.lecturer?.short_name).join(', ')}
                                                                </div>
                                                            ) : (
                                                                <div className="text-gray-600">
                                                                    {slot.lecturer?.short_name}
                                                                </div>
                                                            )}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))
                                    })}
                                </tbody>
                            </table>

                            {/* Legend */}
                            <div className="mt-4 flex gap-4 text-xs text-gray-600">
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-purple-50 border border-gray-400"></div>
                                    <span>Section</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-orange-50 border border-gray-400"></div>
                                    <span>Lunch</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-blue-50 border border-gray-400"></div>
                                    <span>Break</span>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="mt-4 text-xs text-gray-500 text-center">
                                Generated by TimeTable Pro • {new Date().toLocaleDateString()}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
