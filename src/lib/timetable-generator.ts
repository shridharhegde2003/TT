export interface Subject {
  id: string
  subject_name: string
  subject_code: string
  faculty_name: string
  classroom: string
  periods_per_week: number
  semester: string
  color: string
}

export interface ClassTiming {
  start: string
  end: string
}

export interface Break {
  name: string
  start: string
  end: string
}

export interface Settings {
  class_timings: ClassTiming[]
  breaks: Break[]
  working_days: string[]
  default_heading: string
}

export interface TimetableSlot {
  subject?: Subject
  periodIndex: number
  day: string
  timeSlot: string
}

export interface TimetableData {
  days: string[]
  timeSlots: string[]
  slots: TimetableSlot[][]
  settings: Settings
  subjects: Subject[]
}

export class TimetableGenerator {
  private subjects: Subject[]
  private settings: Settings
  private timetable: TimetableSlot[][] = []
  private usedSlots: Set<string> = new Set()

  constructor(subjects: Subject[], settings: Settings) {
    this.subjects = subjects
    this.settings = settings
    this.initializeTimetable()
  }

  private initializeTimetable() {
    // Initialize empty timetable grid
    this.timetable = this.settings.working_days.map(() => 
      Array(this.settings.class_timings.length).fill(null).map((_, periodIndex) => ({
        periodIndex,
        day: '',
        timeSlot: this.getTimeSlot(periodIndex)
      }))
    )

    // Set day names
    this.settings.working_days.forEach((day, dayIndex) => {
      this.timetable[dayIndex].forEach(slot => {
        slot.day = day
      })
    })
  }

  private getTimeSlot(periodIndex: number): string {
    const timing = this.settings.class_timings[periodIndex]
    return `${timing.start} - ${timing.end}`
  }

  private getSlotKey(dayIndex: number, periodIndex: number): string {
    return `${dayIndex}-${periodIndex}`
  }

  private isSlotAvailable(dayIndex: number, periodIndex: number, subject: Subject): boolean {
    const slotKey = this.getSlotKey(dayIndex, periodIndex)

    // Check if slot is already taken
    if (this.usedSlots.has(slotKey)) {
      return false
    }

    // Check for faculty clash
    const existingSlot = this.timetable[dayIndex][periodIndex]
    if (existingSlot.subject && existingSlot.subject.faculty_name === subject.faculty_name) {
      return false
    }

    // Check for classroom clash
    if (existingSlot.subject && existingSlot.subject.classroom === subject.classroom) {
      return false
    }

    return true
  }

  private getAvailableSlots(): Array<{ dayIndex: number; periodIndex: number; score: number }> {
    const availableSlots: Array<{ dayIndex: number; periodIndex: number; score: number }> = []

    for (let dayIndex = 0; dayIndex < this.settings.working_days.length; dayIndex++) {
      for (let periodIndex = 0; periodIndex < this.settings.class_timings.length; periodIndex++) {
        const slotKey = this.getSlotKey(dayIndex, periodIndex)

        // Skip if slot is already taken
        if (this.usedSlots.has(slotKey)) {
          continue
        }

        // Calculate score for this slot (lower is better for even distribution)
        let score = 0

        // Prefer slots that don't create long gaps
        const adjacentSlots = this.getAdjacentSlotCount(dayIndex, periodIndex)
        score += adjacentSlots * 2 // Penalty for being isolated

        // Prefer earlier slots in the day
        score += periodIndex

        // Prefer days with fewer existing subjects
        const daySubjectCount = this.timetable[dayIndex].filter(slot => slot.subject).length
        score += daySubjectCount * 3

        availableSlots.push({ dayIndex, periodIndex, score })
      }
    }

    return availableSlots.sort((a, b) => a.score - b.score)
  }

  private getAdjacentSlotCount(dayIndex: number, periodIndex: number): number {
    let adjacentCount = 0

    // Check previous slot
    if (periodIndex > 0) {
      const prevSlotKey = this.getSlotKey(dayIndex, periodIndex - 1)
      if (this.usedSlots.has(prevSlotKey)) {
        adjacentCount++
      }
    }

    // Check next slot
    if (periodIndex < this.settings.class_timings.length - 1) {
      const nextSlotKey = this.getSlotKey(dayIndex, periodIndex + 1)
      if (this.usedSlots.has(nextSlotKey)) {
        adjacentCount++
      }
    }

    return adjacentCount
  }

  private assignSubjectToSlot(subject: Subject, dayIndex: number, periodIndex: number) {
    const slotKey = this.getSlotKey(dayIndex, periodIndex)
    this.usedSlots.add(slotKey)

    this.timetable[dayIndex][periodIndex].subject = subject
  }

  private isBreakTime(dayIndex: number, periodIndex: number): boolean {
    const periodStart = this.settings.class_timings[periodIndex].start
    const periodEnd = this.settings.class_timings[periodIndex].end

    return this.settings.breaks.some(breakItem => {
      return breakItem.start <= periodStart && breakItem.end >= periodEnd
    })
  }

  generate(): TimetableData {
    // Reset the timetable
    this.initializeTimetable()
    this.usedSlots.clear()

    // Sort subjects by periods per week (descending) to handle subjects with more periods first
    const sortedSubjects = [...this.subjects].sort((a, b) => b.periods_per_week - a.periods_per_week)

    for (const subject of sortedSubjects) {
      let periodsAssigned = 0

      while (periodsAssigned < subject.periods_per_week) {
        const availableSlots = this.getAvailableSlots()

        // Find the best slot for this subject
        let bestSlot = null
        for (const slot of availableSlots) {
          if (this.isSlotAvailable(slot.dayIndex, slot.periodIndex, subject) && 
              !this.isBreakTime(slot.dayIndex, slot.periodIndex)) {
            bestSlot = slot
            break
          }
        }

        if (!bestSlot) {
          console.warn(`Could not find available slot for ${subject.subject_name}`)
          break
        }

        this.assignSubjectToSlot(subject, bestSlot.dayIndex, bestSlot.periodIndex)
        periodsAssigned++
      }
    }

    return {
      days: this.settings.working_days,
      timeSlots: this.settings.class_timings.map((timing, index) => 
        `${timing.start} - ${timing.end}`
      ),
      slots: this.timetable,
      settings: this.settings,
      subjects: this.subjects
    }
  }

  // Utility method to get timetable as a simple object for storage
  static getTimetableAsObject(timetableData: TimetableData): any {
    const timetableObject: any = {
      days: timetableData.days,
      timeSlots: timetableData.timeSlots,
      settings: timetableData.settings,
      subjects: timetableData.subjects,
      slots: {}
    }

    timetableData.days.forEach((day, dayIndex) => {
      timetableObject.slots[day] = {}
      timetableData.timeSlots.forEach((timeSlot, periodIndex) => {
        const slot = timetableData.slots[dayIndex][periodIndex]
        timetableObject.slots[day][timeSlot] = slot.subject ? {
          id: slot.subject.id,
          subject_name: slot.subject.subject_name,
          subject_code: slot.subject.subject_code,
          faculty_name: slot.subject.faculty_name,
          classroom: slot.subject.classroom,
          color: slot.subject.color
        } : null
      })
    })

    return timetableObject
  }
}
