import * as pdfjsLib from "pdfjs-dist"
import { createWorker, OEM, type Worker } from "tesseract.js"
import type { Course, DayOfWeek, WeekType } from "@/types/course"

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

interface OcrWord {
  text: string
  x: number
  y: number
  confidence: number
}

interface PeriodRow {
  period: number
  y: number
}

interface Marker {
  weeks: string
  start: number
  end: number
  x: number
  y: number
  col: number
}

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

let workerPromise: Promise<Worker> | null = null
function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker("chi_sim", OEM.LSTM_ONLY, {
      langPath: `${import.meta.env.BASE_URL}tessdata`,
      gzip: true,
      workerPath: `${import.meta.env.BASE_URL}tesseract/worker.min.js`,
      corePath: `${import.meta.env.BASE_URL}tesseract-core`,
      logger: () => {},
    })
  }
  return workerPromise
}

export async function parsePdfSchedule(file: File): Promise<Course[]> {
  const data = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data }).promise
  const worker = await getWorker()

  const pagesWords: OcrWord[][] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const base = page.getViewport({ scale: 1 })
    const scale = 2500 / base.width
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement("canvas")
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    const ctx = canvas.getContext("2d")
    if (!ctx) continue
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
    pagesWords.push(await ocrPage(worker, canvas))
  }

  const courses = reconstruct(pagesWords)
  if (courses.length === 0) {
    const diag = pagesWords
      .map((words, i) => {
        const colX = detectDayColumns(words)
        const rows = detectPageRows(words, colX)
        return `第${i + 1}页: ${words.length}词 星期列${colX.length} 节次行${rows.length} 周次标记${detectMarkers(words, colX).length}`
      })
      .join("；")
    console.error("[pdfParser] 诊断：", diag)
    console.error("[pdfParser] 各页词数：", pagesWords.map((w) => w.length))
    if (pagesWords[0]) {
      const maxY = Math.max(...pagesWords[0].map((w) => w.y))
      const header = pagesWords[0]
        .filter((w) => w.y < maxY * 0.22)
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .map((w) => `${w.text}@${Math.round(w.x)}`)
        .join(" ")
      console.error("[pdfParser] 表头区域词：", header)
    }
    throw new Error(
      `未解析出课程。诊断信息：${diag}。若「词数」为 0 说明 OCR 未识别到文字；若词数正常但星期列不足，可能是表头识别失败。`
    )
  }
  return courses
}

async function ocrPage(
  worker: Worker,
  canvas: HTMLCanvasElement
): Promise<OcrWord[]> {
  const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true })
  const words: OcrWord[] = []
  for (const block of data.blocks ?? []) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        for (const w of line.words ?? []) {
          const text = w.text?.trim()
          if (!text) continue
          words.push({
            text,
            x: w.bbox.x0,
            y: w.bbox.y0,
            confidence: w.confidence,
          })
        }
      }
    }
  }
  console.log(
    `[ocr] 本页识别 ${words.length} 个词（全文 ${(data.text ?? "").length} 字），样例：`,
    words.slice(0, 30).map((w) => w.text).join(" ")
  )
  return words
}

// ---------- 网格重构 ----------

function cnToNum(s: string): number | null {
  if (!s) return null
  if (s === "十") return 10
  if (/^十[一二三四五六七八九]$/.test(s)) return 10 + CN_NUM[s[1]]
  if (s.length === 1 && CN_NUM[s]) return CN_NUM[s]
  return null
}

