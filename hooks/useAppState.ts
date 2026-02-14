import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@/services/db'
import { useStore } from '@/store/useStore'
import { useEffect, useState, useRef } from 'react'

export const APP_STATE_KEY = ['appState']

export function useSyncState() {
  const { setStudents, setHomeworks, students, homeworks } = useStore()

  const [isInitialized, setIsInitialized] = useState(false)
  const isInitialLoad = useRef(true)

  // 1. Fetch State
  const { data, isLoading, error } = useQuery({
    queryKey: APP_STATE_KEY,
    queryFn: () => db.loadState(),
    staleTime: Infinity, // Only fetch once on mount, then rely on local mutations
  })

  // 2. Load into Store (Once)
  useEffect(() => {
    if (data && isInitialLoad.current) {
      // Basic migration logic if needed (similar to old page.tsx)
      const migratedHomeworks = (data.homeworks || []).map((hw: any) => {
        if (hw.targetClass && !hw.targetClasses) {
          const { targetClass, ...rest } = hw
          return { ...rest, targetClasses: [targetClass] }
        }
        return hw
      })

      setStudents(data.students || [])
      setHomeworks(migratedHomeworks)
      setIsInitialized(true)
      isInitialLoad.current = false
    }
  }, [data, setStudents, setHomeworks])

  // 3. Auto-Save Logic
  // We debounce the save operation
  useEffect(() => {
    if (!isInitialized) return

    const timeoutId = setTimeout(() => {
      // Only save if we have data (prevent saving empty state over existing data on rare race conditions)
      if (students.length > 0 || homeworks.length > 0) {
        db.saveState({ students, homeworks }).catch((err) => {
          console.error('Auto-save failed:', err)
        })
      }
    }, 2000)

    return () => clearTimeout(timeoutId)
  }, [students, homeworks, isInitialized])

  return { isLoading, isInitialized, error }
}
