import { create } from "zustand"
import { persist } from "zustand/middleware"
import type {
  Course,
  SemesterConfig,
  ViewMode,
} from "@/types/course"
import { DEFAULT_TOTAL_WEEKS } from "@/lib/constants"
import { formatDate, getMonday } from "@/lib/scheduleUtils"

export interface ScheduleState {
  courses: Course[]
  semester: SemesterConfig
  currentWeek: number
  selectedCourseId: string | null
  viewMode: ViewMode
  courseFormOpen: boolean
  editingCourseId: string | null

  addCourse: (course: Omit<Course, "id">) => void
  addCourses: (courses: Omit<Course, "id">[]) => void
  updateCourse: (course: Course) => void
  removeCourse: (id: string) => void
  clearCourses: () => void

  setSemester: (config: Partial<SemesterConfig>) => void
  setCurrentWeek: (week: number) => void
  setSelectedCourseId: (id: string | null) => void
  setViewMode: (mode: ViewMode) => void
  openCourseForm: (editingId?: string | null) => void
  closeCourseForm: () => void
}

function defaultSemester(): SemesterConfig {
  return {
    startDate: formatDate(getMonday(new Date())),
    totalWeeks: DEFAULT_TOTAL_WEEKS,
    holidays: [],
  }
}

function genId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set) => ({
      courses: [],
      semester: defaultSemester(),
      currentWeek: 1,
      selectedCourseId: null,
      viewMode: "week",
      courseFormOpen: false,
      editingCourseId: null,

      addCourse: (course) =>
        set((state) => ({
          courses: [...state.courses, { ...course, id: genId() }],
        })),

      addCourses: (courses) =>
        set((state) => ({
          courses: [
            ...state.courses,
            ...courses.map((c) => ({ ...c, id: genId() })),
          ],
        })),

      updateCourse: (course) =>
        set((state) => ({
          courses: state.courses.map((c) => (c.id === course.id ? course : c)),
        })),

      removeCourse: (id) =>
        set((state) => ({
          courses: state.courses.filter((c) => c.id !== id),
          selectedCourseId:
            state.selectedCourseId === id ? null : state.selectedCourseId,
        })),

      clearCourses: () => set({ courses: [], selectedCourseId: null }),

      setSemester: (config) =>
        set((state) => ({
          semester: { ...state.semester, ...config },
        })),

      setCurrentWeek: (week) => set({ currentWeek: week }),
      setSelectedCourseId: (id) => set({ selectedCourseId: id }),
      setViewMode: (mode) => set({ viewMode: mode }),
      openCourseForm: (editingId = null) =>
        set({ courseFormOpen: true, editingCourseId: editingId }),
      closeCourseForm: () =>
        set({ courseFormOpen: false, editingCourseId: null }),
    }),
    { name: "schedule-viewer" }
  )
)
