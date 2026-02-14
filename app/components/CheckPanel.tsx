'use client'

import React, { useEffect, useState } from 'react'
import { Student, Homework, HomeworkStatus } from '@/types'
import { generateParentMessage } from '@/services/geminiService'
import StudentSearch, { turkishSearch } from './StudentSearch'
import StatusFilterView from './StatusFilterView'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Props {
  students: Student[]
  homeworks: Homework[]
  userProfile?: {
    fullName: string | null
    schoolName: string | null
    subject: string | null
  } | null
  onUpdateStatus: (
    hwId: string,
    studentId: string,
    status: HomeworkStatus,
  ) => void
  onMarkNotified: (hwId: string, studentId: string) => void
}

const STORAGE_KEY = 'checkpanel_selected'

const CheckPanel: React.FC<Props> = ({
  students,
  homeworks,
  userProfile,
  onUpdateStatus,
  onMarkNotified,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedHwId, setSelectedHwId] = useState<string>('')
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [viewMode, setViewMode] = useState<'homework' | 'status'>('homework')

  const classes = Array.from(new Set(students.map((s) => s.className))).sort()

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const { classId, hwId } = JSON.parse(saved)
        if (classId) setSelectedClass(classId)
        if (hwId) setSelectedHwId(hwId)
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [])

  useEffect(() => {
    if (selectedClass || selectedHwId) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ classId: selectedClass, hwId: selectedHwId }),
      )
    }
  }, [selectedClass, selectedHwId])

  useEffect(() => {
    if (!selectedClass && classes.length > 0) {
      setSelectedClass(classes[0])
    }
  }, [classes, selectedClass])

  useEffect(() => {
    const classHws = homeworks.filter((h) =>
      h.targetClasses?.includes(selectedClass),
    )
    const currentSelectionValid = classHws.some((hw) => hw.id === selectedHwId)
    if (!currentSelectionValid && classHws.length > 0) {
      setSelectedHwId(classHws[0].id)
    } else if (classHws.length === 0) {
      setSelectedHwId('')
    }
  }, [selectedClass, homeworks, selectedHwId])

  const filteredHomeworks = homeworks.filter((h) =>
    h.targetClasses?.includes(selectedClass),
  )
  const selectedHw = homeworks.find((h) => h.id === selectedHwId)

  const filteredStudents = students
    .filter((s) => {
      const isRoomMatch = s.className === selectedClass
      if (!isRoomMatch) return false
      if (
        selectedHw?.targetStudentIds &&
        selectedHw.targetStudentIds.length > 0
      ) {
        return selectedHw.targetStudentIds.includes(s.id)
      }
      return true
    })
    .filter((s) => {
      return (
        turkishSearch(s.name, searchTerm) ||
        turkishSearch(s.parentName, searchTerm)
      )
    })

  const handleSendWhatsApp = async (
    student: Student,
    status: HomeworkStatus,
    isRenotify: boolean = false,
  ) => {
    if (!selectedHw) return

    setIsLoading(student.id)
    const message = await generateParentMessage(
      student.name,
      selectedHw.title,
      status,
      userProfile?.schoolName || undefined,
      userProfile?.subject || undefined,
      userProfile?.fullName || undefined,
      isRenotify,
    )
    setIsLoading(null)

    const encodedMessage = encodeURIComponent(message)
    const phone = student.parentPhone.startsWith('9')
      ? student.parentPhone
      : `9${student.parentPhone}`
    const url = `https://wa.me/${phone}?text=${encodedMessage}`

    window.open(url, '_blank')
    onMarkNotified(selectedHwId, student.id)

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

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center bg-white rounded-2xl border border-dashed border-slate-300">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <i className="fas fa-users-slash text-slate-400 text-2xl"></i>
        </div>
        <h3 className="text-lg font-semibold text-slate-800">Öğrenci Yok</h3>
        <p className="text-slate-500 mt-2">
          Kontrol paneline başlamak için önce öğrenci ekleyin.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* View Mode Switching Tabs */}
      <Card className="p-1.5 shadow-sm border-slate-100 mb-4">
        <div className="flex bg-slate-100/50 rounded-lg p-1">
          <button
            onClick={() => setViewMode('homework')}
            className={cn(
              'flex-1 py-2.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2',
              viewMode === 'homework'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
            )}
          >
            <i className="fas fa-book-open text-xs"></i>
            Ödev Kontrolü
          </button>
          <button
            onClick={() => setViewMode('status')}
            className={cn(
              'flex-1 py-2.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2',
              viewMode === 'status'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
            )}
          >
            <i className="fas fa-filter text-xs"></i>
            Duruma Göre
          </button>
        </div>
      </Card>

      {viewMode === 'status' ? (
        <StatusFilterView
          students={students}
          homeworks={homeworks}
          userProfile={userProfile}
          onUpdateStatus={onUpdateStatus}
          onMarkNotified={onMarkNotified}
        />
      ) : (
        <>
          {/* Filters Card */}
          <Card className="sticky top-[72px] z-40 border-indigo-100 shadow-md">
            <CardContent className="p-4 space-y-4">
              <StudentSearch
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Öğrenci veya veli ara..."
              />

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Sınıf Seçin
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {classes.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedClass(c)}
                        className={cn(
                          'px-4 py-2 rounded-lg text-xs font-bold transition-all border whitespace-nowrap',
                          selectedClass === c
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300',
                        )}
                      >
                        {c} Sınıfı
                      </button>
                    ))}
                  </div>
                </div>

                {selectedClass && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Kontrol Edilecek Ödev
                    </label>
                    {filteredHomeworks.length > 0 ? (
                      <select
                        value={selectedHwId}
                        onChange={(e) => setSelectedHwId(e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none bg-slate-50 font-bold text-slate-800 transition-all cursor-pointer"
                      >
                        {filteredHomeworks.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.title}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-700">
                        <i className="fas fa-exclamation-triangle"></i>
                        <p className="text-xs font-bold uppercase tracking-tight">
                          Bu sınıf için henüz ödev oluşturulmamış.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Student List */}
          <div className="space-y-3 pt-2">
            {selectedClass && filteredStudents.length === 0 ? (
              <Card className="border-dashed border-2 border-slate-200 bg-slate-50">
                <CardContent className="p-12 text-center text-slate-400 italic font-medium">
                  Bu kriterlere uygun öğrenci bulunamadı.
                </CardContent>
              </Card>
            ) : (
              filteredStudents.map((student) => {
                const status =
                  selectedHw?.submissions[student.id] || HomeworkStatus.PENDING
                const needsNotification =
                  status === HomeworkStatus.DONE ||
                  status === HomeworkStatus.MISSING ||
                  status === HomeworkStatus.INCOMPLETE ||
                  status === HomeworkStatus.ABSENT ||
                  status === HomeworkStatus.NOT_BROUGHT
                const isDone = status === HomeworkStatus.DONE
                const isNotified =
                  selectedHw?.notifiedStudents?.[student.id] || false

                return (
                  <Card
                    key={student.id}
                    className={cn(
                      'transition-all border-slate-200',
                      isNotified && 'opacity-80 grayscale-[0.3]',
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-800 flex items-center gap-2">
                            {student.name}
                            {isNotified && (
                              <i className="fas fa-check-circle text-emerald-500 text-sm animate-in zoom-in duration-300"></i>
                            )}
                          </h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                            Veli: {student.parentName}
                          </p>
                        </div>

                        {needsNotification && selectedHw && (
                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                              onClick={() =>
                                handleSendWhatsApp(student, status, false)
                              }
                              disabled={isLoading === student.id || isNotified}
                              className={cn(
                                'flex-1 sm:flex-none font-bold text-xs h-9 px-4 shadow-sm',
                                isNotified
                                  ? 'bg-slate-100 text-slate-400'
                                  : isDone
                                    ? 'bg-emerald-600 hover:bg-emerald-700'
                                    : 'bg-green-500 hover:bg-green-600',
                              )}
                            >
                              <i
                                className={cn(
                                  'text-xs mr-2',
                                  isNotified
                                    ? 'fas fa-check'
                                    : 'fab fa-whatsapp',
                                )}
                              ></i>
                              {isLoading === student.id
                                ? '...'
                                : isNotified
                                  ? 'BİLDİRİLDİ'
                                  : isDone
                                    ? 'TEŞEKKÜR ET'
                                    : 'BİLDİRİM GÖNDER'}
                            </Button>
                            {isNotified && (
                              <Button
                                variant="outline"
                                onClick={() =>
                                  handleSendWhatsApp(student, status, true)
                                }
                                disabled={isLoading === student.id}
                                className="h-9 px-3 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-xs shadow-sm"
                                title="Tekrar Bildirim Gönder"
                              >
                                <i className="fas fa-redo"></i>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                        {[
                          {
                            label: 'Tamam',
                            status: HomeworkStatus.DONE,
                            color:
                              'bg-emerald-50 text-emerald-600 border-emerald-100',
                            active:
                              'bg-emerald-600 text-white border-emerald-600',
                          },
                          {
                            label: 'Yapmadı',
                            status: HomeworkStatus.MISSING,
                            color: 'bg-rose-50 text-rose-600 border-rose-100',
                            active: 'bg-rose-600 text-white border-rose-600',
                          },
                          {
                            label: 'Eksik',
                            status: HomeworkStatus.INCOMPLETE,
                            color:
                              'bg-amber-50 text-amber-600 border-amber-100',
                            active: 'bg-amber-600 text-white border-amber-600',
                          },
                          {
                            label: 'Gelmedi',
                            status: HomeworkStatus.ABSENT,
                            color:
                              'bg-purple-50 text-purple-600 border-purple-100',
                            active:
                              'bg-purple-600 text-white border-purple-600',
                          },
                          {
                            label: 'Getirmedi',
                            status: HomeworkStatus.NOT_BROUGHT,
                            color: 'bg-blue-50 text-blue-600 border-blue-100',
                            active: 'bg-blue-600 text-white border-blue-600',
                          },
                        ].map((btn) => (
                          <StatusButton
                            key={btn.status}
                            label={btn.label}
                            active={status === btn.status}
                            color={btn.color}
                            activeColor={btn.active}
                            onClick={() =>
                              onUpdateStatus(
                                selectedHwId,
                                student.id,
                                status === btn.status
                                  ? HomeworkStatus.PENDING
                                  : btn.status,
                              )
                            }
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}

const StatusButton: React.FC<{
  label: string
  active: boolean
  color: string
  activeColor: string
  onClick: () => void
}> = ({ label, active, color, activeColor, onClick }) => (
  <button
    onClick={(e) => {
      e.preventDefault()
      onClick()
    }}
    className={cn(
      'flex-1 min-w-[70px] text-center py-2.5 rounded-lg text-[10px] font-black border transition-all uppercase tracking-tighter shadow-sm',
      active ? activeColor : cn(color, 'hover:shadow-md'),
    )}
  >
    {label}
  </button>
)

export default CheckPanel
