import { useState, type FormEvent } from "react"
import { useScheduleStore } from "@/store/useScheduleStore"
import { DAYS, DAY_LABELS } from "@/lib/constants"
import type { DayOfWeek, WeekType } from "@/types/course"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function CourseFormDialog() {
  const open = useScheduleStore((s) => s.courseFormOpen)
  const editingId = useScheduleStore((s) => s.editingCourseId)
  const closeCourseForm = useScheduleStore((s) => s.closeCourseForm)

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) closeCourseForm()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <CourseFormFields key={editingId ?? "new"} onClose={closeCourseForm} />
      </DialogContent>
    </Dialog>
  )
}

function CourseFormFields({ onClose }: { onClose: () => void }) {
  const courses = useScheduleStore((s) => s.courses)
  const editingId = useScheduleStore((s) => s.editingCourseId)
  const addCourse = useScheduleStore((s) => s.addCourse)
  const updateCourse = useScheduleStore((s) => s.updateCourse)

  const editing = editingId ? courses.find((c) => c.id === editingId) : null

  const [name, setName] = useState(editing?.name ?? "")
  const [teacher, setTeacher] = useState(editing?.teacher ?? "")
  const [location, setLocation] = useState(editing?.location ?? "")
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(editing?.dayOfWeek ?? 1)
  const [startWeek, setStartWeek] = useState(editing?.startWeek ?? 1)
  const [endWeek, setEndWeek] = useState(editing?.endWeek ?? 16)
  const [weekType, setWeekType] = useState<WeekType>(editing?.weekType ?? "all")
  const [startPeriod, setStartPeriod] = useState(editing?.startPeriod ?? 1)
  const [endPeriod, setEndPeriod] = useState(editing?.endPeriod ?? 2)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const payload = {
      name: name.trim(),
      teacher: teacher.trim() || undefined,
      location: location.trim() || undefined,
      dayOfWeek,
      startWeek,
      endWeek: Math.max(endWeek, startWeek),
      weekType,
      startPeriod,
      endPeriod: Math.max(endPeriod, startPeriod),
    }
    if (editing) {
      updateCourse({ ...editing, ...payload })
    } else {
      addCourse(payload)
    }
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{editing ? "编辑课程" : "添加课程"}</DialogTitle>
        <DialogDescription>填写课程信息，课程名称为必填项</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-2">
        <div className="grid gap-2">
          <Label htmlFor="name">课程名称 *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如：高等数学"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="teacher">教师</Label>
            <Input
              id="teacher"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location">地点</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>星期</Label>
            <Select
              value={String(dayOfWeek)}
              onValueChange={(v) => setDayOfWeek(Number(v) as DayOfWeek)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {DAY_LABELS[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>周类型</Label>
            <Select
              value={weekType}
              onValueChange={(v) => setWeekType(v as WeekType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">每周</SelectItem>
                <SelectItem value="single">单周</SelectItem>
                <SelectItem value="double">双周</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="sw">开始周</Label>
            <Input
              id="sw"
              type="number"
              min={1}
              value={startWeek}
              onChange={(e) => setStartWeek(Number(e.target.value))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ew">结束周</Label>
            <Input
              id="ew"
              type="number"
              min={1}
              value={endWeek}
              onChange={(e) => setEndWeek(Number(e.target.value))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sp">开始节</Label>
            <Input
              id="sp"
              type="number"
              min={1}
              value={startPeriod}
              onChange={(e) => setStartPeriod(Number(e.target.value))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ep">结束节</Label>
            <Input
              id="ep"
              type="number"
              min={1}
              value={endPeriod}
              onChange={(e) => setEndPeriod(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button type="submit">保存</Button>
      </DialogFooter>
    </form>
  )
}
