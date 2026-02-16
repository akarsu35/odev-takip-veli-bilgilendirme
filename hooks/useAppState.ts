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
    staleTime: Infinity,
  })

  // Track if state has been modified by user
  const isDirty = useRef(false)
  const previousStudentsLen = useRef(0)
  const previousHomeworksLen = useRef(0)

  // Detect changes
  useEffect(() => {
    if (isInitialized) {
      if (
        students.length !== previousStudentsLen.current ||
        homeworks.length !== previousHomeworksLen.current
      ) {
        isDirty.current = true
      }
      // Shallow check for content changes could be added here for more precision
    }
    previousStudentsLen.current = students.length
    previousHomeworksLen.current = homeworks.length
  }, [students, homeworks, isInitialized])

  // 2. Load into Store (Once)
  useEffect(() => {
    if (data && isInitialLoad.current) {
      // Basic migration logic
      const migratedHomeworks = (data.data.homeworks || []).map((hw: any) => {
        if (hw.targetClass && !hw.targetClasses) {
          const { targetClass, ...rest } = hw
          return { ...rest, targetClasses: [targetClass] }
        }
        return hw
      })

      setStudents(data.data.students || [])
      setHomeworks(migratedHomeworks)
      setIsInitialized(true)

      // If loaded from local storage, mark as NOT dirty to prevent overwriting server
      // unless user explicitly changes something.
      if (data.source === 'local') {
        console.warn(
          'Loaded from local storage - Auto-save disabled until change detected',
        )
      }

      isInitialLoad.current = false
    }
  }, [data, setStudents, setHomeworks])

  // 3. Auto-Save Logic - REMOVED for performance
  // We now use granular updates for all actions (add/update/delete student/homework + submissions)
  // This prevents the heavy full-state save on every small change.
  /*
  useEffect(() => {
    if (!isInitialized) return

    const timeoutId = setTimeout(() => {
      const shouldSave =
        (data?.source === 'server' || isDirty.current) &&
        (students.length > 0 || homeworks.length > 0)

      if (shouldSave) {
        // db.saveState({ students, homeworks })
      }
    }, 2000)

    return () => clearTimeout(timeoutId)
  }, [students, homeworks, isInitialized, data?.source])
  */

  return { isLoading, isInitialized, error }
}
