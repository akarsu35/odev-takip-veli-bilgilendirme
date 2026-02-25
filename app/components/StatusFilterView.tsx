'use client'

import React, { useState, useMemo } from 'react'
import { Student, Homework, HomeworkStatus } from '@/types'
import { generateParentMessage } from '@/services/geminiService'
import { turkishSearch } from './StudentSearch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card'
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

interface StudentHomeworkInfo {
  student: Student
  homeworksWithStatus: {
    homework: Homework
    status: HomeworkStatus
  }[]
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string
    icon: string
    bgColor: string
    lightBg: string
    textColor: string
    borderColor: string
    emoji: string
    hoverBg: string
  }
> = {
  MISSING: {
    label: 'Yapılmadı',
    icon: 'fas fa-times',
    bgColor: 'bg-rose-600',
    lightBg: 'bg-rose-50',
    textColor: 'text-rose-600',
    borderColor: 'border-rose-200',
    emoji: '❌',
    hoverBg: 'hover:bg-rose-100',
  },
  INCOMPLETE: {
    label: 'Eksik',
    icon: 'fas fa-exclamation',
    bgColor: 'bg-amber-600',
    lightBg: 'bg-amber-50',
    textColor: 'text-amber-600',
    borderColor: 'border-amber-200',
    emoji: '⚠️',
    hoverBg: 'hover:bg-amber-100',
  },
  ABSENT: {
    label: 'Gelmedi',
    icon: 'fas fa-user-slash',
    bgColor: 'bg-violet-600',
    lightBg: 'bg-violet-50',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-200',
    emoji: '📦',
    hoverBg: 'hover:bg-purple-100',
  },
  NOT_BROUGHT: {
    label: 'Getirmedi',
    icon: 'fas fa-box-open',
    bgColor: 'bg-blue-600',
    lightBg: 'bg-blue-50',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    emoji: '📪',
    hoverBg: 'hover:bg-blue-100',
  },
  DONE: {
    label: 'Tamamladı',
    icon: 'fas fa-check',
    bgColor: 'bg-emerald-600',
    lightBg: 'bg-emerald-50',
    textColor: 'text-green-600',
    borderColor: 'border-green-200',
    emoji: '✅',
    hoverBg: 'hover:bg-green-100',
  },
  PENDING: {
    label: 'Beklemede',
    icon: 'fas fa-clock',
    bgColor: 'bg-slate-600',
    lightBg: 'bg-slate-50',
    textColor: 'text-slate-600',
    borderColor: 'border-slate-200',
    emoji: '⏳',
    hoverBg: 'hover:bg-slate-100',
  },
}

