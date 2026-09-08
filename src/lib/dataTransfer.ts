import type {
  Course,
  DayOfWeek,
  SemesterConfig,
  WeekType,
} from "@/types/course"

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function exportToJson(courses: Course[], semester: SemesterConfig) {
  download(
    "schedule.json",
    JSON.stringify({ semester, courses }, null, 2),
    "application/json"
  )
}

export function exportToCsv(courses: Course[]) {
  const header =
    "name,teacher,location,dayOfWeek,startWeek,endWeek,weekType,startPeriod,endPeriod"
  const rows = courses.map((c) =>
    [
      c.name,
      c.teacher ?? "",
      c.location ?? "",
      c.dayOfWeek,
      c.startWeek,
      c.endWeek,
      c.weekType,
      c.startPeriod,
      c.endPeriod,
    ]
      .map(csvEscape)
      .join(",")
  )
  // 加 BOM 让 Excel 正确识别中文
  download("schedule.csv", "﻿" + [header, ...rows].join("\n"), "text/csv;charset=utf-8")
}

function csvEscape(v: string | number): string {
  const s = String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function parseCsv(text: string): Omit<Course, "id">[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length === 0) return []
  if (lines[0].charAt(0) === "﻿") lines[0] = lines[0].slice(1)

  let start = 0
  const header = lines[0].toLowerCase()
  if (/name|课程|名称/.test(header)) start = 1

  const courses: Omit<Course, "id">[] = []
  for (let i = start; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i])
    if (cells.length < 8) continue
    const [name, teacher, location, dayStr, startWeek, endWeek, weekType, startPeriod, endPeriod] =
      cells
    const day = Number(dayStr)
    if (!name?.trim() || !Number.isFinite(day) || day < 1 || day > 7) continue
    const sw = Number(startWeek)
    const ew = Number(endWeek)
    courses.push({
      name: name.trim(),
      teacher: teacher?.trim() || undefined,
      location: location?.trim() || undefined,
      dayOfWeek: day as DayOfWeek,
      startWeek: Number.isFinite(sw) ? sw : 1,
      endWeek: Number.isFinite(ew) ? ew : Number.isFinite(sw) ? sw : 1,
      weekType: (weekType === "single" || weekType === "double"
        ? weekType
        : "all") as WeekType,
      startPeriod: Number(startPeriod) || 1,
      endPeriod: Number(endPeriod) || Number(startPeriod) || 1,
    })
  }
  return courses
}

export function parseJson(
  text: string
): { courses: Omit<Course, "id">[]; semester?: SemesterConfig } {
  const data = JSON.parse(text)
  if (Array.isArray(data)) return { courses: data }
  return { courses: data.courses ?? [], semester: data.semester }
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuote = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuote = true
    } else if (ch === ",") {
      out.push(cur)
      cur = ""
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}
