import { useRef, useState, type ChangeEvent } from "react"
import { Download, FileUp, LayoutGrid, List, Plus, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { useScheduleStore } from "@/store/useScheduleStore"
import { parsePdfSchedule } from "@/lib/pdfParser"
import {
  exportToCsv,
  exportToJson,
  parseCsv,
  parseJson,
} from "@/lib/dataTransfer"
import { UploadDropzone } from "@/components/UploadDropzone"
import { WeekSelector } from "@/components/WeekSelector"
import { WeekView } from "@/components/WeekView"
import { ListView } from "@/components/ListView"
import { CourseDetailDrawer } from "@/components/CourseDetailDrawer"
import { CourseFormDialog } from "@/components/CourseFormDialog"
import { SettingsDialog } from "@/components/SettingsDialog"
import { PasteImportDialog } from "@/components/PasteImportDialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type ImportKind = "pdf" | "csv" | "json"

export default function App() {
  const courses = useScheduleStore((s) => s.courses)
  const semester = useScheduleStore((s) => s.semester)
  const viewMode = useScheduleStore((s) => s.viewMode)
  const setViewMode = useScheduleStore((s) => s.setViewMode)
  const addCourses = useScheduleStore((s) => s.addCourses)
  const setSemester = useScheduleStore((s) => s.setSemester)
  const openCourseForm = useScheduleStore((s) => s.openCourseForm)
  const clearCourses = useScheduleStore((s) => s.clearCourses)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [noticeType, setNoticeType] = useState<"info" | "error">("info")
  const [importing, setImporting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const importKindRef = useRef<ImportKind>("pdf")

  function flash(msg: string, type: "info" | "error" = "info") {
    setNotice(msg)
    setNoticeType(type)
    if (type === "error") return
    window.setTimeout(() => setNotice(null), 4000)
  }

  function triggerImport(kind: ImportKind) {
    importKindRef.current = kind
    fileInputRef.current?.click()
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    const kind = importKindRef.current
    if (kind === "pdf") setImporting(true)
    setNotice(null)
    try {
      if (kind === "pdf") {
        const parsed = await parsePdfSchedule(file)
        if (parsed.length === 0) {
          flash("未解析出课程，请检查文件格式或改用 CSV/手动导入", "error")
          return
        }
        addCourses(parsed)
        flash(`已导入 ${parsed.length} 门课程`)
      } else {
        const text = await file.text()
        if (kind === "csv") {
          const parsed = parseCsv(text)
          if (parsed.length === 0) {
            flash("CSV 中无有效数据", "error")
            return
          }
          addCourses(parsed)
          flash(`已导入 ${parsed.length} 门课程`)
        } else {
          const { courses: parsed, semester: sem } = parseJson(text)
          if (parsed.length) addCourses(parsed)
          if (sem) setSemester(sem)
          flash(`已导入 ${parsed.length} 门课程`)
        }
      }
    } catch (err) {
      console.error("导入失败:", err)
      flash(
        err instanceof Error ? `导入失败：${err.message}` : "导入失败，请查看控制台",
        "error"
      )
    } finally {
      if (kind === "pdf") setImporting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">课表管理系统</h1>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileUp className="size-4" /> 导入
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>导入数据</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => triggerImport("pdf")}>
                  导入 PDF 课表
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPasteOpen(true)}>
                  粘贴文字导入
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => triggerImport("csv")}>
                  导入 CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => triggerImport("json")}>
                  导入 JSON 备份
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="size-4" /> 设置周次
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="size-4" /> 导出
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>导出数据</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => exportToJson(courses, semester)}>
                  导出 JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToCsv(courses)}>
                  导出 CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={clearCourses}>
                  清空所有课程
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" onClick={() => openCourseForm(null)}>
              <Plus className="size-4" /> 添加课程
            </Button>
          </div>
        </div>

        <WeekSelector />
        {importing && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            正在解析 PDF（首次需加载 OCR 引擎，约 10-30 秒）…
          </p>
        )}
        {notice && (
          <p
            className={cn(
              "text-xs",
              noticeType === "error" ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {notice}
          </p>
        )}
      </header>

      <main className="flex-1 p-4">
        {courses.length === 0 ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-16">
            <div className="text-center">
              <h2 className="text-xl font-semibold">欢迎使用课表管理系统</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                上传 PDF 课表自动解析，或手动添加课程
              </p>
            </div>
            <UploadDropzone />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => triggerImport("csv")}>
                导入 CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => triggerImport("json")}>
                导入 JSON
              </Button>
              <Button variant="outline" size="sm" onClick={() => openCourseForm(null)}>
                手动添加
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Tabs
              value={viewMode}
              onValueChange={(v) => setViewMode(v as "week" | "list")}
            >
              <TabsList>
                <TabsTrigger value="week">
                  <LayoutGrid className="size-4" /> 周视图
                </TabsTrigger>
                <TabsTrigger value="list">
                  <List className="size-4" /> 列表
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {viewMode === "week" ? <WeekView /> : <ListView />}
          </div>
        )}
      </main>

      <CourseDetailDrawer />
      <CourseFormDialog />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <PasteImportDialog open={pasteOpen} onOpenChange={setPasteOpen} />

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.csv,.json"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}
