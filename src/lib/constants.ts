import type { DayOfWeek } from "@/types/course"

export const DAY_LABELS: Record<DayOfWeek, string> = {
  1: "周一",
  2: "周二",
  3: "周三",
  4: "周四",
  5: "周五",
  6: "周六",
  7: "周日",
}

export const DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 7]

export const DEFAULT_TOTAL_WEEKS = 16
export const MIN_PERIODS = 8

/** 每节次对应的时间段（第1节~第12节），可按学校作息调整 */
export const PERIOD_TIMES: string[] = [
  "08:00~08:45",
  "08:50~09:35",
  "09:50~10:35",
  "10:40~11:25",
  "11:30~12:15",
  "14:00~14:45",
  "14:50~15:35",
  "15:50~16:35",
  "16:40~17:25",
  "19:00~19:45",
  "19:50~20:35",
  "20:40~21:25",
]

export interface CourseColor {
  bg: string
  text: string
  border: string
}

export const COURSE_PALETTE: CourseColor[] = [
  { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
  { bg: "#dcfce7", text: "#166534", border: "#86efac" },
  { bg: "#fef9c3", text: "#854d0e", border: "#fde047" },
  { bg: "#fce7f3", text: "#9d174d", border: "#f9a8d4" },
  { bg: "#ede9fe", text: "#5b21b6", border: "#c4b5fd" },
  { bg: "#ffedd5", text: "#9a3412", border: "#fdba74" },
  { bg: "#cffafe", text: "#155e75", border: "#67e8f9" },
  { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
  { bg: "#f3e8ff", text: "#6b21a8", border: "#d8b4fe" },
  { bg: "#e2e8f0", text: "#334155", border: "#cbd5e1" },
]

export function getCourseColor(name: string): CourseColor {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return COURSE_PALETTE[hash % COURSE_PALETTE.length]
}
