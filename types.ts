export interface Student {
  id: string
  name: string
  parentName: string
  parentPhone: string
  className: string // Örn: "8/A", "6/B"
}

export enum HomeworkStatus {
  PENDING = 'PENDING',
  DONE = 'DONE',
  MISSING = 'MISSING',
  INCOMPLETE = 'INCOMPLETE',
  ABSENT = 'ABSENT',
}

export interface Homework {
  id: string
  title: string
  description: string
  assignedDate: string
  dueDate: string
  targetClasses: string[] // Bu ödev hangi sınıflar için?
  targetStudentIds?: string[] // Belirli öğrenciler için mi?
  submissions: Record<string, HomeworkStatus>
  notifiedStudents?: Record<string, boolean>
}

export interface AppState {
  students: Student[]
  homeworks: Homework[]
}
