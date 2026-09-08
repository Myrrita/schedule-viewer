import { Pencil, Trash2, X } from "lucide-react"
import { useScheduleStore } from "@/store/useScheduleStore"
import { DAY_LABELS, getCourseColor } from "@/lib/constants"
import {
  formatPeriodLabel,
  formatWeekRange,
  periodTimeRange,
} from "@/lib/scheduleUtils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export function CourseDetailDrawer() {
  const courses = useScheduleStore((s) => s.courses)
  const selectedCourseId = useScheduleStore((s) => s.selectedCourseId)
  const setSelectedCourseId = useScheduleStore((s) => s.setSelectedCourseId)
  const removeCourse = useScheduleStore((s) => s.removeCourse)
  const openCourseForm = useScheduleStore((s) => s.openCourseForm)

  const course = courses.find((c) => c.id === selectedCourseId) ?? null
  const color = course ? getCourseColor(course.name) : null

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/20 transition-opacity",
          course ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setSelectedCourseId(null)}
      />
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-80 max-w-[90vw] flex-col border-l bg-background shadow-xl transition-transform duration-200",
          course ? "translate-x-0" : "translate-x-full"
        )}
      >
        {course && color && (
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-2 border-b p-4">
              <div className="flex items-center gap-2">
                <span
                  className="h-4 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color.bg, border: `1px solid ${color.border}` }}
                />
                <h2 className="text-base font-semibold leading-tight">
                  {course.name}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedCourseId(null)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{DAY_LABELS[course.dayOfWeek]}</Badge>
                <Badge variant="outline">
                  {formatPeriodLabel(course.startPeriod, course.endPeriod)}
                </Badge>
                <Badge variant="outline">
                  {formatWeekRange(course.startWeek, course.endWeek, course.weekType)}
                </Badge>
              </div>

              <Separator />

              <dl className="space-y-3 text-sm">
                <DetailRow label="教师" value={course.teacher} />
                <DetailRow label="地点" value={course.location} />
                <DetailRow
                  label="周次"
                  value={`${course.startWeek}-${course.endWeek} 周`}
                />
                <DetailRow
                  label="节次"
                  value={`${formatPeriodLabel(course.startPeriod, course.endPeriod)}${periodTimeRange(course.startPeriod, course.endPeriod) ? `（${periodTimeRange(course.startPeriod, course.endPeriod)}）` : ""}`}
                />
              </dl>
            </div>

            <div className="flex gap-2 border-t p-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => openCourseForm(course.id)}
              >
                <Pencil className="size-4" />
                编辑
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  removeCourse(course.id)
                  setSelectedCourseId(null)
                }}
              >
                <Trash2 className="size-4" />
                删除
              </Button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right">{value || "—"}</dd>
    </div>
  )
}