const StatusFilterView: React.FC<Props> = ({
  students,
  homeworks,
  userProfile,
  onUpdateStatus,
  onMarkNotified,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<HomeworkStatus>(
    HomeworkStatus.MISSING,
  )
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [selectedClass, setSelectedClass] = useState<string>('ALL')
  const [filtersOpen, setFiltersOpen] = useState<boolean>(true)

  const classes = useMemo(
    () => Array.from(new Set(students.map((s) => s.className))).sort(),
    [students],
  )

  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null
    const student = students.find((s) => s.id === selectedStudentId)
    if (!student) return null
    const allHomeworks = getAllHomeworksForStudent(student)

    // Status priority: selected filter first, then other problematics, then pending, then done
    const statusOrder = [
      selectedStatus,
      HomeworkStatus.MISSING,
      HomeworkStatus.INCOMPLETE,
      HomeworkStatus.NOT_BROUGHT,
      HomeworkStatus.ABSENT,
      HomeworkStatus.PENDING,
      HomeworkStatus.DONE,
    ].filter((v, i, arr) => arr.indexOf(v) === i) // deduplicate

    const sorted = allHomeworks.sort(
      (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status),
    )

    return {
      student,
      homeworksWithStatus: sorted.map((h) => ({
        homework: h.homework,
        status: h.status,
      })),
    }
  }, [selectedStudentId, students, homeworks, selectedStatus])

  const studentsWithStatus = useMemo(() => {
    const result: StudentHomeworkInfo[] = []

    students.forEach((student) => {
      const homeworksWithStatus: {
        homework: Homework
        status: HomeworkStatus
      }[] = []

      homeworks.forEach((hw) => {
        const isTarget =
          hw.targetStudentIds && hw.targetStudentIds.length > 0
            ? hw.targetStudentIds.includes(student.id)
            : hw.targetClasses.includes(student.className)

        if (isTarget) {
          const status = hw.submissions[student.id] || HomeworkStatus.PENDING
          if (status === selectedStatus) {
            homeworksWithStatus.push({ homework: hw, status })
          }
        }
      })

      if (homeworksWithStatus.length > 0) {
        result.push({ student, homeworksWithStatus })
      }
    })

    return result
      .filter(
        (item) =>
          turkishSearch(item.student.name, searchTerm) ||
          turkishSearch(item.student.parentName, searchTerm),
      )
      .filter(
        (item) =>
          selectedClass === 'ALL' || item.student.className === selectedClass,
      )
      .sort(
        (a, b) => b.homeworksWithStatus.length - a.homeworksWithStatus.length,
      )
  }, [students, homeworks, selectedStatus, searchTerm, selectedClass])

  function getAllHomeworksForStudent(student: Student) {
    return homeworks
      .filter((hw) => {
        const isTarget =
          hw.targetStudentIds && hw.targetStudentIds.length > 0
            ? hw.targetStudentIds.includes(student.id)
            : hw.targetClasses.includes(student.className)
        return isTarget
      })
      .map((hw) => ({
        homework: hw,
        status: hw.submissions[student.id] || HomeworkStatus.PENDING,
        isNotified: hw.notifiedStudents?.[student.id] || false,
      }))
  }

  const handleSendWhatsApp = async (
    student: Student,
    homework: Homework,
    status: HomeworkStatus,
    isRenotify: boolean = false,
  ) => {
    setIsLoading(`${student.id}-${homework.id}`)
    const message = await generateParentMessage(
      student.name,
      homework.title,
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
    onMarkNotified(homework.id, student.id)
  }

  const handleStudentClick = (info: StudentHomeworkInfo) => {
    setSelectedStudentId(info.student.id)
  }

  const config = STATUS_CONFIG[selectedStatus] || STATUS_CONFIG.PENDING

  return (
    <div className="space-y-4">
      {/* Selection Card */}
      <Card className="sticky top-[72px] z-40 border-indigo-100 shadow-md">
        {/* Collapsible header */}
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 gap-2 text-left"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <i className="fas fa-filter text-indigo-500 text-xs flex-shrink-0 self-start mt-0.5"></i>
            {filtersOpen ? (
              <span className="text-xs font-black text-slate-700 uppercase tracking-widest">
                Filtreler
              </span>
            ) : (
              <div className="flex flex-col min-w-0 gap-0.5">
                {/* Row 1: status badge + class */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      'text-[10px] font-black px-2 py-0.5 rounded-full text-white',
                      config.bgColor,
                    )}
                  >
                    <i className={cn(config.icon, 'mr-1 text-[9px]')}></i>
                    {config.label}
                  </span>
                  {selectedClass !== 'ALL' && (
                    <span className="text-[10px] font-black text-indigo-600">
                      {selectedClass} Sınıfı
                    </span>
                  )}
                  {studentsWithStatus.length > 0 && (
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                      {studentsWithStatus.length} öğrenci
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          <i
            className={cn(
              'fas fa-chevron-down text-slate-400 text-xs transition-transform duration-300 flex-shrink-0',
              filtersOpen && 'rotate-180',
            )}
          ></i>
        </button>

        {filtersOpen && (
          <CardHeader className="p-4 pt-0 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Duruma Göre Filtrele
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {(
                  Object.keys(STATUS_CONFIG) as Array<
                    keyof typeof STATUS_CONFIG
                  >
                ).map((status) => {
                  const cfg = STATUS_CONFIG[status]
                  const isActive = selectedStatus === status
                  return (
                    <button
                      key={status}
                      onClick={() =>
                        setSelectedStatus(status as HomeworkStatus)
                      }
                      className={cn(
                        'px-4 py-2.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap flex items-center gap-2 uppercase tracking-tighter',
                        isActive
                          ? `${cfg.bgColor} text-white border-transparent shadow-lg scale-105 z-10`
                          : `bg-white ${cfg.textColor} ${cfg.borderColor} hover:${cfg.lightBg}`,
                      )}
                    >
                      <i className={cfg.icon}></i>
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Class filter chips */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Sınıf
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button
                  onClick={() => setSelectedClass('ALL')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-black border transition-all whitespace-nowrap',
                    selectedClass === 'ALL'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300',
                  )}
                >
                  Tümü
                </button>
                {classes.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedClass(c)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-black border transition-all whitespace-nowrap',
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

            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <Input
                placeholder="Öğrenci veya veli ara..."
                className="pl-9 h-11 bg-slate-50/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
        )}
      </Card>

      {/* Stats Summary Panel */}
      <div
        className={cn(
          'relative overflow-hidden border rounded-2xl p-6 transition-all shadow-sm',
          config.lightBg,
          config.borderColor,
        )}
      >
        <div className="flex items-center gap-5 relative z-10">
          <div
            className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:rotate-3',
              config.bgColor,
            )}
          >
            <i className={cn(config.icon, 'text-white text-2xl')}></i>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 leading-tight">
              {studentsWithStatus.length}
            </div>
            <div
              className={cn(
                'text-xs font-bold uppercase tracking-widest opacity-80',
                config.textColor,
              )}
            >
              Öğrenci "{config.label}" Durumunda
            </div>
          </div>
        </div>
        {/* Decorative background icon */}
        <i
          className={cn(
            config.icon,
            'absolute -right-6 -bottom-6 text-9xl opacity-10 rotate-12',
          )}
        ></i>
      </div>

      {/* Student Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-8">
        {studentsWithStatus.length === 0 ? (
          <div className="col-span-full py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
              <i className="fas fa-check-double text-slate-200 text-2xl"></i>
            </div>
            <div className="text-slate-400 italic font-medium">
              Bu kategoride bekleyen öğrenci bulunmuyor.
            </div>
          </div>
        ) : (
          studentsWithStatus.map((info) => (
            <Card
              key={info.student.id}
              onClick={() => handleStudentClick(info)}
              className={cn(
                'group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-slate-100',
                `hover:${config.borderColor}`,
              )}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                      {info.student.name}
                    </h4>
                    <span
                      className={cn(
                        'text-[10px] font-black px-2 py-0.5 rounded-full border tracking-widest uppercase',
                        config.lightBg,
                        config.textColor,
                        config.borderColor,
                      )}
                    >
                      {info.student.className}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <i className="fas fa-user-circle opacity-50"></i>
                    {info.student.parentName}
                  </div>
                </div>
                <div className="flex items-center gap-3 pl-4">
                  <div
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-black shadow-sm group-hover:scale-110 transition-transform',
                      config.lightBg,
                      config.textColor,
                    )}
                  >
                    {info.homeworksWithStatus.length} Ödev
                  </div>
                  <i className="fas fa-chevron-right text-slate-300 group-hover:text-indigo-400 transition-colors"></i>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Student Detail Drawer/Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 animate-in fade-in duration-300">
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-10 duration-500"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 rounded-t-3xl sm:rounded-t-3xl">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg font-black text-xl">
                    {selectedStudent.student.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-slate-900 tracking-tight leading-none mb-1">
                      {selectedStudent.student.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md uppercase tracking-widest">
                        {selectedStudent.student.className}
                      </span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Veli: {selectedStudent.student.parentName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedStudentId(null)}
                className="rounded-full bg-white shadow-sm hover:bg-slate-100 h-10 w-10 border border-slate-100"
              >
                <i className="fas fa-times text-slate-500"></i>
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 no-scrollbar flex-1">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <i className="fas fa-list-ul"></i>
                Ödev Takip Geçmişi
                <span
                  className={cn(
                    'ml-1 px-2 py-0.5 rounded-full text-[9px] border',
                    config.lightBg,
                    config.textColor,
                    config.borderColor,
                  )}
                >
                  {selectedStatus === HomeworkStatus.MISSING
                    ? 'Yapılmadılar önce'
                    : `${config.label}'lar önce`}
                </span>
              </h4>
              <div className="space-y-3">
                {selectedStudent.homeworksWithStatus.map(
                  ({ homework, status }) => {
                    const statusCfg =
                      STATUS_CONFIG[status] || STATUS_CONFIG.PENDING
                    const isNotified =
                      homework.notifiedStudents?.[selectedStudent.student.id] ||
                      false
                    const needsNotification = status !== HomeworkStatus.PENDING

                    return (
                      <Card
                        key={homework.id}
                        className={cn(
                          'border shadow-sm transition-all overflow-hidden',
                          status === selectedStatus
                            ? `border-l-4 ${config.borderColor} bg-white ring-1 ring-offset-0 ${config.borderColor}`
                            : 'border-slate-100',
                        )}
                      >
                        <CardContent className="p-4 bg-white">
                          <div className="flex justify-between items-start gap-3 mb-4">
                            <div className="min-w-0 flex-1">
                              <h5 className="font-bold text-slate-800 flex items-center gap-2 mb-1">
                                <span className="text-base">
                                  {statusCfg.emoji}
                                </span>
                                {homework.title}
                              </h5>
                              <p className="text-xs text-slate-500 line-clamp-2 font-medium">
                                {homework.description}
                              </p>
                            </div>

                            {needsNotification && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSendWhatsApp(
                                    selectedStudent.student,
                                    homework,
                                    status,
                                    isNotified,
                                  )
                                }}
                                disabled={
                                  isLoading ===
                                  `${selectedStudent.student.id}-${homework.id}`
                                }
                                className={cn(
                                  'h-9 px-4 font-black text-[10px] uppercase tracking-widest shadow-md flex-shrink-0 animate-in zoom-in-95',
                                  isNotified
                                    ? 'bg-amber-600 hover:bg-amber-700'
                                    : 'bg-emerald-600 hover:bg-emerald-700',
                                )}
                              >
                                {isLoading ===
                                `${selectedStudent.student.id}-${homework.id}` ? (
                                  <i className="fas fa-spinner fa-spin"></i>
                                ) : (
                                  <>
                                    <i
                                      className={cn(
                                        'mr-2',
                                        isNotified
                                          ? 'fas fa-redo'
                                          : 'fab fa-whatsapp text-sm',
                                      )}
                                    ></i>
                                    {isNotified
                                      ? 'Tekrar Bildir'
                                      : 'Mesaj Gönder'}
                                  </>
                                )}
                              </Button>
                            )}
                          </div>

                          {/* Large Action Buttons in Modal */}
                          <div className="grid grid-cols-6 gap-1.5">
                            {(
                              [
                                'DONE',
                                'MISSING',
                                'INCOMPLETE',
                                'ABSENT',
                                'NOT_BROUGHT',
                                'PENDING',
                              ] as const
                            ).map((s) => {
                              const sCfg = STATUS_CONFIG[s]
                              const isActive = status === s
                              return (
                                <button
                                  key={s}
                                  onClick={() =>
                                    onUpdateStatus(
                                      homework.id,
                                      selectedStudent.student.id,
                                      s as HomeworkStatus,
                                    )
                                  }
                                  className={cn(
                                    'h-10 rounded-xl flex items-center justify-center transition-all border',
                                    isActive
                                      ? `${sCfg.bgColor} text-white border-transparent shadow-md scale-105 z-10`
                                      : `bg-slate-50 ${sCfg.textColor} border-slate-100 hover:${sCfg.hoverBg}`,
                                  )}
                                  title={sCfg.label}
                                >
                                  <i className={cn(sCfg.icon, 'text-sm')}></i>
                                </button>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  },
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 sm:rounded-b-3xl">
              <Button
                variant="ghost"
                className="w-full text-slate-500 font-bold"
                onClick={() => setSelectedStudentId(null)}
              >
                Kapat
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Utility to check if this homework is currently the one being filtered
function isActiveFor(hw: Homework, studentId: string) {
  // Can be used for highlighting
  return false
}

export default StatusFilterView
