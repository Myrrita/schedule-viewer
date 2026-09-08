import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfWeek,
} from "date-fns"
import type { Course, DayOfWeek, SemesterConfig, WeekType } from "@/types/course"
import { PERIOD_TIMES } from "@/lib/constants"

export function parseDate(str: string): Date {
  return parseISO(str)
}

export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function getMonday(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

export function computeCurrentWeek(
  semester: SemesterConfig,
  now: Date = new Date()
): number {
  const start = parseDate(semester.startDate)
  const days = differenceInCalendarDays(now, start)
  const week = Math.floor(days / 7) + 1
  return Math.min(Math.max(week, 1), semester.totalWeeks)
}

export function isCourseActiveInWeek(course: Course, week: number): boolean {
  if (week < course.startWeek || week > course.endWeek) return false
  if (course.weekType === "single") return week % 2 === 1
  if (course.weekType === "double") return week % 2 === 0
  return true
}

export function weekDateRange(
  semester: SemesterConfig,
  week: number
): { start: Date; end: Date } {
  const base = parseDate(semester.startDate)
  const start = addDays(base, (week - 1) * 7)
  return { start, end: addDays(start, 6) }
}

export function dayDateLabel(
  semester: SemesterConfig,
  week: number,
  day: DayOfWeek
): string {
  const base = parseDate(semester.startDate)
  return format(addDays(base, (week - 1) * 7 + (day - 1)), "M/d")
}

export function formatPeriodLabel(start: number, end: number): string {
  return start === end ? `第${start}节` : `第${start}-${end}节`
}

export function periodTimeRange(start: number, end: number): string {
  const s = PERIOD_TIMES[start - 1]?.split("~")[0]
  const e = PERIOD_TIMES[end - 1]?.split("~")[1]
  return s && e ? `${s}~${e}` : ""
}

export function formatWeekRange(
  startWeek: number,
  endWeek: number,
  weekType: WeekType
): string {
  const base = `${startWeek}-${endWeek}周`
  if (weekType === "single") return `${base}(单)`
  if (weekType === "double") return `${base}(双)`
  return base
}
