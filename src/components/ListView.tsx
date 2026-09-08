import { useScheduleStore } from "@/store/useScheduleStore"
import { DAYS, DAY_LABELS } from "@/lib/constants"
import {
  formatPeriodLabel,
  formatWeekRange,
  isCourseActiveInWeek,
} from "@/lib/scheduleUtils"

export function ListView() {
  const courses = useScheduleStore((s) => s.courses)
  const currentWeek = useScheduleStore((s) => s.currentWeek)
  const setSelectedCourseId = useScheduleStore((s) => s.setSelectedCourseId)

  const active = courses
    .filter((c) => isCourseActiveInWeek(c, currentWeek))
    .sort(
      (a, b) =>
        a.dayOfWeek - b.dayOfWeek || a.startPeriod - b.startPeriod
    )

  return (
    <div className="space-y-6">
      {DAYS.map((day) => {
        const dayCourses = active.filter((c) => c.dayOfWeek === day)
        if (dayCourses.length === 0) return null
        return (
          <div key={day}>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
              {DAY_LABELS[day]}
            </h3>
            <div className="space-y-2">
              {dayCourses.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCourseId(c.id)}
                  className="flex w-full items-center gap-4 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                >
                  <span className="w-20 shrink-0 text-sm text-muted-foreground">
                    {formatPeriodLabel(c.startPeriod, c.endPeriod)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {c.name}
                  </span>
                  <span className="hidden text-sm text-muted-foreground sm:block">
                    {c.teacher}
                  </span>
                  <span className="hidden text-sm text-muted-foreground md:block">
                    {c.location}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatWeekRange(c.startWeek, c.endWeek, c.weekType)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
