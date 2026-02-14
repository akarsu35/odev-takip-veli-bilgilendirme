'use client'

import React, { useState, useEffect } from 'react'
import { Homework, Student } from '@/types'
import { generateHomeworkAssignmentMessage } from '@/services/geminiService'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

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
    if (homework.targetStudentIds && homework.targetStudentIds.length > 0) {
      return homework.targetStudentIds.includes(s.id)
    }
    return homework.targetClasses.includes(s.className)
  })

  const handleNotifyStudent = async (student: Student) => {
    if (!homework) return

    setSendingToStudent(student.id)

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

    const encodedMessage = encodeURIComponent(message)
    const phone = student.parentPhone.startsWith('9')
      ? student.parentPhone
      : `9${student.parentPhone}`
    const url = `https://wa.me/${phone}?text=${encodedMessage}`

    window.open(url, '_blank')

    setNotifiedStudents((prev) => new Set([...prev, student.id]))
    if (onMarkNotified) {
      onMarkNotified(student.id)
    }

    setSendingToStudent(null)

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
  const progress = (notifiedCount / targetStudents.length) * 100

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-500 border border-slate-100">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-8 text-white relative flex-shrink-0">
          <div className="flex justify-between items-start relative z-10">
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight leading-tight">
                Ödev Bildirimi
              </h2>
              <p className="text-indigo-100/80 font-bold text-xs uppercase tracking-widest">
                {homework.title}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full bg-white/10 hover:bg-white/20 text-white h-10 w-10 transition-all border border-white/10"
            >
              <i className="fas fa-times text-xl"></i>
            </Button>
          </div>
          {/* Decorative background circle */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        </div>

        {/* Scrolling Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto no-scrollbar">
          {/* Info Panels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
              <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <i className="fas fa-calendar-alt text-indigo-400"></i>
                <span>Tarihler</span>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-700 flex justify-between">
                  <span>Veriliş:</span>
                  <span className="text-slate-900">
                    {isMounted
                      ? new Date(homework.assignedDate).toLocaleDateString(
                          'tr-TR',
                        )
                      : homework.assignedDate.split('T')[0]}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-700 flex justify-between">
                  <span>Kontrol:</span>
                  <span className="text-indigo-600">
                    {isMounted
                      ? new Date(homework.dueDate).toLocaleDateString('tr-TR')
                      : homework.dueDate.split('T')[0]}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/50 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">
                <span>İlerleme Durumu</span>
                <span>%{Math.round(progress)}</span>
              </div>
              <div className="text-xl font-black text-indigo-900 mb-2">
                {notifiedCount} / {targetStudents.length}
              </div>
              <div className="w-full bg-indigo-100 rounded-full h-2.5 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>

          {homework.description && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Ödev Açıklaması
              </label>
              <p className="text-xs font-medium text-slate-600 leading-relaxed italic line-clamp-2">
                "{homework.description}"
              </p>
            </div>
          )}

          {/* Student Selection List */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
              <i className="fas fa-user-check text-indigo-400"></i>
              Öğrenci Listesi ({targetStudents.length})
            </h3>
            <div className="space-y-2">
              {targetStudents.map((student) => {
                const isNotified = notifiedStudents.has(student.id)
                const isSending = sendingToStudent === student.id

                return (
                  <Card
                    key={student.id}
                    className={cn(
                      'transition-all duration-300 border-slate-100',
                      isNotified
                        ? 'bg-emerald-50/50 border-emerald-100'
                        : 'hover:border-indigo-200 hover:shadow-md',
                    )}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                          {student.name}
                          {isNotified && (
                            <i className="fas fa-check-circle text-emerald-500 animate-in zoom-in duration-300"></i>
                          )}
                        </div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                          {student.className} • {student.parentName}
                        </div>
                      </div>

                      <Button
                        onClick={() => handleNotifyStudent(student)}
                        disabled={isNotified || isSending}
                        className={cn(
                          'ml-4 font-black text-[10px] h-9 px-4 uppercase tracking-[0.1em] shadow-sm transition-all',
                          isNotified
                            ? 'bg-emerald-100 text-emerald-700 border-none opacity-80'
                            : isSending
                              ? 'bg-slate-100 text-slate-400'
                              : 'bg-emerald-600 hover:bg-emerald-700 hover:scale-105 active:scale-95 shadow-indigo-100',
                        )}
                      >
                        {isSending ? (
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                        ) : (
                          <i
                            className={cn(
                              'mr-2',
                              isNotified
                                ? 'fas fa-check'
                                : 'fab fa-whatsapp text-sm',
                            )}
                          ></i>
                        )}
                        {isNotified
                          ? 'Bildirildi'
                          : isSending
                            ? 'Açılıyor'
                            : 'Wp Bildir'}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end items-center flex-shrink-0">
          <Button
            variant="ghost"
            onClick={onClose}
            className="px-8 h-12 text-slate-500 font-bold hover:bg-slate-100"
          >
            Vazgeç
          </Button>
          <Button
            onClick={onClose}
            className="px-10 h-12 bg-indigo-600 hover:bg-indigo-700 font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100"
          >
            Tamamla
          </Button>
        </div>
      </div>
    </div>
  )
}

export default BulkNotificationModal
