import { Student, Homework, AppState, HomeworkStatus } from '../types'

const STORAGE_KEY = 'odev_takip_v2'

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

export const db = {
  async loadState(): Promise<AppState> {
    await delay(300)

    // If running in browser, prefer the local server API which writes
    // to the database via Prisma. If that fails, fall back to
    // localStorage.
    if (typeof window !== 'undefined') {
      try {
        const getApiUrl = () => {
          if (process.env.REACT_APP_API_URL)
            return process.env.REACT_APP_API_URL
          const host = window.location.hostname
          if (
            host === 'localhost' ||
            host === '127.0.0.1' ||
            host.startsWith('192.168.') ||
            host.startsWith('10.')
          ) {
            return `http://${host}:4000`
          }
          return '' // Relative path for production
        }
        const baseUrl = getApiUrl()
        const res = await fetch(`${baseUrl}/api/state`)
        if (res.ok) return await res.json()
      } catch (e) {
        console.warn(
          'Failed to load state from local server, falling back to localStorage',
          e
        )
      }
    }

    // If running server-side, or browser fallback, try direct Prisma
    if (typeof window === 'undefined') {
      try {
        const { prisma } = await import('./prisma')
        const [students, homeworks] = await Promise.all([
          prisma.student.findMany(),
          prisma.homework.findMany({ include: { submissions: true } }),
        ])

        if (students.length > 0) {
          const convertedHomeworks = homeworks.map((hw) => ({
            id: hw.id,
            title: hw.title,
            description: hw.description,
            assignedDate: hw.assignedDate.toISOString(),
            dueDate: hw.dueDate.toISOString(),
            targetClasses: hw.targetClasses,
            targetStudentIds: hw.targetStudents,
            submissions: hw.submissions.reduce((acc, sub) => {
              acc[sub.studentId] = sub.status as HomeworkStatus
              return acc
            }, {} as Record<string, HomeworkStatus>),
            notifiedStudents: hw.submissions.reduce((acc, sub) => {
              if (sub.isNotified) acc[sub.studentId] = true
              return acc
            }, {} as Record<string, boolean>),
          }))

          return {
            students: students.map((s) => ({
              id: s.id,
              name: s.name,
              parentName: s.parentName,
              parentPhone: s.parentPhone,
              className: s.className,
            })),
            homeworks: convertedHomeworks,
          }
        }
      } catch (e) {
        console.warn('Prisma load failed, falling back to localStorage', e)
      }
    }

    // Fallback: localStorage
    const data =
      typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (!data) return { students: [], homeworks: [] }
    return JSON.parse(data)
  },

  async saveState(state: AppState): Promise<void> {
    // If in browser, try POSTing to local server API
    if (typeof window !== 'undefined') {
      console.log('db.saveState: attempting to sync state to server', {
        students: state.students?.length,
        homeworks: state.homeworks?.length,
      })
      try {
        const getApiUrl = () => {
          if (process.env.REACT_APP_API_URL)
            return process.env.REACT_APP_API_URL
          const host = window.location.hostname
          if (
            host === 'localhost' ||
            host === '127.0.0.1' ||
            host.startsWith('192.168.') ||
            host.startsWith('10.')
          ) {
            return `http://${host}:4000`
          }
          return '' // Relative path for production
        }
        const baseUrl = getApiUrl()
        const res = await fetch(`${baseUrl}/api/state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state),
        })
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(
            errorData.error || `Server responded with ${res.status}`
          )
        }
        console.log('db.saveState: success')
      } catch (e) {
        console.error('Remote sync failed:', e)
        // Only alert if we're not just failing to find the local server during dev
        if (
          typeof window !== 'undefined' &&
          window.location.hostname !== 'localhost'
        ) {
          // Maybe don't spam alert, but log is good.
        }
      }
    } else {
      // server-side: write directly with Prisma
      try {
        const { prisma } = await import('./prisma')
        await prisma.$transaction(async (tx) => {
          await tx.submission.deleteMany()
          await tx.homework.deleteMany()
          await tx.student.deleteMany()

          for (const student of state.students) {
            await tx.student.create({
              data: {
                id: student.id,
                name: student.name,
                parentName: student.parentName,
                parentPhone: student.parentPhone,
                className: student.className,
              },
            })
          }

          for (const hw of state.homeworks) {
            const homework = await tx.homework.create({
              data: {
                id: hw.id,
                title: hw.title,
                description: hw.description,
                assignedDate: new Date(hw.assignedDate),
                dueDate: new Date(hw.dueDate),
                targetClasses: hw.targetClasses,
                targetStudents: hw.targetStudentIds || [],
              },
            })

            for (const [studentId, status] of Object.entries(
              hw.submissions || {}
            )) {
              const notified = hw.notifiedStudents?.[studentId] || false
              await tx.submission.create({
                data: {
                  studentId,
                  homeworkId: homework.id,
                  status,
                  isNotified: notified,
                },
              })
            }
          }
        })
      } catch (e) {
        console.error('Prisma save failed:', e)
      }
    }

    // Always persist to localStorage when in browser
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }
  },

  async exportData(): Promise<string> {
    const data =
      (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) ||
      '{"students":[], "homeworks":[]}'
    const blob = new Blob([data], { type: 'application/json' })
    return URL.createObjectURL(blob)
  },

  async importData(jsonString: string): Promise<void> {
    try {
      const parsed = JSON.parse(jsonString)
      if (Array.isArray(parsed.students) && Array.isArray(parsed.homeworks)) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, jsonString)
          window.location.reload()
        }
      } else {
        throw new Error('Geçersiz dosya formatı')
      }
    } catch (e) {
      alert('Hata: ' + (e as Error).message)
    }
  },
}