function detectDayColumns(words: OcrWord[]): number[] {
  // 1. 多字"星期"（如 OCR 把"星期"识别为一个词）
  let xs = words.filter((w) => w.text.includes("星期")).map((w) => w.x)
  if (xs.length >= 5) return cluster1D(xs, 24)

  // 2. 单字"星"/"期"（OCR 按单字分词时，"星期"被拆成"星"+"期"）
  //    表头那一行"星/期"字最多，取同行数量最多的一组 x 作为列
  const cands = words.filter((w) => w.text === "星" || w.text === "期")
  if (cands.length >= 5) {
    const bands = new Map<number, number[]>()
    for (const w of cands) {
      const key = Math.round(w.y / 25)
      const arr = bands.get(key)
      if (arr) arr.push(w.x)
      else bands.set(key, [w.x])
    }
    let best: number[] = []
    for (const arr of bands.values()) if (arr.length > best.length) best = arr
    if (best.length >= 5) return cluster1D(best, 24)
  }

  // 3. 用周次标记的 x 聚类推断等间距的 7 列
  const markerXs = words
    .filter((w) => TIME_RANGE_RE.test(w.text))
    .map((w) => w.x)
  const clusters = cluster1D(markerXs, 40).sort((a, b) => a - b)
  if (clusters.length >= 3) {
    let spacing = Infinity
    for (let i = 1; i < clusters.length; i++)
      spacing = Math.min(spacing, clusters[i] - clusters[i - 1])
    if (spacing > 0 && spacing < 500) {
      const out: number[] = []
      for (let i = 0; i < 7; i++) out.push(clusters[0] + i * spacing)
      return out
    }
  }
  return []
}

function cluster1D(values: number[], tolerance: number): number[] {
  if (values.length === 0) return []
  const sorted = [...values].sort((a, b) => a - b)
  const out: number[] = []
  let cur = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - cur[cur.length - 1] <= tolerance) cur.push(sorted[i])
    else {
      out.push(cur.reduce((a, b) => a + b, 0) / cur.length)
      cur = [sorted[i]]
    }
  }
  out.push(cur.reduce((a, b) => a + b, 0) / cur.length)
  return out
}

const TIME_RANGE_RE = /^(\d{1,2})[-–—_~\s](\d{1,2})$/
const isWeekToken = (t: string) =>
  TIME_RANGE_RE.test(t) || t === "周" || /^周$/.test(t)

function nearestCol(x: number, colX: number[]): number {
  if (colX.length < 2) return -1
  const spacing = colX[1] - colX[0]
  if (x < colX[0] - spacing / 2) return -1
  let best = 0
  let bd = Infinity
  colX.forEach((c, i) => {
    const d = Math.abs(x - c)
    if (d < bd) {
      bd = d
      best = i
    }
  })
  return best
}

function minMarkerY(words: OcrWord[]): number {
  const ys = words.filter((w) => TIME_RANGE_RE.test(w.text)).map((w) => w.y)
  return ys.length ? Math.min(...ys) : 0
}

function footerY(words: OcrWord[]): number {
  const footer = words.find((w) =>
    /本学期|已选|课程代码|课程名称|上课时间|开课单位/.test(w.text)
  )
  return footer ? footer.y : Infinity
}

function detectPageRows(
  words: OcrWord[],
  colX: number[]
): { num: number | null; y: number }[] {
  if (colX.length < 2) return []
  const leftX = colX[0] - 40
  const out: { num: number | null; y: number }[] = []
  for (const d of words.filter((w) => w.text === "第" && w.x < leftX)) {
    const time = words.find(
      (w) =>
        w.x > d.x + 60 &&
        w.x < d.x + 260 &&
        /\d/.test(w.text) &&
        Math.abs(w.y - d.y) < 25
    )
    if (!time) continue
    const nums = words
      .filter(
        (w) =>
          Math.abs(w.y - d.y) < 22 &&
          w.x > d.x + 10 &&
          w.x < d.x + 70 &&
          /^[一二三四五六七八九十]$/.test(w.text) &&
          w.confidence >= 40
      )
      .sort((a, b) => a.x - b.x)
      .map((w) => w.text)
      .join("")
    out.push({ num: cnToNum(nums), y: d.y })
  }
  return out.sort((a, b) => a.y - b.y)
}

