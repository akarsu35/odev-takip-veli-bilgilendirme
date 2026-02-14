import { create } from 'zustand'
import { Student, Homework, HomeworkStatus } from '@/types'

type Tab =
  | 'check'
  | 'homework'
  | 'students'
  | 'history'
  | 'messages'
  | 'settings'

interface AppState {
  activeTab: Tab
  setActiveTab: (tab: Tab) => void

  students: Student[]
  homeworks: Homework[]
  setStudents: (students: Student[]) => void
  setHomeworks: (homeworks: Homework[]) => void

  addStudent: (student: Student) => void
  updateStudent: (student: Student) => void
  deleteStudent: (id: string) => void

  addHomework: (homework: Homework) => void
  updateHomework: (homework: Homework) => void
  deleteHomework: (id: string) => void

  updateSubmission: (
    hwId: string,
    studentId: string,
    status: HomeworkStatus,
  ) => void
  markAsNotified: (hwId: string, studentId: string) => void
}

export const useStore = create<AppState>((set) => ({
  activeTab: 'check',
  setActiveTab: (tab) => set({ activeTab: tab }),

  students: [],
  homeworks: [],
  setStudents: (students) => set({ students }),
  setHomeworks: (homeworks) => set({ homeworks }),

  addStudent: (student) =>
    set((state) => ({ students: [...state.students, student] })),
  updateStudent: (updatedStudent) =>
    set((state) => ({
      students: state.students.map((s) =>
        s.id === updatedStudent.id ? updatedStudent : s,
      ),
    })),
  deleteStudent: (id) =>
    set((state) => ({ students: state.students.filter((s) => s.id !== id) })),

  addHomework: (homework) =>
    set((state) => ({ homeworks: [homework, ...state.homeworks] })),
  updateHomework: (updatedHomework) =>
    set((state) => ({
      homeworks: state.homeworks.map((h) =>
        h.id === updatedHomework.id
          ? {
              ...updatedHomework,
              submissions: h.submissions,
              notifiedStudents: h.notifiedStudents,
            }
          : h,
      ),
    })),
  deleteHomework: (id) =>
    set((state) => ({ homeworks: state.homeworks.filter((h) => h.id !== id) })),

  updateSubmission: (hwId, studentId, status) =>
    set((state) => ({
      homeworks: state.homeworks.map((hw) =>
        hw.id === hwId
          ? { ...hw, submissions: { ...hw.submissions, [studentId]: status } }
          : hw,
      ),
    })),

  markAsNotified: (hwId, studentId) =>
    set((state) => ({
      homeworks: state.homeworks.map((hw) =>
        hw.id === hwId
          ? {
              ...hw,
              notifiedStudents: {
                ...(hw.notifiedStudents || {}),
                [studentId]: true,
              },
            }
          : hw,
      ),
    })),
}))
