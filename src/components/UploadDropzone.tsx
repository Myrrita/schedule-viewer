import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { FileUp, Loader2 } from "lucide-react"
import { parsePdfSchedule } from "@/lib/pdfParser"
import { useScheduleStore } from "@/store/useScheduleStore"
import { cn } from "@/lib/utils"

export function UploadDropzone() {
  const addCourses = useScheduleStore((s) => s.addCourses)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState<number | null>(null)

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0]
      if (!file) return
      setLoading(true)
      setError(null)
      setCount(null)
      try {
        const courses = await parsePdfSchedule(file)
        if (courses.length === 0) {
          setError("未能从 PDF 解析出课程，请确认是标准课表布局，或改用 CSV/手动导入。")
        } else {
          addCourses(courses)
          setCount(courses.length)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "解析失败")
      } finally {
        setLoading(false)
      }
    },
    [addCourses]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
    disabled: loading,
  })

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        {...getRootProps()}
        className={cn(
          "flex h-56 w-full max-w-md cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          isDragActive
            ? "border-primary bg-accent"
            : "border-border hover:border-primary/50"
        )}
      >
        <input {...getInputProps()} />
        {loading ? (
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        ) : (
          <FileUp className="size-8 text-muted-foreground" />
        )}
        <p className="text-sm font-medium">
          {loading ? "正在解析 PDF…" : "拖拽 PDF 课表到此处，或点击选择文件"}
        </p>
        <p className="text-xs text-muted-foreground">
          解析全程在浏览器本地完成，数据不会上传
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {count != null && (
        <p className="text-sm text-green-600">已导入 {count} 门课程</p>
      )}
    </div>
  )
}