function detectAllRows(
  pagesWords: OcrWord[][],
  colX: number[]
): PeriodRow[][] {
  const result: PeriodRow[][] = []
  let nextPeriod = 1
  pagesWords.forEach((words, p) => {
    const raw = detectPageRows(words, colX)
    if (p === 0) {
      const rows = raw.map((r, i) => ({ period: i + 1, y: r.y }))
      result.push(rows.filter((r) => r.period <= 12))
      nextPeriod = rows.length + 1
    } else {
      let start = nextPeriod
      if (raw.length && raw[0].num != null) start = raw[0].num
      const rows: PeriodRow[] = []
      if (start > nextPeriod) {
        const topY = minMarkerY(words)
        for (let q = nextPeriod; q < start; q++)
          rows.push({ period: q, y: topY })
      }
      raw.forEach((r, i) =>
        rows.push({
          period: r.num != null && r.num >= start ? r.num : start + i,
          y: r.y,
        })
      )
      result.push(rows.filter((r) => r.period <= 12))
      nextPeriod = rows.length ? rows[rows.length - 1].period + 1 : nextPeriod
    }
  })
  return result
}

function periodAt(y: number, rows: PeriodRow[]): number | null {
  let p: number | null = null
  for (const r of rows) if (r.y <= y + 12) p = r.period
  return p
}

function detectMarkers(words: OcrWord[], colX: number[]): Marker[] {
  const markers: Marker[] = []
  for (const w of words) {
    const m = w.text.match(TIME_RANGE_RE)
    if (!m) continue
    const hasZhou = words.some(
      (z) =>
        z.text === "周" &&
        Math.abs(z.y - w.y) < 16 &&
        z.x > w.x &&
        z.x < w.x + 90
    )
    if (!hasZhou) continue
    const col = nearestCol(w.x, colX)
    if (col < 0) continue
    markers.push({
      weeks: `${Number(m[1])}-${Number(m[2])}`,
      start: Number(m[1]),
      end: Number(m[2]),
      x: w.x,
      y: w.y,
      col,
    })
  }
  return markers
}

const isNoise = (t: string) =>
  /[:~]/.test(t) ||
  /^[\d\s,，。.\-|／/\\]+$/.test(t) ||
  t.length > 30

function cellBody(words: OcrWord[]): string {
  return words
    .filter((w) => !isWeekToken(w.text) && !isNoise(w.text))
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((w) => w.text)
    .join("")
}

function bigrams(s: string): Set<string> {
  const set = new Set<string>()
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2))
  return set
}

function overlap(a: string, b: string): number {
  const A = bigrams(a)
  const B = bigrams(b)
  let n = 0
  for (const g of A) if (B.has(g)) n++
  return n
}

interface CourseSeed {
  col: number
  day: DayOfWeek
  weeks: string
  startWeek: number
  endWeek: number
  startPeriod: number
  endPeriod: number
  name: string
  teacher?: string
  location?: string
}

