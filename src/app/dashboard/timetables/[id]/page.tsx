'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import {
    Plus,
    Trash2,
    Pencil,
    ArrowLeft,
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
    timetable_id: string
    day_of_week: string
    start_time: string
    end_time: string
    slot_type: string
    subject_id: string | null
    lecturer_id: string | null
    classroom_id: string | null
    is_practical: boolean
    slot_order: number
}

interface CollegeSettings {
    college_start_time: string
    college_end_time: string
    default_class_duration: number
    lunch_start_time: string
    lunch_end_time: string
    break_duration: number
    working_days: string[]
}

interface Lecturer {
    id: string
    full_name: string
    short_name: string
}

interface Classroom {
    id: string
    name: string
}

interface Subject {
    id: string
    name: string
    code: string
    no_lecturer_required?: boolean
}

interface LabBatch {
    id: string
    batch_name: string
    subject_id: string | null
    lecturer_id: string | null
    classroom_id?: string | null
    subject?: Subject
    lecturer?: Lecturer
    classroom?: Classroom
}

interface SlotWithDetails extends TimetableSlot {
    subject?: Subject
    lecturer?: Lecturer
    classroom?: Classroom
    lab_batches?: LabBatch[]
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
    const [slotType, setSlotType] = useState<'class' | 'break' | 'free'>('class')
    const [selectedSubject, setSelectedSubject] = useState('')
    const [selectedLecturer, setSelectedLecturer] = useState('')
    const [selectedClassroom, setSelectedClassroom] = useState('')
    const [isPractical, setIsPractical] = useState(false)
    const [numberOfPeriods, setNumberOfPeriods] = useState(1)
    const [labBatches, setLabBatches] = useState<{ batch_name: string, subject_id: string, lecturer_id: string, classroom_id?: string }[]>([])

    // Edit state
    const [editingSlot, setEditingSlot] = useState<SlotWithDetails | null>(null)
    const [showEditModal, setShowEditModal] = useState(false)

    // Styles
    const selectStyle = {
        width: '100%',
        padding: '10px 12px',
        fontSize: '14px',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        outline: 'none',
        background: 'white',
        cursor: 'pointer'
    }

    const labelStyle = {
        display: 'block',
        marginBottom: '6px',
        fontWeight: '600' as const,
        color: '#374151',
        fontSize: '13px'
    }

    const buttonStyle = {
        padding: '8px 16px',
        border: 'none',
        borderRadius: '6px',
        fontWeight: '500' as const,
        cursor: 'pointer',
        fontSize: '14px'
    }

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

            const [
                { data: timetableData },
                { data: slotsData, error: slotsError },
                { data: settingsData },
                { data: lecturersData },
                { data: classroomsData },
                { data: subjectsData }
            ] = await Promise.all([
                supabase.from('timetables').select('*').eq('id', id).single(),
                supabase.from('timetable_slots')
                    .select('*')
                    .eq('timetable_id', id)
                    .order('slot_order', { ascending: true }),
                supabase.from('college_settings').select('*').eq('user_id', user.id).single(),
                supabase.from('lecturers').select('*').eq('user_id', user.id).order('full_name'),
                supabase.from('classrooms').select('*').eq('user_id', user.id).order('name'),
                supabase.from('subjects').select('*').eq('user_id', user.id).order('name')
            ])

            // Debug log
            console.log('Timetable data:', timetableData)
            console.log('Slots data from DB:', slotsData)
            console.log('Slots error:', slotsError)
            console.log('Working days:', settingsData?.working_days)

            if (!timetableData) {
                toast({ title: 'Not Found', description: 'Timetable not found', variant: 'destructive' })
                router.push('/dashboard/timetables')
                return
            }

            // Map slots with their related data manually
            const slotsWithDetails = (slotsData || []).map(slot => ({
                ...slot,
                subject: subjectsData?.find((s: Subject) => s.id === slot.subject_id),
                lecturer: lecturersData?.find((l: Lecturer) => l.id === slot.lecturer_id),
                classroom: classroomsData?.find((c: Classroom) => c.id === slot.classroom_id)
            }))

            // Fetch lab batches for practical slots
            const practicalSlots = slotsWithDetails.filter(s => s.is_practical)

