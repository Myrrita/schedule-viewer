import { useMemo } from "react"
import { useScheduleStore } from "@/store/useScheduleStore"
import { DAYS, DAY_LABELS, MIN_PERIODS, PERIOD_TIMES } from "@/lib/constants"
import { dayDateLabel, isCourseActiveInWeek } from "@/lib/scheduleUtils"
import { CourseCard } from "@/components/CourseCard"
import { cn } from "@/lib/utils"

const HEADER_H = 40
const PERIOD_H = 64
const TIME_W = 76

export function WeekView() {
  const courses = useScheduleStore((s) => s.courses)
  const currentWeek = useScheduleStore((s) => s.currentWeek)
  const semester = useScheduleStore((s) => s.semester)
  const setSelectedCourseId = useScheduleStore((s) => s.setSelectedCourseId)

  const maxPeriods = useMemo(() => {
    const max = courses.reduce((m, c) => Math.max(m, c.endPeriod), 0)
    return Math.max(max, MIN_PERIODS)
  }, [courses])

  return (
    <div className="overflow-x-auto rounded-lg border">
      <div className="min-w-[720px]">
        {/* 星期表头 */}
        <div className="flex border-b bg-muted/40" style={{ height: HEADER_H }}>
          <div className="shrink-0" style={{ width: TIME_W }} />
          {DAYS.map((d) => (
            <div
              key={d}
              className={cn(
                "flex flex-1 flex-col items-center justify-center border-l",
                d >= 6 && "text-muted-foreground"
              )}
            >
              <span className="text-sm font-medium leading-tight">
                {DAY_LABELS[d]}
              </span>
              <span className="text-[11px] leading-tight text-muted-foreground">
                {dayDateLabel(semester, currentWeek, d)}
              </span>
            </div>
          ))}
        </div>

        <div className="flex">
          {/* 节次列 */}
          <div className="shrink-0" style={{ width: TIME_W }}>
            {Array.from({ length: maxPeriods }, (_, i) => (
              <div
                key={i}
                style={{ height: PERIOD_H }}
                className="border-b px-1 pt-1 text-right"
              >
                <div className="text-xs font-medium leading-tight">{i + 1}</div>
                <div className="text-[10px] leading-tight text-muted-foreground">
                  {PERIOD_TIMES[i] ?? ""}
                </div>
              </div>
            ))}
          </div>

          {/* 每天一列 */}
          <div className="grid flex-1 grid-cols-7">
            {DAYS.map((day) => {
              const dayCourses = courses
                .filter(
                  (c) =>
                    c.dayOfWeek === day && isCourseActiveInWeek(c, currentWeek)
                )
                .sort((a, b) => a.startPeriod - b.startPeriod)
              return (
                <div
                  key={day}
                  className={cn(
                    "relative border-l",
                    day >= 6 && "bg-muted/20"
                  )}
                  style={{ height: maxPeriods * PERIOD_H }}
                >
                  {Array.from({ length: maxPeriods }, (_, i) => (
                    <div
                      key={i}
                      className="border-b"
                      style={{ height: PERIOD_H }}
                    />
                  ))}
                  {dayCourses.map((course) => {
                    const top = (course.startPeriod - 1) * PERIOD_H + 2
                    const height =
                      (course.endPeriod - course.startPeriod + 1) * PERIOD_H - 4
                    return (
                      <div
                        key={course.id}
                        className="absolute left-1 right-1"
                        style={{ top, height }}
                      >
                        <CourseCard
                          course={course}
                          onClick={() => setSelectedCourseId(course.id)}
                        />
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