function buildCourses(
  markers: Marker[],
  words: OcrWord[],
  rows: PeriodRow[],
  colX: number[],
  footY: number
): CourseSeed[] {
  const byCol: Record<number, Marker[]> = {}
  for (const mk of markers) {
    const period = periodAt(mk.y, rows)
    if (period == null) continue
    ;(byCol[mk.col] ??= []).push(mk)
  }

  const courses: CourseSeed[] = []
  for (const colStr of Object.keys(byCol)) {
    const col = Number(colStr)
    const list = byCol[col].sort((a, b) => a.y - b.y)
    const cells = list.map((mk, i) => {
      const topY = mk.y
      const bottomY = Math.min(
        i + 1 < list.length ? list[i + 1].y : footY,
        footY
      )
      const cw = words.filter(
        (w) =>
          nearestCol(w.x, colX) === col && w.y >= topY - 5 && w.y < bottomY
      )
      return { mk, body: cellBody(cw), cw }
    })

    let run: {
      col: number
      weeks: string
      start: number
      end: number
      startPeriod: number
      endPeriod: number
      body: string
      cw: OcrWord[]
    } | null = null

    for (const cell of cells) {
      if (
        run &&
        run.weeks === cell.mk.weeks &&
        overlap(run.body, cell.body) >= 1
      ) {
        run.endPeriod = periodAt(cell.mk.y, rows) ?? run.endPeriod
        run.cw.push(...cell.cw)
        run.body += cell.body
      } else {
        if (run) courses.push(finalize(run))
        run = {
          col,
          weeks: cell.mk.weeks,
          start: cell.mk.start,
          end: cell.mk.end,
          startPeriod: periodAt(cell.mk.y, rows) ?? 1,
          endPeriod: periodAt(cell.mk.y, rows) ?? 1,
          body: cell.body,
          cw: [...cell.cw],
        }
      }
    }
    if (run) courses.push(finalize(run))
  }
  return courses.sort(
    (a, b) => a.startPeriod - b.startPeriod || a.col - b.col
  )
}

function finalize(run: {
  col: number
  weeks: string
  start: number
  end: number
  startPeriod: number
  endPeriod: number
  cw: OcrWord[]
}): CourseSeed {
  const body = run.cw.filter((w) => !isWeekToken(w.text) && !isNoise(w.text))
  const lines: string[] = []
  let cy: number | null = null
  let cur: OcrWord[] = []
  for (const w of body.sort((a, b) => a.y - b.y || a.x - b.x)) {
    if (cy == null || Math.abs(w.y - cy) < 14) {
      cur.push(w)
      cy = cy == null ? w.y : (cy + w.y) / 2
    } else {
      lines.push(cur.sort((a, b) => a.x - b.x).map((w) => w.text).join(""))
      cur = [w]
      cy = w.y
    }
  }
  if (cur.length) lines.push(cur.sort((a, b) => a.x - b.x).map((w) => w.text).join(""))

  let teacher = ""
  let location = ""
  const nameParts: string[] = []
  for (const line of lines) {
    if (!location && /(楼|室|教|校区|馆|堂|A\d|实验室)/.test(line)) {
      location = line
      continue
    }
    if (!teacher && /^[一-龥]{2,4}$/.test(line)) {
      teacher = line
      continue
    }
    if (!teacher && /^[一-龥]{2,4}[,，][一-龥]{2,4}$/.test(line)) {
      teacher = line
      continue
    }
    nameParts.push(line)
  }

  return {
    col: run.col,
    day: (run.col + 1) as DayOfWeek,
    weeks: run.weeks,
    startWeek: run.start,
    endWeek: run.end,
    startPeriod: run.startPeriod,
    endPeriod: run.endPeriod,
    name: nameParts.join(" "),
    teacher: teacher || undefined,
    location: location || undefined,
  }
}

function reconstruct(pagesWords: OcrWord[][]): Course[] {
  let colX: number[] = []
  for (const words of pagesWords) {
    colX = detectDayColumns(words)
    if (colX.length >= 5) break
  }
  if (colX.length < 5) return []

  const rowsPerPage = detectAllRows(pagesWords, colX)
  const courses: Course[] = []
  pagesWords.forEach((words, p) => {
    const rows = rowsPerPage[p] ?? []
    if (rows.length === 0) return
    const markers = detectMarkers(words, colX)
    const seeds = buildCourses(markers, words, rows, colX, footerY(words))
    for (const s of seeds) {
      courses.push({
        id: "",
        name: s.name,
        teacher: s.teacher,
        location: s.location,
        dayOfWeek: s.day,
        startWeek: s.startWeek,
        endWeek: s.endWeek,
        weekType: "all" as WeekType,
        startPeriod: s.startPeriod,
        endPeriod: s.endPeriod,
      })
    }
  })
  return courses
}
