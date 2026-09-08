import { useState } from "react"
import { Trash2 } from "lucide-react"
import { useScheduleStore } from "@/store/useScheduleStore"
import { DAYS, DAY_LABELS, DEFAULT_TOTAL_WEEKS } from "@/lib/constants"
import { computeCurrentWeek } from "@/lib/scheduleUtils"
import type { DayOfWeek, Holiday } from "@/types/course"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const semester = useScheduleStore((s) => s.semester)
  const setSemester = useScheduleStore((s) => s.setSemester)
  const currentWeek = useScheduleStore((s) => s.currentWeek)
  const setCurrentWeek = useScheduleStore((s) => s.setCurrentWeek)

  const [startDate, setStartDate] = useState(semester.startDate)
  const [totalWeeks, setTotalWeeks] = useState(semester.totalWeeks)
  const [holidays, setHolidays] = useState<Holiday[]>(semester.holidays)
  const [holidayWeek, setHolidayWeek] = useState(1)
  const [holidayDays, setHolidayDays] = useState<DayOfWeek[]>([])

  const thisWeek = computeCurrentWeek({ ...semester, startDate })

  function save() {
    setSemester({ startDate, totalWeeks, holidays })
    setCurrentWeek(Math.min(Math.max(currentWeek, 1), totalWeeks))
    onOpenChange(false)
  }

  function addHoliday() {
    if (holidayDays.length === 0) return
    setHolidays((prev) => [
      ...prev,
      { id: String(Date.now()), week: holidayWeek, days: holidayDays },
    ])
    setHolidayDays([])
  }

  function toggleDay(d: DayOfWeek) {
    setHolidayDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>学期设置</DialogTitle>
          <DialogDescription>设置学期开始日期、总周数与节假日安排</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>学期开始日期（第 1 周周一）</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>总教学周数</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={totalWeeks}
                onChange={(e) =>
                  setTotalWeeks(Number(e.target.value) || DEFAULT_TOTAL_WEEKS)
                }
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            按当前日期计算，本周为第 {thisWeek} 周
          </p>

          <Separator />

          <div>
            <h4 className="mb-2 text-sm font-medium">节假日 / 调休</h4>
            <div className="space-y-2">
              {holidays.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span>
                    第 {h.week} 周 · {h.days.map((d) => DAY_LABELS[d]).join("、")}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setHolidays((prev) => prev.filter((x) => x.id !== h.id))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              {holidays.length === 0 && (
                <p className="text-sm text-muted-foreground">暂无节假日安排</p>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Input
                type="number"
                min={1}
                value={holidayWeek}
                onChange={(e) => setHolidayWeek(Number(e.target.value) || 1)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">周</span>
              <div className="flex gap-1">
                {DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={cn(
                      "h-7 w-7 rounded-md border text-xs transition-colors",
                      holidayDays.includes(d)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                  >
                    {DAY_LABELS[d].replace("周", "")}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addHoliday}
              >
                添加
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={save}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
