import { useState } from "react"
import { useScheduleStore } from "@/store/useScheduleStore"
import { parseScheduleText } from "@/lib/textParser"
import { DAY_LABELS } from "@/lib/constants"
import { formatPeriodLabel } from "@/lib/scheduleUtils"
import type { Course } from "@/types/course"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function PasteImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const addCourses = useScheduleStore((s) => s.addCourses)
  const [text, setText] = useState("")
  const [preview, setPreview] = useState<Omit<Course, "id">[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handlePreview() {
    const courses = parseScheduleText(text)
    if (courses.length === 0) {
      setError("未解析出课程，请确认粘贴的是课表表格（含星期表头与第X节行）")
      setPreview(null)
      return
    }
    setError(null)
    setPreview(courses)
  }

  function handleImport() {
    if (!preview || preview.length === 0) return
    addCourses(preview)
    setText("")
    setPreview(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>粘贴文字导入</DialogTitle>
          <DialogDescription>
            从教务系统或 Word 复制课表表格粘贴到下方，点「预览」查看解析结果，确认无误后再导入。
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setError(null)
            setPreview(null)
          }}
          placeholder={
            "节次／星期\t时间\t星期一\t星期二\t星期三\t…\t星期日\n第一\t08:00~08:45\t\t\t…\n第二\t08:50~09:35\t\t\t…\t3-6周科研伦理与学术规范（…）蔺辉星范红结\n…"
          }
          className="min-h-40 font-mono text-xs"
        />

        <div className="flex gap-2">
          <Button variant="secondary" onClick={handlePreview} disabled={!text.trim()}>
            预览
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {preview && (
          <div className="overflow-y-auto rounded-md border">
            <p className="border-b px-3 py-2 text-sm text-muted-foreground">
              解析出 {preview.length} 门课程
            </p>
            <ul className="divide-y text-sm">
              {preview.map((c, i) => (
                <li key={i} className="px-3 py-2">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {DAY_LABELS[c.dayOfWeek]} {formatPeriodLabel(c.startPeriod, c.endPeriod)} ·{" "}
                    第{c.startWeek}-{c.endWeek}周
                    {c.teacher ? ` · 教师：${c.teacher}` : ""}
                    {c.location ? ` · ${c.location}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleImport} disabled={!preview || preview.length === 0}>
            确认导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
