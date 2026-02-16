import { create } from 'zustand'
import { Student, Homework, HomeworkStatus } from '@/types'
import { db } from '@/services/db'

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

  pendingOperations: Set<string>
  syncStatus: 'idle' | 'syncing' | 'error'
}

export const useStore = create<AppState>((set) => ({
  activeTab: 'check',
  setActiveTab: (tab) => set({ activeTab: tab }),

  students: [],
  homeworks: [],
  setStudents: (students) => set({ students }),
  setHomeworks: (homeworks) => set({ homeworks }),

  addStudent: (student) => {
    set((state) => ({ students: [...state.students, student] }))
    db.addStudent(student).catch((err) => {
      console.error('Failed to add student', err)
      // Todo: Rollback or notify
    })
  },
  updateStudent: (updatedStudent) => {
    set((state) => ({
      students: state.students.map((s) =>
        s.id === updatedStudent.id ? updatedStudent : s,
      ),
    }))
    db.updateStudent(updatedStudent).catch((err) => {
      console.error('Failed to update student', err)
    })
  },
  deleteStudent: (id) => {
    set((state) => ({ students: state.students.filter((s) => s.id !== id) }))
    db.deleteStudent(id).catch((err) => {
      console.error('Failed to delete student', err)
    })
  },

  pendingOperations: new Set(),
  syncStatus: 'idle',

  addHomework: (homework) => {
    set((state) => {
      const newState = {
        homeworks: [homework, ...state.homeworks],
        syncStatus: 'syncing' as const,
        pendingOperations: new Set(state.pendingOperations).add(
          `create-hw-${homework.id}`,
        ),
      }

      // Atomic creation
      db.createHomework(homework)
        .then(() => {
          set((s) => {
            const newPending = new Set(s.pendingOperations)
            newPending.delete(`create-hw-${homework.id}`)
            return {
              pendingOperations: newPending,
              syncStatus: newPending.size === 0 ? 'idle' : 'syncing',
            }
          })
        })
        .catch((err) => {
          console.error('Homework creation failed:', err)
          set((s) => {
            const newPending = new Set(s.pendingOperations)
            newPending.delete(`create-hw-${homework.id}`)
            // Revert optimistic add
            return {
              homeworks: s.homeworks.filter((h) => h.id !== homework.id),
              pendingOperations: newPending,
              syncStatus: 'error',
            }
          })
        })

      return newState
    })
  },

  updateHomework: (updatedHomework) => {
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
    }))
    db.updateHomework(updatedHomework).catch((err) => {
      console.error('Failed to update homework', err)
    })
  },
  deleteHomework: (id) => {
    set((state) => ({ homeworks: state.homeworks.filter((h) => h.id !== id) }))
    db.deleteHomework(id).catch((err) => {
      console.error('Failed to delete homework', err)
    })
  },

  updateSubmission: (hwId, studentId, status) => {
    const operationId = `sub-${hwId}-${studentId}`

    // 1. Optimistic Update & Set Pending
    set((state) => ({
      homeworks: state.homeworks.map((hw) =>
        hw.id === hwId
          ? { ...hw, submissions: { ...hw.submissions, [studentId]: status } }
          : hw,
      ),
      pendingOperations: new Set(state.pendingOperations).add(operationId),
      syncStatus: 'syncing',
    }))

    // 2. Persist to DB immediately
    if (!hwId) {
      console.error('Missing homeworkId for submission update')
      return
    }

    // Capture previous status for rollback if needed (simplification: we assume we can just re-fetch or use a snapshot,
    // but for now, if it fails, we simply mark error. A true rollback would require storing previous value.)
    // For this implementation, we will mark syncStatus as error.

    db.updateSubmission(hwId, studentId, status)
      .then(() => {
        set((state) => {
          const newPending = new Set(state.pendingOperations)
          newPending.delete(operationId)
          return {
            pendingOperations: newPending,
            syncStatus: newPending.size === 0 ? 'idle' : 'syncing',
          }
        })
        console.log('Submission updated successfully')
      })
      .catch((error) => {
        console.error('Failed to persist submission update:', error)
        set((state) => {
          const newPending = new Set(state.pendingOperations)
          newPending.delete(operationId)
          return {
            pendingOperations: newPending,
            syncStatus: 'error',
          }
        })
        // Todo: Consider alerting user or reverting UI
      })
  },

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
