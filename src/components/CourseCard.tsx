import type { Course } from "@/types/course"
import { getCourseColor } from "@/lib/constants"
import { cn } from "@/lib/utils"

export function CourseCard({
  course,
  onClick,
}: {
  course: Course
  onClick: () => void
}) {
  const c = getCourseColor(course.name)
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}
      className={cn(
        "flex h-full w-full flex-col items-start justify-start overflow-hidden rounded-md border px-1.5 py-1 text-left text-xs shadow-sm transition-all hover:shadow-md hover:brightness-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <span className="line-clamp-2 font-semibold leading-tight">
        {course.name}
      </span>
      {course.location && (
        <span className="mt-0.5 line-clamp-1 opacity-80">{course.location}</span>
      )}
      {course.teacher && (
        <span className="line-clamp-1 opacity-70">{course.teacher}</span>
      )}
    </button>
  )
}
