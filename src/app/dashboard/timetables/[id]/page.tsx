'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
    Plus,
    Trash2,
    Loader2,
    ArrowLeft,
    AlertTriangle,
    CheckCircle2,
    Download,
    Clock,
    Coffee,
    UtensilsCrossed,
    BookOpen,
    FlaskConical,
    X,
    Users
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

interface SlotWithDetails extends TimetableSlot {
    subject?: Subject
    lecturer?: Lecturer
    classroom?: Classroom
    lab_batches?: LabBatchWithDetails[]
}

interface LabBatchWithDetails extends LabBatch {
    subject?: Subject
    lecturer?: Lecturer
}

export default function TimetableEditorPage() {
    const { id } = useParams()
    const router = useRouter()
    const supabase = createClient()
    const { toast } = useToast()

    // State
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [timetable, setTimetable] = useState<Timetable | null>(null)
    const [slots, setSlots] = useState<SlotWithDetails[]>([])
    const [settings, setSettings] = useState<CollegeSettings | null>(null)
    const [lecturers, setLecturers] = useState<Lecturer[]>([])
    const [classrooms, setClassrooms] = useState<Classroom[]>([])
    const [subjects, setSubjects] = useState<Subject[]>([])

    // Add slot form
    const [showAddForm, setShowAddForm] = useState(false)
    const [selectedDay, setSelectedDay] = useState('')
    const [slotType, setSlotType] = useState<'class' | 'break' | 'lunch'>('class')
    const [selectedSubject, setSelectedSubject] = useState('')
    const [selectedLecturer, setSelectedLecturer] = useState('')
    const [selectedClassroom, setSelectedClassroom] = useState('')
    const [isPractical, setIsPractical] = useState(false)
    const [numberOfPeriods, setNumberOfPeriods] = useState(1)
    const [labBatches, setLabBatches] = useState<{ batch_name: string, subject_id: string, lecturer_id: string }[]>([])
    const [conflictWarning, setConflictWarning] = useState<string | null>(null)

    // Fetch all data
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

            // Fetch all data in parallel
            const [
                { data: timetableData },
                { data: slotsData },
                { data: settingsData },
                { data: lecturersData },
                { data: classroomsData },
                { data: subjectsData }
            ] = await Promise.all([
                supabase.from('timetables').select('*').eq('id', id).single(),
                supabase.from('timetable_slots')
                    .select('*, subject:subjects(*), lecturer:lecturers(*), classroom:classrooms(*)')
                    .eq('timetable_id', id)
                    .order('slot_order', { ascending: true }),
                supabase.from('college_settings').select('*').eq('user_id', user.id).single(),
                supabase.from('lecturers').select('*').eq('user_id', user.id).order('full_name'),
                supabase.from('classrooms').select('*').eq('user_id', user.id).order('name'),
                supabase.from('subjects').select('*').eq('user_id', user.id).order('name')
            ])

            if (!timetableData) {
                toast({ title: 'Not Found', description: 'Timetable not found', variant: 'destructive' })
                router.push('/dashboard/timetables')
                return
            }

            // Fetch lab batches for practical slots
            const practicalSlots = (slotsData || []).filter(s => s.is_practical)
            if (practicalSlots.length > 0) {
                const { data: batchesData } = await supabase
                    .from('lab_batches')
                    .select('*, subject:subjects(*), lecturer:lecturers(*)')
                    .in('timetable_slot_id', practicalSlots.map(s => s.id))

                // Attach batches to slots
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
            setLecturers(lecturersData || [])
            setClassrooms(classroomsData || [])
            setSubjects(subjectsData || [])

            if (settingsData?.working_days?.[0]) {
                setSelectedDay(settingsData.working_days[0])
            }
        } catch (error) {
            console.error('Error fetching data:', error)
            toast({ title: 'Error', description: 'Failed to load timetable', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    // Calculate next time slot
    const getNextTimeSlot = useCallback((day: string, periods: number = 1) => {
        const daySlots = slots.filter(s => s.day_of_week === day).sort((a, b) => a.slot_order - b.slot_order)
        const duration = (settings?.default_class_duration || 55) * periods

        if (daySlots.length === 0 && settings) {
            return {
                start: settings.college_start_time,
                end: addMinutes(settings.college_start_time, duration),
                order: 1
            }
        }

        const lastSlot = daySlots[daySlots.length - 1]
        if (!lastSlot || !settings) {
            return { start: '09:00', end: addMinutes('09:00', duration), order: 1 }
        }

        // Check if we need to skip lunch break
        const lunchStart = settings.lunch_start_time
        const lunchEnd = settings.lunch_end_time
        const lastEndTime = lastSlot.end_time

        if (lastEndTime >= lunchStart && lastEndTime < lunchEnd) {
            return {
                start: lunchEnd,
                end: addMinutes(lunchEnd, duration),
                order: lastSlot.slot_order + 1
            }
        }

        return {
            start: lastSlot.end_time,
            end: addMinutes(lastSlot.end_time, duration),
            order: lastSlot.slot_order + 1
        }
    }, [slots, settings])

    const addMinutes = (timeStr: string, minutes: number): string => {
        const [hours, mins] = timeStr.split(':').map(Number)
        const totalMins = hours * 60 + mins + minutes
        const newHours = Math.floor(totalMins / 60)
        const newMins = totalMins % 60
        return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`
    }

    // Check for lecturer conflicts
    const checkLecturerConflict = async (lecturerId: string, day: string, startTime: string, endTime: string) => {
        if (!lecturerId) return null

        const conflictInCurrent = slots.find(s =>
            s.day_of_week === day &&
            s.lecturer_id === lecturerId &&
            ((startTime >= s.start_time && startTime < s.end_time) ||
                (endTime > s.start_time && endTime <= s.end_time))
        )

        if (conflictInCurrent) {
            return `Already assigned at ${conflictInCurrent.start_time}`
        }

        const { data: otherSlots } = await supabase
            .from('timetable_slots')
            .select('*, timetable:timetables(class_name, semester, section)')
            .eq('lecturer_id', lecturerId)
            .eq('day_of_week', day)
            .neq('timetable_id', id)

        for (const slot of otherSlots || []) {
            if ((startTime >= slot.start_time && startTime < slot.end_time) ||
                (endTime > slot.start_time && endTime <= slot.end_time)) {
                const tt = slot.timetable as any
                return `Conflict: ${tt.class_name} Sem ${tt.semester}`
            }
        }

        return null
    }

    // Handle lecturer selection with conflict check
    const handleLecturerSelect = async (lecturerId: string) => {
        setSelectedLecturer(lecturerId)

        if (!lecturerId || !selectedDay) {
            setConflictWarning(null)
            return
        }

        const nextSlot = getNextTimeSlot(selectedDay, numberOfPeriods)
        const conflict = await checkLecturerConflict(lecturerId, selectedDay, nextSlot.start, nextSlot.end)
        setConflictWarning(conflict)
    }

    // Add slot
    const handleAddSlot = async () => {
        if (!selectedDay) {
            toast({ title: 'Select Day', description: 'Please select a day', variant: 'destructive' })
            return
        }

        if (slotType === 'class' && !selectedClassroom) {
            toast({ title: 'Missing Fields', description: 'Please select a classroom/lab', variant: 'destructive' })
            return
        }

        if (slotType === 'class' && !isPractical && (!selectedSubject || !selectedLecturer)) {
            toast({ title: 'Missing Fields', description: 'Please select subject and lecturer', variant: 'destructive' })
            return
        }

        if (isPractical && labBatches.length === 0) {
            toast({ title: 'Add Batches', description: 'Please add at least one batch', variant: 'destructive' })
            return
        }

        setSaving(true)
        try {
            const nextSlot = getNextTimeSlot(selectedDay, numberOfPeriods)

            let slotData: any = {
                timetable_id: id,
                day_of_week: selectedDay,
                start_time: nextSlot.start,
                end_time: nextSlot.end,
                slot_order: nextSlot.order,
                slot_type: slotType,
                is_practical: isPractical
            }

            if (slotType === 'class') {
                slotData.subject_id = isPractical ? null : selectedSubject
                slotData.lecturer_id = isPractical ? null : selectedLecturer
                slotData.classroom_id = selectedClassroom
            }

            const { data: newSlot, error } = await supabase
                .from('timetable_slots')
                .insert([slotData])
                .select('*, subject:subjects(*), lecturer:lecturers(*), classroom:classrooms(*)')
                .single()

            if (error) throw error

            // Add lab batches if practical
            if (isPractical && labBatches.length > 0 && newSlot) {
                for (const batch of labBatches) {
                    await supabase.from('lab_batches').insert([{
                        timetable_slot_id: newSlot.id,
                        batch_name: batch.batch_name,
                        subject_id: batch.subject_id || null,
                        lecturer_id: batch.lecturer_id || null
                    }])
                }
            }

            toast({ title: 'Added', description: 'Slot added successfully' })

            // Reset form
            setSelectedSubject('')
            setSelectedLecturer('')
            setSelectedClassroom('')
            setIsPractical(false)
            setNumberOfPeriods(1)
            setLabBatches([])
            setConflictWarning(null)
            setShowAddForm(false)

            fetchData()
        } catch (error) {
            console.error('Error adding slot:', error)
            toast({ title: 'Error', description: 'Failed to add slot', variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    // Delete slot
    const handleDeleteSlot = async (slotId: string) => {
        if (!confirm('Delete this slot?')) return

        try {
            const { error } = await supabase
                .from('timetable_slots')
                .delete()
                .eq('id', slotId)

            if (error) throw error

            toast({ title: 'Deleted', description: 'Slot removed' })
            fetchData()
        } catch (error) {
            console.error('Error deleting slot:', error)
            toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' })
        }
    }

    // Mark as done
    const handleMarkAsDone = async () => {
        try {
            const { error } = await supabase
                .from('timetables')
                .update({ status: 'done' })
                .eq('id', id)

            if (error) throw error

            toast({ title: 'Completed!', description: 'Timetable marked as done' })
            router.push(`/dashboard/timetables/${id}/export`)
        } catch (error) {
            console.error('Error:', error)
            toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' })
        }
    }

    // Add lab batch
    const addLabBatch = () => {
        setLabBatches([...labBatches, { batch_name: `B${labBatches.length + 1}`, subject_id: '', lecturer_id: '' }])
    }

    const updateLabBatch = (index: number, field: string, value: string) => {
        const updated = [...labBatches]
        updated[index] = { ...updated[index], [field]: value }
        setLabBatches(updated)
    }

    const removeLabBatch = (index: number) => {
        setLabBatches(labBatches.filter((_, i) => i !== index))
    }

    // Format batch display
    const formatBatchDisplay = (slot: SlotWithDetails) => {
        if (!slot.lab_batches || slot.lab_batches.length === 0) return null

        const subjects = slot.lab_batches.map((b, i) => {
            const subj = b.subject
            return subj?.code || subj?.name?.substring(0, 3).toUpperCase() || `Sub${i + 1}`
        }).join(', ')

        const lecturers = slot.lab_batches.map(b => b.lecturer?.short_name || '').filter(Boolean).join(', ')

        return { subjects, lecturers }
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/timetables">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">
                            {timetable.class_name} - Sem {timetable.semester}
                            {timetable.section && ` (Section ${timetable.section})`}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">{timetable.year}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push(`/dashboard/timetables/${id}/export`)}>
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                    </Button>
                    {timetable.status !== 'done' && (
                        <Button onClick={handleMarkAsDone} className="btn-gradient">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Mark as Done
                        </Button>
                    )}
                </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
                <span className={timetable.status === 'done' ? 'badge-done' : 'badge-progress'}>
                    {timetable.status === 'done' ? 'Completed' : 'In Progress'}
                </span>
                <span className="text-sm text-gray-500">
                    {slots.length} slots added
                </span>
            </div>

            {/* Day Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {workingDays.map((day: string) => {
                    const daySlotCount = slots.filter(s => s.day_of_week === day).length
                    return (
                        <Button
                            key={day}
                            variant={selectedDay === day ? 'default' : 'outline'}
                            onClick={() => setSelectedDay(day)}
                            className={`flex-shrink-0 ${selectedDay === day ? 'btn-gradient' : ''}`}
                        >
                            {day}
                            {daySlotCount > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-white/20">
                                    {daySlotCount}
                                </span>
                            )}
                        </Button>
                    )
                })}
            </div>

            {/* Day Content */}
            {selectedDay && (
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Slots List */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">{selectedDay}</h2>
                            <Button onClick={() => setShowAddForm(true)} size="sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Slot
                            </Button>
                        </div>

                        {slots.filter(s => s.day_of_week === selectedDay).length > 0 ? (
                            <div className="space-y-3">
                                {slots
                                    .filter(s => s.day_of_week === selectedDay)
                                    .sort((a, b) => a.slot_order - b.slot_order)
                                    .map((slot) => {
                                        const batchDisplay = formatBatchDisplay(slot)
                                        return (
                                            <Card key={slot.id} className="premium-card">
                                                <CardContent className="py-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-center min-w-[80px]">
                                                                <p className="text-sm font-medium text-gray-500">
                                                                    {slot.start_time}
                                                                </p>
                                                                <p className="text-xs text-gray-400">to</p>
                                                                <p className="text-sm font-medium text-gray-500">
                                                                    {slot.end_time}
                                                                </p>
                                                            </div>

                                                            {slot.slot_type === 'lunch' && (
                                                                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                                                                    <UtensilsCrossed className="w-5 h-5 text-orange-600" />
                                                                    <span className="font-medium text-orange-700 dark:text-orange-300">Lunch Break</span>
                                                                </div>
                                                            )}

                                                            {slot.slot_type === 'break' && (
                                                                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                                                    <Coffee className="w-5 h-5 text-blue-600" />
                                                                    <span className="font-medium text-blue-700 dark:text-blue-300">Break</span>
                                                                </div>
                                                            )}

                                                            {slot.slot_type === 'class' && (
                                                                <div className="flex-1">
                                                                    {slot.is_practical && batchDisplay ? (
                                                                        // Practical/Lab with batches display
                                                                        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                                                            <div className="flex items-center gap-2 mb-2">
                                                                                <FlaskConical className="w-5 h-5 text-green-600" />
                                                                                <span className="font-semibold text-green-700 dark:text-green-300">
                                                                                    {batchDisplay.subjects}
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-sm text-green-600 dark:text-green-400 mb-1">
                                                                                {slot.classroom?.name}
                                                                            </p>
                                                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                                ({batchDisplay.lecturers})
                                                                            </p>
                                                                            <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                                                                                <Users className="w-3 h-3" />
                                                                                {slot.lab_batches?.length} batch(es)
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        // Theory class display
                                                                        <div className="flex items-center gap-2">
                                                                            <div
                                                                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                                                style={{ backgroundColor: slot.subject?.color || '#3B82F6' }}
                                                                            >
                                                                                <BookOpen className="w-4 h-4 text-white" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-semibold">{slot.subject?.name}</p>
                                                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                                    {slot.lecturer?.short_name} • {slot.classroom?.name}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteSlot(slot.id)}
                                                            className="text-gray-400 hover:text-red-600"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )
                                    })}
                            </div>
                        ) : (
                            <Card className="premium-card">
                                <CardContent className="py-12 text-center">
                                    <Clock className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                                    <p className="text-gray-500">No slots added for {selectedDay}</p>
                                    <Button onClick={() => setShowAddForm(true)} className="mt-4 btn-gradient">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add First Slot
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Add Slot Form */}
                    {showAddForm && (
                        <Card className="lg:sticky lg:top-4 h-fit premium-card border-purple-200 dark:border-purple-800">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">Add Slot</CardTitle>
                                    <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-sm text-gray-500">
                                    Next: {getNextTimeSlot(selectedDay, numberOfPeriods).start} - {getNextTimeSlot(selectedDay, numberOfPeriods).end}
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Slot Type */}
                                <div className="space-y-2">
                                    <Label>Slot Type</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['class', 'break', 'lunch'] as const).map((type) => (
                                            <Button
                                                key={type}
                                                variant={slotType === type ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setSlotType(type)}
                                                className={slotType === type ? 'btn-gradient' : ''}
                                            >
                                                {type === 'class' && <BookOpen className="w-4 h-4 mr-1" />}
                                                {type === 'break' && <Coffee className="w-4 h-4 mr-1" />}
                                                {type === 'lunch' && <UtensilsCrossed className="w-4 h-4 mr-1" />}
                                                {type.charAt(0).toUpperCase() + type.slice(1)}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                {slotType === 'class' && (
                                    <>
                                        {/* Class Type */}
                                        <div className="space-y-2">
                                            <Label>Class Type</Label>
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        checked={!isPractical}
                                                        onChange={() => { setIsPractical(false); setLabBatches([]); setNumberOfPeriods(1); }}
                                                    />
                                                    <BookOpen className="w-4 h-4" />
                                                    <span>Theory</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        checked={isPractical}
                                                        onChange={() => { setIsPractical(true); setNumberOfPeriods(2); }}
                                                    />
                                                    <FlaskConical className="w-4 h-4" />
                                                    <span>Practical/Lab</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Number of Periods */}
                                        <div className="space-y-2">
                                            <Label>Number of Periods</Label>
                                            <div className="flex gap-2">
                                                {[1, 2, 3].map(num => (
                                                    <Button
                                                        key={num}
                                                        variant={numberOfPeriods === num ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => setNumberOfPeriods(num)}
                                                        className={numberOfPeriods === num ? 'btn-gradient' : ''}
                                                    >
                                                        {num}
                                                    </Button>
                                                ))}
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Duration: {(settings?.default_class_duration || 55) * numberOfPeriods} mins
                                            </p>
                                        </div>

                                        {/* Classroom */}
                                        <div className="space-y-2">
                                            <Label>Classroom/Lab</Label>
                                            <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select room" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {classrooms.map((room) => (
                                                        <SelectItem key={room.id} value={room.id}>
                                                            {room.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Theory: Subject & Lecturer */}
                                        {!isPractical && (
                                            <>
                                                <div className="space-y-2">
                                                    <Label>Subject</Label>
                                                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select subject" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {subjects.map((subj) => (
                                                                <SelectItem key={subj.id} value={subj.id}>
                                                                    {subj.name} {subj.code && `(${subj.code})`}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Lecturer</Label>
                                                    <Select value={selectedLecturer} onValueChange={handleLecturerSelect}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select lecturer" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {lecturers.map((lec) => (
                                                                <SelectItem key={lec.id} value={lec.id}>
                                                                    {lec.full_name} ({lec.short_name})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </>
                                        )}

                                        {/* Practical: Lab Batches */}
                                        {isPractical && (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <Label>Batches ({labBatches.length})</Label>
                                                    <Button size="sm" variant="outline" onClick={addLabBatch}>
                                                        <Plus className="w-3 h-3 mr-1" />
                                                        Add
                                                    </Button>
                                                </div>

                                                {labBatches.length === 0 && (
                                                    <p className="text-sm text-gray-500 text-center py-4">
                                                        Add batches for this practical session
                                                    </p>
                                                )}

                                                {labBatches.map((batch, index) => (
                                                    <div key={index} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <Input
                                                                value={batch.batch_name}
                                                                onChange={(e) => updateLabBatch(index, 'batch_name', e.target.value)}
                                                                placeholder="Batch name"
                                                                className="w-20"
                                                            />
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removeLabBatch(index)}
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                        <Select
                                                            value={batch.subject_id}
                                                            onValueChange={(v) => updateLabBatch(index, 'subject_id', v)}
                                                        >
                                                            <SelectTrigger className="text-sm">
                                                                <SelectValue placeholder="Subject" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {subjects.map((s) => (
                                                                    <SelectItem key={s.id} value={s.id}>{s.code || s.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <Select
                                                            value={batch.lecturer_id}
                                                            onValueChange={(v) => updateLabBatch(index, 'lecturer_id', v)}
                                                        >
                                                            <SelectTrigger className="text-sm">
                                                                <SelectValue placeholder="Lecturer" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {lecturers.map((l) => (
                                                                    <SelectItem key={l.id} value={l.id}>{l.short_name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Conflict Warning */}
                                        {conflictWarning && (
                                            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300">
                                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                                <span className="text-sm">{conflictWarning}</span>
                                            </div>
                                        )}
                                    </>
                                )}

                                <Button
                                    onClick={handleAddSlot}
                                    disabled={saving}
                                    className="w-full btn-gradient"
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Plus className="w-4 h-4 mr-2" />
                                    )}
                                    Add Slot
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    )
}
