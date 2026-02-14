'use client'

import React, { useState, useEffect } from 'react'
import { Homework, Student } from '@/types'
import { generateHomeworkAssignmentMessage } from '@/services/geminiService'

interface Props {
  isOpen: boolean
  homework: Homework | null
  students: Student[]
  userProfile?: {
    fullName: string | null
    schoolName: string | null
    subject: string | null
  } | null
  onClose: () => void
  onMarkNotified?: (studentId: string) => void
}

const BulkNotificationModal: React.FC<Props> = ({
  isOpen,
  homework,
  students,
  userProfile,
  onClose,
  onMarkNotified,
}) => {
  const [notifiedStudents, setNotifiedStudents] = useState<Set<string>>(
    new Set(),
  )
  const [sendingToStudent, setSendingToStudent] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Prevent SSR hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Load existing notification state when homework changes
  useEffect(() => {
    if (homework?.notifiedStudents) {
      const notified = Object.keys(homework.notifiedStudents).filter(
        (id) => homework.notifiedStudents![id],
      )
      setNotifiedStudents(new Set(notified))
    } else {
      setNotifiedStudents(new Set())
    }
  }, [homework?.id])

  if (!isOpen || !homework || !isMounted) return null

  // Filter students based on homework targets
  const targetStudents = students.filter((s) => {
    // If specific students are targeted, only show them
    if (homework.targetStudentIds && homework.targetStudentIds.length > 0) {
      return homework.targetStudentIds.includes(s.id)
    }
    // Otherwise show all students in target classes
    return homework.targetClasses.includes(s.className)
  })

  const handleNotifyStudent = async (student: Student) => {
    if (!homework) return

    setSendingToStudent(student.id)

    // Generate message
    const message = generateHomeworkAssignmentMessage(
      student.name,
      homework.title,
      homework.description,
      homework.assignedDate,
      homework.dueDate,
      userProfile?.schoolName || undefined,
      userProfile?.subject || undefined,
      userProfile?.fullName || undefined,
    )

    // Open WhatsApp
    const encodedMessage = encodeURIComponent(message)
    const phone = student.parentPhone.startsWith('9')
      ? student.parentPhone
      : `9${student.parentPhone}`
    const url = `https://wa.me/${phone}?text=${encodedMessage}`

    window.open(url, '_blank')

    // Mark as notified
    setNotifiedStudents((prev) => new Set([...prev, student.id]))
    if (onMarkNotified) {
      onMarkNotified(student.id)
    }

    setSendingToStudent(null)

    // Save to database
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: student.id,
          content: message,
          type: 'HOMEWORK',
          student: student,
        }),
      })
    } catch (error) {
      console.error('Failed to save message:', error)
    }
  }

  const notifiedCount = notifiedStudents.size

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white flex-shrink-0 relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">Ödev Bildirimi</h2>
              <p className="text-indigo-100 text-sm">{homework.title}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/30 p-2 rounded-lg transition-colors shadow-lg bg-white/10 flex-shrink-0"
              aria-label="Kapat"
            >
              <i className="fas fa-times text-2xl"></i>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Homework Details */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <i className="fas fa-calendar"></i>
              <span>
                Veriliş:{' '}
                {isMounted
                  ? new Date(homework.assignedDate).toLocaleDateString('tr-TR')
                  : homework.assignedDate.split('T')[0]}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <i className="fas fa-calendar-check"></i>
              <span>
                Kontrol:{' '}
                {isMounted
                  ? new Date(homework.dueDate).toLocaleDateString('tr-TR')
                  : homework.dueDate.split('T')[0]}
              </span>
            </div>
            {homework.description && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-sm text-slate-700">{homework.description}</p>
              </div>
            )}
          </div>

          {/* Progress Summary */}
          <div className="bg-indigo-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-indigo-900">
                Bildirim Durumu
              </span>
              <span className="text-sm font-bold text-indigo-600">
                {notifiedCount} / {targetStudents.length} bildirildi
              </span>
            </div>
            <div className="w-full bg-indigo-200 rounded-full h-2 mt-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(notifiedCount / targetStudents.length) * 100}%`,
                }}
              ></div>
            </div>
          </div>

          {/* Student List */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <i className="fas fa-users"></i>
              Öğrenciler ({targetStudents.length} kişi)
            </h3>
            <div className="space-y-2">
              {targetStudents.map((student) => {
                const isNotified = notifiedStudents.has(student.id)
                const isSending = sendingToStudent === student.id

                return (
                  <div
                    key={student.id}
                    className={`p-4 rounded-lg border-2 flex items-center justify-between transition-all ${
                      isNotified
                        ? 'bg-green-50 border-green-200'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-slate-800 flex items-center gap-2">
                        {student.name}
                        {isNotified && (
                          <i className="fas fa-check-circle text-green-600 text-sm"></i>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {student.className} - {student.parentName} (
                        {student.parentPhone})
                      </div>
                    </div>
                    <button
                      onClick={() => handleNotifyStudent(student)}
                      disabled={isNotified || isSending}
                      className={`ml-4 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
                        isNotified
                          ? 'bg-green-100 text-green-700 cursor-default'
                          : isSending
                            ? 'bg-slate-200 text-slate-500'
                            : 'bg-green-500 text-white hover:bg-green-600 shadow-md'
                      }`}
                    >
                      <i
                        className={`${
                          isNotified
                            ? 'fas fa-check'
                            : isSending
                              ? 'fas fa-spinner fa-spin'
                              : 'fab fa-whatsapp'
                        }`}
                      ></i>
                      {isNotified
                        ? 'Bildirildi'
                        : isSending
                          ? 'Açılıyor...'
                          : 'Bildir'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-6 flex gap-3 justify-end border-t flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 font-medium transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}

export default BulkNotificationModal
