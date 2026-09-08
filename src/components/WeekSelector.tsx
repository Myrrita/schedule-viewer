import { useScheduleStore } from "@/store/useScheduleStore"
import { computeCurrentWeek } from "@/lib/scheduleUtils"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function WeekSelector() {
  const semester = useScheduleStore((s) => s.semester)
  const currentWeek = useScheduleStore((s) => s.currentWeek)
  const setCurrentWeek = useScheduleStore((s) => s.setCurrentWeek)
  const thisWeek = computeCurrentWeek(semester)

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentWeek(thisWeek)}
        className="shrink-0"
      >
        本周
      </Button>
      {Array.from({ length: semester.totalWeeks }, (_, i) => i + 1).map((w) => (
        <button
          key={w}
          type="button"
          onClick={() => setCurrentWeek(w)}
          className={cn(
            "h-8 min-w-8 shrink-0 rounded-md border px-2 text-sm transition-colors",
            w === currentWeek
              ? "border-primary bg-primary text-primary-foreground"
              : "hover:bg-accent"
          )}
        >
          {w}
        </button>
      ))}
    </div>
  )
}
