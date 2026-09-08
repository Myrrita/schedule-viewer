export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7 // 1 = 周一

export type WeekType = "single" | "double" | "all"

export interface Course {
  id: string
  name: string
  teacher?: string
  location?: string
  dayOfWeek: DayOfWeek
  startWeek: number
  endWeek: number
  weekType: WeekType
  startPeriod: number
  endPeriod: number
  color?: string
}

export interface Holiday {
  id: string
  week: number
  days: DayOfWeek[]
  label?: string
}

export interface SemesterConfig {
  /** 第 1 周周一的日期，格式 YYYY-MM-DD */
  startDate: string
  totalWeeks: number
  holidays: Holiday[]
}

export type ViewMode = "week" | "list"
