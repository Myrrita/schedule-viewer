import type { Course, DayOfWeek, WeekType } from "@/types/course"

const CN_NUM: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
}

function cnToNum(s: string): number | null {
  if (!s) return null
  if (s === "十") return 10
  if (/^十[一二]$/.test(s)) return 10 + (CN_NUM[s[1]] ?? 0)
  if (s.length === 1 && CN_NUM[s]) return CN_NUM[s]
  return null
}

interface ParsedCell {
  startWeek: number
  endWeek: number
  weekType: WeekType
  name: string
  teacher?: string
  location?: string
}

function parseCell(cell: string): ParsedCell | null {
  const m = cell.match(/^(\d{1,2})\s*[-–—~至]\s*(\d{1,2})\s*周(\(单\)|\(双\)|单|双)?/)
  if (!m) return null
  const startWeek = Number(m[1])
  const endWeek = Number(m[2])
  const weekType: WeekType = /单/.test(m[3] ?? "") ? "single" : /双/.test(m[3] ?? "") ? "double" : "all"
  let rest = cell.slice(m[0].length).trim()

  let location = ""
  const lm = rest.match(/(主楼|教学楼|实验楼|综合楼|图书馆|体育馆|校区|学院|教[一二三四五六七八九十\d]{0,2}楼|教\d+)[A-Za-z0-9\-]*$/)
  if (lm) {
    location = lm[0]
    rest = rest.slice(0, -lm[0].length).trim()
  }

  let teacher = ""
  const tm = rest.match(/([一-龥]{2,6})$/)
  if (tm) {
    teacher = tm[1]
    // 6 字多为两位老师连写（如"蔺辉星范红结"），拆开
    if (teacher.length === 6) teacher = `${teacher.slice(0, 3)}、${teacher.slice(3)}`
    rest = rest.slice(0, -tm[1].length).trim()
  }

  return {
    startWeek,
    endWeek,
    weekType,
    name: extractName(rest),
    teacher: teacher || undefined,
    location: location || undefined,
  }
}

function extractName(rest: string): string {
  const text = rest.trim()
  const firstOpen = text.indexOf("（")
  if (firstOpen === -1) return text
  const lastClose = text.lastIndexOf("）")
  if (lastClose === -1) return text

  const short = text.slice(0, firstOpen).trim()
  const full = text.slice(firstOpen + 1, lastClose).trim()
  if (short && full.startsWith(short)) return appendClass(short, full.slice(short.length))

  const secondOpen = text.indexOf("（", firstOpen + 1)
  if (secondOpen !== -1) {
    const short2 = text.slice(0, secondOpen).trim()
    const full2 = text.slice(secondOpen + 1, lastClose).trim()
    if (short2 && full2.startsWith(short2)) return appendClass(short2, full2.slice(short2.length))
  }
  return text
}

function appendClass(short: string, clsRaw: string): string {
  const cls = clsRaw.trim()
  if (!cls) return short
  return cls.startsWith("（") ? short + cls : `${short}（${cls}）`
}

interface Seed {
  day: DayOfWeek
  period: number
  startWeek: number
  endWeek: number
  weekType: WeekType
  name: string
  teacher?: string
  location?: string
}

function normalizeToGrid(text: string): string[][] {
  const rawLines = text.split(/\r?\n/)
  const hasTab = rawLines.some((l) => l.includes("\t"))
  if (hasTab) {
    return rawLines.map((l) => l.trim()).filter((l) => l.length > 0).map((l) => l.split("\t").map((c) => c.trim()))
  }
  // 无制表符：按行拆分，尝试按"第X节"分组（扁平表格）
  const lines = rawLines.map((l) => l.trim()).filter((l) => l.length > 0)
  const grid: string[][] = []
  let cur: string[] = []
  for (const line of lines) {
    if (/^第[一二三四五六七八九十]+$/.test(line) && cur.length >= 2) {
      grid.push(cur)
      cur = [line]
    } else {
      cur.push(line)
    }
  }
  if (cur.length) grid.push(cur)
  return grid
}

function parseGrid(grid: string[][]): Seed[] {
  // 找表头行
  let headerIdx = -1
  let dayStartIdx = 1 // 默认：第0列节次，第1列时间，第2列起为星期
  for (let i = 0; i < grid.length; i++) {
    const row = grid[i]
    const dayCols: number[] = []
    row.forEach((c, ci) => {
      if (/^(星期|周)[一二三四五六日天]$/.test(c)) dayCols.push(ci)
    })
    if (dayCols.length >= 5) {
      headerIdx = i
      dayStartIdx = Math.min(...dayCols)
      break
    }
  }

  const seeds: Seed[] = []
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const row = grid[i]
    if (row.length < dayStartIdx + 1) continue
    const jieci = row[0].replace(/^第/, "").replace(/节$/, "")
    const period = cnToNum(jieci)
    if (period == null) continue
    for (let c = dayStartIdx; c < row.length; c++) {
      const cell = row[c].trim()
      if (!cell || !/^\d{1,2}\s*[-–—~至]\s*\d{1,2}\s*周/.test(cell)) continue
      const parsed = parseCell(cell)
      if (!parsed) continue
      const day = (c - dayStartIdx + 1) as DayOfWeek
      if (day < 1 || day > 7) continue
      seeds.push({ day, period, ...parsed })
    }
  }
  return seeds
}

function mergeSeeds(seeds: Seed[]): Omit<Course, "id">[] {
  const sorted = [...seeds].sort((a, b) => a.day - b.day || a.period - b.period)
  const courses: Omit<Course, "id">[] = []
  let run: (Seed & { startPeriod: number; endPeriod: number }) | null = null

  const same = (a: Seed, b: Seed) =>
    a.day === b.day && a.name === b.name && a.startWeek === b.startWeek && a.endWeek === b.endWeek

  for (const s of sorted) {
    if (run && same(run, s) && s.period === run.endPeriod + 1) {
      run.endPeriod = s.period
    } else {
      if (run) {
        courses.push({
          name: run.name,
          teacher: run.teacher,
          location: run.location,
          dayOfWeek: run.day,
          startWeek: run.startWeek,
          endWeek: run.endWeek,
          weekType: run.weekType,
          startPeriod: run.startPeriod,
          endPeriod: run.endPeriod,
        })
      }
      run = { ...s, startPeriod: s.period, endPeriod: s.period }
    }
  }
  if (run) {
    courses.push({
      name: run.name,
      teacher: run.teacher,
      location: run.location,
      dayOfWeek: run.day,
      startWeek: run.startWeek,
      endWeek: run.endWeek,
      weekType: run.weekType,
      startPeriod: run.startPeriod,
      endPeriod: run.endPeriod,
    })
  }
  return courses
}

export function parseScheduleText(text: string): Omit<Course, "id">[] {
  const grid = normalizeToGrid(text)
  if (grid.length === 0) return []
  const seeds = parseGrid(grid)
  return mergeSeeds(seeds)
}
