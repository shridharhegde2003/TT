// ========================================
// Type Definitions for Timetable Generator
// ========================================

export interface UserProfile {
    id: string
    user_id: string
    full_name: string
    email: string
    is_onboarded: boolean
    created_at: string
    updated_at: string
}

export interface CollegeSettings {
    id: string
    user_id: string
    college_name: string
    college_start_time: string
    college_end_time: string
    default_class_duration: number // in minutes
    lunch_start_time: string
    lunch_end_time: string
    breaks: BreakTime[]
    working_days: string[]
    created_at: string
    updated_at: string
}

export interface BreakTime {
    name: string
    start_time: string
    end_time: string
}

export interface Lecturer {
    id: string
    user_id: string
    full_name: string
    short_name: string
    email?: string
    phone?: string
    department?: string
    created_at: string
    updated_at: string
}

export interface Classroom {
    id: string
    user_id: string
    name: string
    capacity?: number
    created_at: string
    updated_at: string
}

export interface Subject {
    id: string
    user_id: string
    name: string
    code?: string
    is_practical: boolean
    color: string
    created_at: string
    updated_at: string
}

export interface Timetable {
    id: string
    user_id: string
    class_name: string
    semester: string
    year: string
    section?: string
    title?: string
    status: 'in_progress' | 'done'
    created_at: string
    updated_at: string
}

export interface TimetableSlot {
    id: string
    timetable_id: string
    day_of_week: string
    start_time: string
    end_time: string
    slot_type: 'class' | 'break' | 'lunch'
    subject_id?: string
    lecturer_id?: string
    classroom_id?: string
    is_practical: boolean
    slot_order: number
    created_at: string
    updated_at: string
    // Joined data
    subject?: Subject
    lecturer?: Lecturer
    classroom?: Classroom
    lab_batches?: LabBatch[]
}

export interface LabBatch {
    id: string
    timetable_slot_id: string
    batch_name: string
    subject_id?: string
    lecturer_id?: string
    created_at: string
    updated_at: string
    // Joined data
    subject?: Subject
    lecturer?: Lecturer
}

// Form types
export interface OnboardingFormData {
    college_name: string
    college_start_time: string
    college_end_time: string
    default_class_duration: number
    lunch_start_time: string
    lunch_end_time: string
    breaks: BreakTime[]
    working_days: string[]
}

export interface LecturerFormData {
    full_name: string
    short_name: string
    email?: string
    phone?: string
    department?: string
    auto_generate_short_name: boolean
}

export interface ClassroomFormData {
    name: string
    capacity?: number
}

export interface SubjectFormData {
    name: string
    code?: string
    is_practical: boolean
    color: string
}

export interface TimetableFormData {
    class_name: string
    semester: string
    year: string
    section?: string
}

export interface SlotFormData {
    day_of_week: string
    start_time: string
    end_time: string
    slot_type: 'class' | 'break' | 'lunch'
    subject_id?: string
    lecturer_id?: string
    classroom_id?: string
    is_practical: boolean
    lab_batches?: {
        batch_name: string
        subject_id?: string
        lecturer_id?: string
    }[]
}

// Conflict check result
export interface ConflictCheckResult {
    has_conflict: boolean
    conflict_timetable?: string
    conflict_section?: string
}

// Days of the week
export const DAYS_OF_WEEK = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
] as const

export type DayOfWeek = typeof DAYS_OF_WEEK[number]

// Color palette for subjects
export const SUBJECT_COLORS: string[] = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#6366F1', // Indigo
    '#14B8A6', // Teal
    '#A855F7', // Violet
]

// Semester options
export const SEMESTER_OPTIONS = [
    'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'
] as const

// Year options (dynamic based on current year)
export const getYearOptions = () => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => String(currentYear + i - 1))
}
