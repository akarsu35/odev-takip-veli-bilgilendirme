import { Student, Homework, AppState, HomeworkStatus } from '@/types'
import { getApiUrl } from './api-utils'

const STORAGE_KEY = 'odev_takip_v2'

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

export const db = {
  async loadState(): Promise<{ data: AppState; source: 'server' | 'local' }> {
    await delay(300)

    // If running in browser, prefer the local server API
    if (typeof window !== 'undefined') {
      try {
        const baseUrl = getApiUrl()
        console.log(`db.loadState: fetching from ${baseUrl}/api/state`)

        const res = await fetch(`${baseUrl}/api/state`).catch((err) => {
          console.error('db.loadState: fetch network error', err)
          throw new Error(
            'Ağ hatası: Sunucuya ulaşılamıyor. Lütfen internet bağlantınızı kontrol edin.',
          )
        })

        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = '/login'
            throw new Error('Oturum süresi doldu')
          }
          let errorMsg = `Sunucu Hatası (${res.status})`
          try {
            const errorJson = await res.json()
            if (errorJson.error) {
              errorMsg += `: ${errorJson.error}`
            }
          } catch (e) {
            errorMsg += ': Veriler yüklenemedi (JSON parse hatası)'
          }
          console.error(`db.loadState: API error ${res.status}`, errorMsg)
          throw new Error(errorMsg)
        }

        const state = await res.json()
        return {
          data: {
            students: state.students || [],
            homeworks: state.homeworks || [],
          },
          source: 'server',
        }
      } catch (e) {
        console.warn('Load failed, falling back to localStorage', e)
        const data = localStorage.getItem(STORAGE_KEY)
        if (!data)
          return {
            data: { students: [], homeworks: [] },
            source: 'local',
          }
        return { data: JSON.parse(data), source: 'local' }
      }
    }

    return { data: { students: [], homeworks: [] }, source: 'local' }
  },

  async saveState(state: AppState): Promise<void> {
    if (typeof window !== 'undefined') {
      // Local storage backup
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))

      try {
        const baseUrl = getApiUrl()
        const res = await fetch(`${baseUrl}/api/state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state),
        })
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          console.error(`db.saveState: API error ${res.status}`, errorData)
        } else {
          // Check for partial success (207) or soft errors in body
          const data = await res.json().catch(() => ({}))
          if (res.status === 207 || data.ok === false) {
            console.warn('db.saveState: Completed with errors', data.errors)
          } else {
            console.log('db.saveState: success')
          }
        }
      } catch (e) {
        console.error('Remote sync failed:', e)
      }
    }
  },

  async updateSubmission(
    homeworkId: string,
    studentId: string,
    status: HomeworkStatus,
    isNotified?: boolean,
  ): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        const baseUrl = getApiUrl()
        let retries = 3

        while (retries > 0) {
          const res = await fetch(
            `${baseUrl}/api/homework/${homeworkId}/submission`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ studentId, status, isNotified }),
            },
          )

          if (res.ok) return // Success

          if (res.status === 404 && retries > 1) {
            console.warn(
              `Homework not found (${homeworkId}), retrying in 1s...`,
            )
            await delay(1000)
            retries--
            continue
          }

          const errorData = await res.json().catch(() => ({}))
          console.error(
            `db.updateSubmission: API error ${res.status}`,
            errorData,
          )
          throw new Error('Update failed')
        }
      } catch (e) {
        console.error('Remote submission update failed:', e)
        throw e // Re-throw to handle in store
      }
    }
  },

  async createHomework(homework: Homework): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        const baseUrl = getApiUrl()
        const res = await fetch(`${baseUrl}/api/homework`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...homework,
            // Ensure dates are strings for JSON transport if they aren't already
            assignedDate: homework.assignedDate,
            dueDate: homework.dueDate,
          }),
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          console.error(`db.createHomework: API error ${res.status}`, errorData)
          throw new Error('Homework creation failed')
        }
      } catch (e) {
        console.error('Remote homework creation failed:', e)
        throw e
      }
    }
  },

  async deleteHomework(id: string): Promise<void> {
    if (typeof window !== 'undefined') {
      const baseUrl = getApiUrl()
      await fetch(`${baseUrl}/api/homework?id=${id}`, { method: 'DELETE' })
    }
  },

  async updateHomework(homework: Homework): Promise<void> {
    if (typeof window !== 'undefined') {
      const baseUrl = getApiUrl()
      await fetch(`${baseUrl}/api/homework`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(homework),
      })
    }
  },

  async addStudent(student: Student): Promise<void> {
    if (typeof window !== 'undefined') {
      const baseUrl = getApiUrl()
      await fetch(`${baseUrl}/api/student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(student),
      })
    }
  },

  async updateStudent(student: Student): Promise<void> {
    if (typeof window !== 'undefined') {
      const baseUrl = getApiUrl()
      await fetch(`${baseUrl}/api/student`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(student),
      })
    }
  },

  async deleteStudent(id: string): Promise<void> {
    if (typeof window !== 'undefined') {
      const baseUrl = getApiUrl()
      await fetch(`${baseUrl}/api/student?id=${id}`, { method: 'DELETE' })
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