            if (practicalSlots.length > 0) {
                const { data: batchesData } = await supabase
                    .from('lab_batches')
                    .select('*')
                    .in('timetable_slot_id', practicalSlots.map(s => s.id))

                const finalSlots = slotsWithDetails.map(slot => ({
                    ...slot,
                    lab_batches: (batchesData || []).filter((b: any) => b.timetable_slot_id === slot.id).map((batch: any) => ({
                        ...batch,
                        subject: subjectsData?.find((s: Subject) => s.id === batch.subject_id),
                        lecturer: lecturersData?.find((l: Lecturer) => l.id === batch.lecturer_id)
                    }))
                }))
                setSlots(finalSlots)
            } else {
                setSlots(slotsWithDetails)
            }

            setTimetable(timetableData)
            setSettings(settingsData)
            setLecturers(lecturersData || [])
            setClassrooms(classroomsData || [])
            setSubjects(subjectsData || [])

            // Only set initial day if not already selected
            if (!selectedDay && settingsData?.working_days?.[0]) {
                setSelectedDay(settingsData.working_days[0])
            }
        } catch (error) {
            console.error('Error fetching data:', error)
            toast({ title: 'Error', description: 'Failed to load timetable', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    // Calculate next time slot based on slot type
    const getNextTimeSlot = useCallback((day: string, currentSlotType: string = 'class', periods: number = 1) => {
        const daySlots = slots.filter(s => s.day_of_week === day).sort((a, b) => a.slot_order - b.slot_order)

        // Calculate duration based on slot type
        let duration: number
        if (currentSlotType === 'break') {
            duration = settings?.break_duration || 15
        } else if (currentSlotType === 'lunch') {
            const [startH, startM] = (settings?.lunch_start_time || '12:30').split(':').map(Number)
            const [endH, endM] = (settings?.lunch_end_time || '13:30').split(':').map(Number)
            duration = (endH * 60 + endM) - (startH * 60 + startM)
        } else {
            duration = (settings?.default_class_duration || 55) * periods
        }

        // Helper to convert time string to minutes
        const toMinutes = (time: string) => {
            const [h, m] = time.split(':').map(Number)
            return h * 60 + m
        }

        let startTime: string
        let order: number

        if (daySlots.length === 0 && settings) {
            startTime = settings.college_start_time
            order = 1
        } else {
            const lastSlot = daySlots[daySlots.length - 1]
            if (!lastSlot || !settings) {
                startTime = '09:00'
                order = 1
            } else {
                startTime = lastSlot.end_time
                order = lastSlot.slot_order + 1
            }
        }

        if (settings) {
            const lunchStart = settings.lunch_start_time
            const lunchEnd = settings.lunch_end_time
            const startMins = toMinutes(startTime)
            const lunchStartMins = toMinutes(lunchStart)
            const lunchEndMins = toMinutes(lunchEnd)

            // If we're starting during or after lunch start but before lunch end, skip to after lunch
            if (startMins >= lunchStartMins && startMins < lunchEndMins) {
                startTime = lunchEnd
            }

            // If the slot would overlap with lunch time (starts before but ends during/after), skip to after lunch
            const endMins = toMinutes(startTime) + duration
            if (toMinutes(startTime) < lunchStartMins && endMins > lunchStartMins) {
                // The slot would cross into lunch time, so we should add a lunch slot first
                // For now, just skip to after lunch if not adding lunch
                if (currentSlotType !== 'lunch') {
                    // Alert user that lunch time is approaching
                }
            }
        }

        return {
            start: startTime,
            end: addMinutes(startTime, duration),
            order
        }
    }, [slots, settings])

    const addMinutes = (timeStr: string, minutes: number): string => {
        const [hours, mins] = timeStr.split(':').map(Number)
        const totalMins = hours * 60 + mins + minutes
        const newHours = Math.floor(totalMins / 60)
        const newMins = totalMins % 60
        return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`
    }

    // Convert 24-hour time to 12-hour format
    const formatTime12 = (timeStr: string): string => {
        if (!timeStr) return ''
        const [hours, mins] = timeStr.split(':').map(Number)
        const period = hours >= 12 ? 'PM' : 'AM'
        const hour12 = hours % 12 || 12
        return `${hour12}:${String(mins).padStart(2, '0')} ${period}`
    }

    // Add slot
    const handleAddSlot = async () => {
        if (!selectedDay) {
            toast({ title: 'Error', description: 'Please select a day', variant: 'destructive' })
            return
        }

        if (slotType === 'class' && !selectedClassroom) {
            toast({ title: 'Error', description: 'Please select a classroom', variant: 'destructive' })
            return
        }

        if (slotType === 'class' && !isPractical && (!selectedSubject || !selectedLecturer)) {
            toast({ title: 'Error', description: 'Please select subject and lecturer', variant: 'destructive' })
            return
        }

        if (isPractical && labBatches.length === 0) {
            toast({ title: 'Error', description: 'Please add at least one batch', variant: 'destructive' })
            return
        }

        setSaving(true)
        try {
            // Helper to convert time string to minutes
            const toMinutes = (time: string) => {
                const [h, m] = time.split(':').map(Number)
                return h * 60 + m
            }

            // Get next slot with correct duration based on slot type
            let nextSlot = getNextTimeSlot(selectedDay, slotType, numberOfPeriods)

            // Check if we need to auto-insert lunch
            if (settings) {
                const lunchStart = settings.lunch_start_time
                const lunchEnd = settings.lunch_end_time
                const lunchStartMins = toMinutes(lunchStart)
                const lunchEndMins = toMinutes(lunchEnd)
                const nextStartMins = toMinutes(nextSlot.start)

                // Check if there's already a lunch slot for this day
                const daySlots = slots.filter(s => s.day_of_week === selectedDay)
                const hasLunchSlot = daySlots.some(s => s.slot_type === 'lunch')

                // If next slot starts at lunch time and no lunch exists, auto-insert lunch first
                if (!hasLunchSlot && nextStartMins >= lunchStartMins && nextStartMins < lunchEndMins) {
                    // Insert lunch slot first
                    const lunchDuration = lunchEndMins - lunchStartMins
                    await supabase.from('timetable_slots').insert([{
                        timetable_id: id,
                        day_of_week: selectedDay,
                        start_time: lunchStart,
                        end_time: lunchEnd,
                        slot_order: nextSlot.order,
                        slot_type: 'lunch',
                        is_practical: false
                    }])

                    toast({ title: 'Lunch Added', description: 'Lunch break was automatically added' })

                    // Recalculate next slot after lunch
                    nextSlot = {
                        start: lunchEnd,
                        end: addMinutes(lunchEnd, slotType === 'break' ? (settings?.break_duration || 15) : (settings?.default_class_duration || 55) * numberOfPeriods),
                        order: nextSlot.order + 1
                    }
                }
            }

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
                // Check if subject doesn't require a lecturer
                const selectedSubjectObj = subjects.find(s => s.id === selectedSubject)
                slotData.lecturer_id = (isPractical || selectedSubjectObj?.no_lecturer_required) ? null : selectedLecturer
                slotData.classroom_id = selectedClassroom
            }

            const { data: newSlot, error } = await supabase
                .from('timetable_slots')
                .insert([slotData])
                .select()
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
            resetForm()
            fetchData()
        } catch (error) {
            console.error('Error adding slot:', error)
            toast({ title: 'Error', description: 'Failed to add slot', variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const resetForm = () => {
        setSelectedSubject('')
        setSelectedLecturer('')
        setSelectedClassroom('')
        setIsPractical(false)
        setNumberOfPeriods(1)
        setLabBatches([])
        setShowAddForm(false)
    }

    // Delete slot
    const handleDeleteSlot = async (slotId: string) => {
        if (!confirm('Delete this slot?')) return

        try {
            await supabase.from('timetable_slots').delete().eq('id', slotId)
            toast({ title: 'Deleted', description: 'Slot removed' })
            fetchData()
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' })
        }
    }

    // Mark as done
    const handleMarkAsDone = async () => {
        try {
            await supabase.from('timetables').update({ status: 'done' }).eq('id', id)
            toast({ title: 'Completed!', description: 'Timetable marked as done' })
            router.push(`/dashboard/timetables/${id}/export`)
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' })
        }
    }

    // Edit slot functions
    const [editingBatches, setEditingBatches] = useState<{ id?: string, batch_name: string, subject_id: string, lecturer_id: string, classroom_id?: string }[]>([])

    const handleEditSlot = (slot: SlotWithDetails) => {
        setEditingSlot(slot)
        // If practical, load the batches for editing
        if (slot.is_practical && slot.lab_batches) {
            setEditingBatches(slot.lab_batches.map(b => ({
                id: b.id,
                batch_name: b.batch_name,
                subject_id: b.subject_id || '',
                lecturer_id: b.lecturer_id || '',
                classroom_id: b.classroom_id || ''
            })))
        } else {
            setEditingBatches([])
        }
        setShowEditModal(true)
    }

    const updateEditingBatch = (index: number, field: string, value: string) => {
        const updated = [...editingBatches]
        updated[index] = { ...updated[index], [field]: value }
        setEditingBatches(updated)
    }

    const handleSaveEdit = async () => {
        if (!editingSlot) return

        setSaving(true)
        try {
            if (editingSlot.is_practical) {
                // Update each batch
                for (const batch of editingBatches) {
                    if (batch.id) {
                        await supabase
                            .from('lab_batches')
                            .update({
                                batch_name: batch.batch_name,
                                subject_id: batch.subject_id || null,
                                lecturer_id: batch.lecturer_id || null,
                                classroom_id: batch.classroom_id || null
                            })
                            .eq('id', batch.id)
                    }
                }
                // Also update main classroom if changed
                await supabase
                    .from('timetable_slots')
                    .update({ classroom_id: editingSlot.classroom_id })
                    .eq('id', editingSlot.id)
            } else {
                // Theory class - update subject, lecturer, classroom
                const { error } = await supabase
                    .from('timetable_slots')
                    .update({
                        subject_id: editingSlot.subject_id,
                        lecturer_id: editingSlot.lecturer_id,
                        classroom_id: editingSlot.classroom_id
                    })
                    .eq('id', editingSlot.id)

                if (error) throw error
            }

            toast({ title: 'Updated', description: 'Slot updated successfully' })
            setShowEditModal(false)
            setEditingSlot(null)
            setEditingBatches([])
            fetchData()
        } catch (error) {
            console.error('Error updating:', error)
            toast({ title: 'Error', description: 'Failed to update slot', variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    // Add lab batch
    const addLabBatch = () => {
        setLabBatches([...labBatches, { batch_name: `B${labBatches.length + 1}`, subject_id: '', lecturer_id: '', classroom_id: '' }])
    }

    const updateLabBatch = (index: number, field: string, value: string) => {
        const updated = [...labBatches]
        updated[index] = { ...updated[index], [field]: value }
        setLabBatches(updated)
    }

    const removeLabBatch = (index: number) => {
        setLabBatches(labBatches.filter((_, i) => i !== index))
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
                <p style={{ color: '#6b7280' }}>Loading...</p>
            </div>
        )
    }

    if (!timetable || !settings) {
        return (
            <div style={{ textAlign: 'center', padding: '48px' }}>
                <p>Timetable not found</p>
                <Link href="/dashboard/timetables">
                    <button style={{ ...buttonStyle, background: '#4f46e5', color: 'white', marginTop: '16px' }}>
                        Back to Timetables
                    </button>
                </Link>
            </div>
        )
    }

    // Sort working days in proper order
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const workingDays = (settings.working_days || []).sort((a: string, b: string) =>
        dayOrder.indexOf(a) - dayOrder.indexOf(b)
    )

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link href="/dashboard/timetables">
                        <button style={{ ...buttonStyle, background: '#f3f4f6', display: 'flex', alignItems: 'center' }}>
                            <ArrowLeft size={18} />
                        </button>
                    </Link>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>
                            {timetable.class_name} - Sem {timetable.semester}
                            {timetable.section && ` (Section ${timetable.section})`}
                        </h1>
                        <p style={{ color: '#6b7280', fontSize: '14px' }}>{timetable.year}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => router.push(`/dashboard/timetables/${id}/export`)}
                        style={{ ...buttonStyle, background: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Download size={16} />
                        Export
                    </button>
                    {timetable.status !== 'done' && (
                        <button
                            onClick={handleMarkAsDone}
                            style={{ ...buttonStyle, background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <CheckCircle2 size={16} />
                            Mark Done
                        </button>
                    )}
                </div>
            </div>

            {/* Day Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {workingDays.map((day: string) => {
                    const daySlotCount = slots.filter(s => s.day_of_week === day).length
                    return (
                        <button
                            key={day}
                            onClick={() => setSelectedDay(day)}
                            style={{
                                ...buttonStyle,
                                background: selectedDay === day ? '#4f46e5' : '#f3f4f6',
                                color: selectedDay === day ? 'white' : '#374151'
                            }}
                        >
                            {day} {daySlotCount > 0 && `(${daySlotCount})`}
                        </button>
                    )
                })}
            </div>

            {/* Main Content */}
            {selectedDay && (
                <div style={{ display: 'grid', gridTemplateColumns: showAddForm ? '1fr 350px' : '1fr', gap: '24px' }}>
                    {/* Slots List */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '600' }}>{selectedDay}</h2>
                            <button
                                onClick={() => setShowAddForm(true)}
                                style={{ ...buttonStyle, background: '#4f46e5', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Plus size={16} />
                                Add Slot
                            </button>
                        </div>

                        {slots.filter(s => s.day_of_week === selectedDay).length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {slots
                                    .filter(s => s.day_of_week === selectedDay)
                                    .sort((a, b) => a.slot_order - b.slot_order)
                                    .map((slot) => (
                                        <div key={slot.id} style={{
                                            background: 'white',
                                            borderRadius: '12px',
                                            padding: '16px',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                <div style={{ textAlign: 'center', minWidth: '80px' }}>
                                                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>{formatTime12(slot.start_time)}</p>
                                                    <p style={{ fontSize: '12px', color: '#9ca3af' }}>to</p>
                                                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>{formatTime12(slot.end_time)}</p>
                                                </div>

                                                {slot.slot_type === 'lunch' && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#fef3c7', borderRadius: '8px' }}>
                                                        <UtensilsCrossed size={18} color="#d97706" />
                                                        <span style={{ fontWeight: '500', color: '#92400e' }}>Lunch Break</span>
                                                    </div>
                                                )}

                                                {slot.slot_type === 'break' && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#dbeafe', borderRadius: '8px' }}>
                                                        <Coffee size={18} color="#2563eb" />
                                                        <span style={{ fontWeight: '500', color: '#1e40af' }}>Break</span>
                                                    </div>
                                                )}

                                                {slot.slot_type === 'free' && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#f3f4f6', borderRadius: '8px' }}>
                                                        <Clock size={18} color="#6b7280" />
                                                        <span style={{ fontWeight: '500', color: '#4b5563' }}>Free / Gap</span>
                                                    </div>
                                                )}

                                                {slot.slot_type === 'class' && (
                                                    <div>
                                                        {slot.is_practical ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <FlaskConical size={20} color="#10b981" />
                                                                <div>
                                                                    <p style={{ fontWeight: '600', color: '#111827' }}>
                                                                        {slot.lab_batches?.map(b => b.subject?.code || b.subject?.name).join(', ') || 'Lab'}
                                                                    </p>
                                                                    <p style={{ fontSize: '13px', color: '#6b7280' }}>
                                                                        {slot.classroom?.name} • ({slot.lab_batches?.map(b => b.lecturer?.short_name).join(', ')})
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <BookOpen size={20} color="#4f46e5" />
                                                                <div>
                                                                    <p style={{ fontWeight: '600', color: '#111827' }}>{slot.subject?.name}</p>
                                                                    <p style={{ fontSize: '13px', color: '#6b7280' }}>
                                                                        {slot.lecturer?.short_name} • {slot.classroom?.name}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {slot.slot_type === 'class' && (
                                                    <button
                                                        onClick={() => handleEditSlot(slot)}
                                                        style={{ ...buttonStyle, background: '#e0e7ff', color: '#4f46e5', padding: '8px' }}
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteSlot(slot.id)}
                                                    style={{ ...buttonStyle, background: '#fee2e2', color: '#dc2626', padding: '8px' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div style={{
                                background: 'white',
                                borderRadius: '12px',
                                padding: '48px',
                                textAlign: 'center',
                                color: '#6b7280'
                            }}>
                                <Clock size={48} color="#d1d5db" style={{ margin: '0 auto 16px' }} />
                                <p>No slots added for {selectedDay}</p>
                                <button
                                    onClick={() => setShowAddForm(true)}
                                    style={{ ...buttonStyle, background: '#4f46e5', color: 'white', marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <Plus size={16} />
                                    Add First Slot
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Add Slot Form - Using simple inline styles */}
                    {showAddForm && (
                        <div style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '20px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            height: 'fit-content',
                            position: 'sticky',
                            top: '20px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Add Slot</h3>
                                <button onClick={() => setShowAddForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <X size={20} color="#6b7280" />
                                </button>
                            </div>

                            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
                                Next: {formatTime12(getNextTimeSlot(selectedDay, slotType, numberOfPeriods).start)} - {formatTime12(getNextTimeSlot(selectedDay, slotType, numberOfPeriods).end)}
                            </p>

                            {/* Slot Type */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={labelStyle}>Slot Type</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {(['class', 'free', 'break'] as const).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setSlotType(type)}
                                            style={{
                                                ...buttonStyle,
                                                flex: 1,
                                                background: slotType === type ? '#4f46e5' : '#f3f4f6',
                                                color: slotType === type ? 'white' : '#374151',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            {type === 'class' && <BookOpen size={14} />}
                                            {type === 'free' && <Clock size={14} />}
                                            {type === 'break' && <Coffee size={14} />}
                                            {type === 'free' ? 'Free/Gap' : type.charAt(0).toUpperCase() + type.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Free periods - show number of periods selector */}
                            {slotType === 'free' && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={labelStyle}>Number of Free Periods</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {[1, 2, 3].map(num => (
                                            <button
                                                key={num}
                                                onClick={() => setNumberOfPeriods(num)}
                                                style={{
                                                    ...buttonStyle,
                                                    width: '40px',
                                                    background: numberOfPeriods === num ? '#4f46e5' : '#f3f4f6',
                                                    color: numberOfPeriods === num ? 'white' : '#374151'
                                                }}
                                            >
                                                {num}
                                            </button>
                                        ))}
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                        Duration: {(settings?.default_class_duration || 55) * numberOfPeriods} mins
                                    </p>
                                </div>
                            )}

                            {slotType === 'class' && (
                                <>
                                    {/* Class Type - Only show for regular class, not cultural */}
                                    {slotType === 'class' && (
                                        <div style={{ marginBottom: '16px' }}>
                                            <label style={labelStyle}>Class Type</label>
                                            <div style={{ display: 'flex', gap: '16px' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                                    <input
                                                        type="radio"
                                                        checked={!isPractical}
                                                        onChange={() => { setIsPractical(false); setLabBatches([]); setNumberOfPeriods(1); }}
                                                    />
                                                    Theory
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                                    <input
                                                        type="radio"
                                                        checked={isPractical}
                                                        onChange={() => { setIsPractical(true); setNumberOfPeriods(2); }}
                                                    />
                                                    Practical/Lab
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* Number of Periods */}
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={labelStyle}>Number of Periods</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {[1, 2, 3].map(num => (
                                                <button
                                                    key={num}
                                                    onClick={() => setNumberOfPeriods(num)}
                                                    style={{
                                                        ...buttonStyle,
                                                        width: '40px',
                                                        background: numberOfPeriods === num ? '#4f46e5' : '#f3f4f6',
                                                        color: numberOfPeriods === num ? 'white' : '#374151'
                                                    }}
                                                >
                                                    {num}
                                                </button>
                                            ))}
                                        </div>
                                        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                            Duration: {(settings?.default_class_duration || 55) * numberOfPeriods} mins
                                        </p>
                                    </div>

                                    {/* Classroom */}
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={labelStyle}>Classroom/Lab *</label>
                                        <select
                                            value={selectedClassroom}
                                            onChange={(e) => setSelectedClassroom(e.target.value)}
                                            style={selectStyle}
                                        >
                                            <option value="">Select room</option>
                                            {classrooms.map(room => (
                                                <option key={room.id} value={room.id}>{room.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Theory: Subject & Lecturer */}
                                    {!isPractical && (
                                        <>
                                            <div style={{ marginBottom: '16px' }}>
                                                <label style={labelStyle}>Subject *</label>
                                                <select
                                                    value={selectedSubject}
                                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                                    style={selectStyle}
                                                >
                                                    <option value="">Select subject</option>
                                                    {subjects.map(subj => (
                                                        <option key={subj.id} value={subj.id}>
                                                            {subj.name} ({subj.code})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div style={{ marginBottom: '16px' }}>
                                                <label style={labelStyle}>Lecturer {subjects.find(s => s.id === selectedSubject)?.no_lecturer_required ? '(Not Required)' : '*'}</label>
                                                <select
                                                    value={subjects.find(s => s.id === selectedSubject)?.no_lecturer_required ? '' : selectedLecturer}
                                                    onChange={(e) => setSelectedLecturer(e.target.value)}
                                                    disabled={!!subjects.find(s => s.id === selectedSubject)?.no_lecturer_required}
                                                    style={{
                                                        ...selectStyle,
                                                        backgroundColor: subjects.find(s => s.id === selectedSubject)?.no_lecturer_required ? '#f3f4f6' : 'white',
                                                        cursor: subjects.find(s => s.id === selectedSubject)?.no_lecturer_required ? 'not-allowed' : 'pointer'
                                                    }}
                                                >
                                                    <option value="">{subjects.find(s => s.id === selectedSubject)?.no_lecturer_required ? 'Not Required' : 'Select lecturer'}</option>
                                                    {lecturers.map(lec => (
                                                        <option key={lec.id} value={lec.id}>
                                                            {lec.full_name} ({lec.short_name})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </>
                                    )}

                                    {/* Practical: Lab Batches */}
                                    {isPractical && (
                                        <div style={{ marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <label style={labelStyle}>Batches ({labBatches.length})</label>
                                                <button
                                                    onClick={addLabBatch}
                                                    style={{ ...buttonStyle, background: '#f3f4f6', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                >
                                                    <Plus size={12} />
                                                    Add
                                                </button>
                                            </div>

                                            {labBatches.length === 0 && (
                                                <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                                                    Add batches for this practical
                                                </p>
                                            )}

                                            {labBatches.map((batch, index) => (
                                                <div key={index} style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px', marginBottom: '8px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                        <input
                                                            type="text"
                                                            value={batch.batch_name}
                                                            onChange={(e) => updateLabBatch(index, 'batch_name', e.target.value)}
                                                            placeholder="Batch"
                                                            style={{ ...selectStyle, width: '70px' }}
                                                        />
                                                        <button onClick={() => removeLabBatch(index)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                                            <X size={16} color="#dc2626" />
                                                        </button>
                                                    </div>
                                                    <select
                                                        value={batch.subject_id}
                                                        onChange={(e) => updateLabBatch(index, 'subject_id', e.target.value)}
                                                        style={{ ...selectStyle, marginBottom: '8px', fontSize: '13px' }}
                                                    >
                                                        <option value="">Subject *</option>
                                                        {subjects.map(s => (
                                                            <option key={s.id} value={s.id}>{s.code || s.name}</option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        value={batch.lecturer_id}
                                                        onChange={(e) => updateLabBatch(index, 'lecturer_id', e.target.value)}
                                                        style={{ ...selectStyle, marginBottom: '8px', fontSize: '13px' }}
                                                    >
                                                        <option value="">Lecturer * (Required)</option>
                                                        {lecturers.map(l => (
                                                            <option key={l.id} value={l.id}>{l.short_name}</option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        value={batch.classroom_id || ''}
                                                        onChange={(e) => updateLabBatch(index, 'classroom_id', e.target.value)}
                                                        style={{ ...selectStyle, fontSize: '13px' }}
                                                    >
                                                        <option value="">Classroom (Optional - uses main)</option>
                                                        {classrooms.map(c => (
                                                            <option key={c.id} value={c.id}>{c.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Add Button */}
                            <button
                                onClick={handleAddSlot}
                                disabled={saving}
                                style={{
                                    ...buttonStyle,
                                    width: '100%',
                                    background: saving ? '#9ca3af' : '#4f46e5',
                                    color: 'white',
                                    padding: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Plus size={16} />
                                {saving ? 'Adding...' : 'Add Slot'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingSlot && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '24px',
                        width: '400px',
                        maxWidth: '90vw'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Edit Slot</h3>
                            <button onClick={() => { setShowEditModal(false); setEditingSlot(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={20} color="#6b7280" />
                            </button>
                        </div>

                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
                            {formatTime12(editingSlot.start_time)} - {formatTime12(editingSlot.end_time)}
                            {editingSlot.is_practical && <span style={{ marginLeft: '8px', padding: '2px 8px', background: '#d1fae5', color: '#059669', borderRadius: '4px', fontSize: '11px' }}>Practical</span>}
                        </p>

                        {/* Theory class form */}
                        {!editingSlot.is_practical && (
                            <>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={labelStyle}>Subject</label>
                                    <select
                                        value={editingSlot.subject_id || ''}
                                        onChange={(e) => setEditingSlot({ ...editingSlot, subject_id: e.target.value })}
                                        style={selectStyle}
                                    >
                                        <option value="">Select subject</option>
                                        {subjects.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <label style={labelStyle}>Lecturer</label>
                                    <select
                                        value={editingSlot.lecturer_id || ''}
                                        onChange={(e) => setEditingSlot({ ...editingSlot, lecturer_id: e.target.value })}
                                        style={selectStyle}
                                    >
                                        <option value="">Select lecturer</option>
                                        {lecturers.map(l => (
                                            <option key={l.id} value={l.id}>{l.full_name} ({l.short_name})</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ marginBottom: '24px' }}>
                                    <label style={labelStyle}>Classroom</label>
                                    <select
                                        value={editingSlot.classroom_id || ''}
                                        onChange={(e) => setEditingSlot({ ...editingSlot, classroom_id: e.target.value })}
                                        style={selectStyle}
                                    >
                                        <option value="">Select classroom</option>
                                        {classrooms.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        {/* Practical/Lab class form - edit batches */}
                        {editingSlot.is_practical && (
                            <>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={labelStyle}>Main Classroom/Lab</label>
                                    <select
                                        value={editingSlot.classroom_id || ''}
                                        onChange={(e) => setEditingSlot({ ...editingSlot, classroom_id: e.target.value })}
                                        style={selectStyle}
                                    >
                                        <option value="">Select main lab</option>
                                        {classrooms.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <label style={labelStyle}>Batches ({editingBatches.length})</label>
                                <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
                                    {editingBatches.map((batch, index) => (
                                        <div key={batch.id || index} style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px', marginBottom: '8px' }}>
                                            <div style={{ fontWeight: '600', marginBottom: '8px', color: '#374151' }}>{batch.batch_name}</div>
                                            <select
                                                value={batch.subject_id}
                                                onChange={(e) => updateEditingBatch(index, 'subject_id', e.target.value)}
                                                style={{ ...selectStyle, marginBottom: '8px', fontSize: '13px' }}
                                            >
                                                <option value="">Subject *</option>
                                                {subjects.map(s => (
                                                    <option key={s.id} value={s.id}>{s.code || s.name}</option>
                                                ))}
                                            </select>
                                            <select
                                                value={batch.lecturer_id}
                                                onChange={(e) => updateEditingBatch(index, 'lecturer_id', e.target.value)}
                                                style={{ ...selectStyle, marginBottom: '8px', fontSize: '13px' }}
                                            >
                                                <option value="">Lecturer * (Required)</option>
                                                {lecturers.map(l => (
                                                    <option key={l.id} value={l.id}>{l.short_name}</option>
                                                ))}
                                            </select>
                                            <select
                                                value={batch.classroom_id || ''}
                                                onChange={(e) => updateEditingBatch(index, 'classroom_id', e.target.value)}
                                                style={{ ...selectStyle, fontSize: '13px' }}
                                            >
                                                <option value="">Classroom (Optional)</option>
                                                {classrooms.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => { setShowEditModal(false); setEditingSlot(null); setEditingBatches([]); }}
                                style={{ ...buttonStyle, flex: 1, background: '#f3f4f6' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={saving}
                                style={{ ...buttonStyle, flex: 1, background: '#4f46e5', color: 'white' }}
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
