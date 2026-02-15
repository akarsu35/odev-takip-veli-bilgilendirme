'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Student, Homework, HomeworkStatus } from '@/types'
import { generateParentMessage } from '@/services/geminiService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Props {
  students: Student[]
  homeworks: Homework[]
  initialStudentId: string | null
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

const STATUS_CONFIG: Record<
  HomeworkStatus,
  {
    label: string
    icon: string
    bgColor: string
    lightBg: string
    textColor: string
    borderColor: string
    hoverBg: string
  }
> = {
  [HomeworkStatus.DONE]: {
    label: 'TAMAMLANDI',
    icon: 'fas fa-check',
    bgColor: 'bg-emerald-600',
    lightBg: 'bg-emerald-50',
    textColor: 'text-green-600',
    borderColor: 'border-green-200',
    hoverBg: 'hover:bg-green-100',
  },
  [HomeworkStatus.MISSING]: {
    label: 'YAPILMADI',
    icon: 'fas fa-times',
    bgColor: 'bg-rose-600',
    lightBg: 'bg-rose-50',
    textColor: 'text-rose-600',
    borderColor: 'border-rose-200',
    hoverBg: 'hover:bg-rose-100',
  },
  [HomeworkStatus.INCOMPLETE]: {
    label: 'EKSİK',
    icon: 'fas fa-exclamation',
    bgColor: 'bg-amber-600',
    lightBg: 'bg-amber-50',
    textColor: 'text-amber-600',
    borderColor: 'border-amber-200',
    hoverBg: 'hover:bg-amber-100',
  },
  [HomeworkStatus.ABSENT]: {
    label: 'GELMEDİ',
    icon: 'fas fa-user-slash',
    bgColor: 'bg-violet-600',
    lightBg: 'bg-violet-50',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-200',
    hoverBg: 'hover:bg-purple-100',
  },
  [HomeworkStatus.NOT_BROUGHT]: {
    label: 'GETİRMEDİ',
    icon: 'fas fa-box-open',
    bgColor: 'bg-blue-600',
    lightBg: 'bg-blue-50',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    hoverBg: 'hover:bg-blue-100',
  },
  [HomeworkStatus.PENDING]: {
    label: 'BEKLİYOR',
    icon: 'fas fa-clock',
    bgColor: 'bg-slate-600',
    lightBg: 'bg-slate-50',
    textColor: 'text-slate-600',
    borderColor: 'border-slate-200',
    hoverBg: 'hover:bg-slate-100',
  },
}

const StudentHistory: React.FC<Props> = ({
  students,
  homeworks,
  initialStudentId,
  userProfile,
  onUpdateStatus,
  onMarkNotified,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId || '',
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<HomeworkStatus | 'ALL'>(
    'ALL',
  )
  const [sortBy, setSortBy] = useState<'date' | 'status'>('date')
  const [expandedHwId, setExpandedHwId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Prevent SSR hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId),
    [students, selectedStudentId],
  )

  const filteredStudents = useMemo(() => {
    return students
      .filter(
        (s) =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.className.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
  }, [students, searchTerm])

  const processedHomeworks = useMemo(() => {
    if (!selectedStudent) return []

    return homeworks
      .filter((h) => {
        if (h.targetStudentIds && h.targetStudentIds.length > 0) {
          return h.targetStudentIds.includes(selectedStudent.id)
        }
        return h.targetClasses.includes(selectedStudent.className)
      })
      .map((h) => ({
        ...h,
        studentStatus:
          h.submissions[selectedStudent.id] || HomeworkStatus.PENDING,
      }))
  }, [homeworks, selectedStudent])

  const studentHomeworks = useMemo(() => {
    let list = [...processedHomeworks]

    if (statusFilter !== 'ALL') {
      list = list.filter((h) => h.studentStatus === statusFilter)
    }

    return list.sort((a, b) => {
      if (sortBy === 'date') {
        return (
          new Date(b.assignedDate).getTime() -
          new Date(a.assignedDate).getTime()
        )
      } else {
        const order: Record<HomeworkStatus, number> = {
          [HomeworkStatus.MISSING]: 0,
          [HomeworkStatus.INCOMPLETE]: 1,
          [HomeworkStatus.ABSENT]: 2,
          [HomeworkStatus.NOT_BROUGHT]: 3,
          [HomeworkStatus.PENDING]: 4,
          [HomeworkStatus.DONE]: 5,
        }
        return (
          order[a.studentStatus as HomeworkStatus] -
          order[b.studentStatus as HomeworkStatus]
        )
      }
    })
  }, [processedHomeworks, sortBy, statusFilter])

  const stats = useMemo(() => {
    if (processedHomeworks.length === 0) return null
    const done = processedHomeworks.filter(
      (h) => h.studentStatus === HomeworkStatus.DONE,
    ).length
    return {
      total: processedHomeworks.length,
      done,
      percentage: Math.round((done / processedHomeworks.length) * 100),
    }
  }, [processedHomeworks])

  const handleSendWhatsApp = async (
    hw: Homework & { studentStatus: HomeworkStatus },
    isRenotify: boolean = false,
  ) => {
    if (!selectedStudent) return

    setIsLoading(hw.id)
    try {
      const message = await generateParentMessage(
        selectedStudent.name,
        hw.title,
        hw.studentStatus,
        userProfile?.schoolName || undefined,
        userProfile?.subject || undefined,
        userProfile?.fullName || undefined,
        isRenotify,
      )

      const encodedMessage = encodeURIComponent(message)
      const phone = selectedStudent.parentPhone.startsWith('9')
        ? selectedStudent.parentPhone
        : `9${selectedStudent.parentPhone}`
      const url = `https://wa.me/${phone}?text=${encodedMessage}`

      window.open(url, '_blank')
      if (onMarkNotified) onMarkNotified(hw.id, selectedStudent.id)

      // Save message to history
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          content: message,
          type: 'HOMEWORK',
          student: selectedStudent,
        }),
      })
    } catch (e) {
      console.error('WhatsApp message failed', e)
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Student Selector Card */}
      <Card className="border-indigo-100 shadow-md">
        <CardContent className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Öğrenci Ara
            </label>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <Input
                placeholder="İsim veya sınıf ile ara..."
                className="pl-9 bg-slate-50/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Öğrenci Seçin
            </label>
            <select
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none bg-white font-bold text-slate-800 transition-all cursor-pointer"
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value)
                setExpandedHwId(null)
              }}
            >
              <option value="">
                {filteredStudents.length > 0
                  ? 'Öğrenci Seçin...'
                  : 'Öğrenci Bulunamadı'}
              </option>
              {filteredStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.className})
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {selectedStudent ? (
        <>
          {/* Stats Summary Bar */}
          {stats && (
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="ÖDEV"
                value={stats.total}
                icon="fa-book"
                color="indigo"
              />
              <StatCard
                label="TAMAM"
                value={stats.done}
                icon="fa-check-circle"
                color="emerald"
              />
              <StatCard
                label="BAŞARI"
                value={`%${stats.percentage}`}
                icon="fa-rocket"
                color="orange"
              />
            </div>
          )}

          {/* List Toolbar */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <i className="fas fa-history text-indigo-600"></i>
                Ödev Geçmişi
              </h2>
              <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto shadow-inner">
                <button
                  onClick={() => setSortBy('date')}
                  className={cn(
                    'flex-1 px-4 py-1.5 rounded-md text-xs font-black uppercase tracking-tighter transition-all',
                    sortBy === 'date'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  Tarih
                </button>
                <button
                  onClick={() => setSortBy('status')}
                  className={cn(
                    'flex-1 px-4 py-1.5 rounded-md text-xs font-black uppercase tracking-tighter transition-all',
                    sortBy === 'status'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  Durum
                </button>
              </div>
            </div>

            {/* Sub-Filters for Status */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              <FilterButton
                active={statusFilter === 'ALL'}
                onClick={() => setStatusFilter('ALL')}
                label="HEPSİ"
                count={processedHomeworks.length}
                color="indigo"
              />
              {[
                { s: HomeworkStatus.DONE, label: 'TAMAM', color: 'emerald' },
                { s: HomeworkStatus.MISSING, label: 'YAPMADI', color: 'rose' },
                {
                  s: HomeworkStatus.INCOMPLETE,
                  label: 'EKSİK',
                  color: 'amber',
                },
                { s: HomeworkStatus.ABSENT, label: 'GELMEDİ', color: 'violet' },
                {
                  s: HomeworkStatus.NOT_BROUGHT,
                  label: 'GETİRMEDİ',
                  color: 'blue',
                },
                {
                  s: HomeworkStatus.PENDING,
                  label: 'BEKLEYEN',
                  color: 'slate',
                },
              ].map((f) => (
                <FilterButton
                  key={f.s}
                  active={statusFilter === f.s}
                  onClick={() => setStatusFilter(f.s)}
                  label={f.label}
                  count={
                    processedHomeworks.filter((h) => h.studentStatus === f.s)
                      .length
                  }
                  color={f.color}
                />
              ))}
            </div>
          </div>

          {/* Detailed Homework List */}
          <div className="space-y-3 pb-24">
            {studentHomeworks.length === 0 ? (
              <Card className="border-dashed border-2 bg-slate-50 p-16 text-center">
                <i className="fas fa-folder-open text-4xl text-slate-200 mb-4"></i>
                <p className="text-slate-400 font-medium italic">
                  Filtreye uygun ödev kaydı bulunamadı.
                </p>
              </Card>
            ) : (
              studentHomeworks.map((hw) => {
                const cfg =
                  STATUS_CONFIG[hw.studentStatus as HomeworkStatus] ||
                  STATUS_CONFIG[HomeworkStatus.PENDING]
                const isExpanded = expandedHwId === hw.id
                const isNotified =
                  hw.notifiedStudents?.[selectedStudent.id] || false
                const needsNotification =
                  hw.studentStatus !== HomeworkStatus.PENDING

                return (
                  <Card
                    key={hw.id}
                    className={cn(
                      'transition-all duration-300',
                      isExpanded
                        ? cn(
                            'border-2 shadow-xl scale-[1.01] z-10',
                            cfg.borderColor,
                          )
                        : 'border-slate-100 hover:border-slate-300',
                    )}
                  >
                    <div
                      onClick={() => setExpandedHwId(isExpanded ? null : hw.id)}
                      className="p-4 flex justify-between items-center cursor-pointer select-none"
                    >
                      <div className="min-w-0 pr-4">
                        <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                          {hw.title}
                        </h3>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                          <i className="fas fa-calendar-check opacity-50"></i>
                          {isMounted
                            ? new Date(hw.assignedDate).toLocaleDateString(
                                'tr-TR',
                              )
                            : hw.assignedDate.split('T')[0]}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={cn(
                            'text-[10px] font-black px-3 py-1.5 rounded-lg border shadow-sm transition-all',
                            cfg.lightBg,
                            cfg.textColor,
                            cfg.borderColor,
                            isExpanded && 'scale-110',
                          )}
                        >
                          {cfg.label}
                        </span>
                        <i
                          className={cn(
                            'fas fa-chevron-down text-slate-300 transition-transform duration-300',
                            isExpanded && 'rotate-180 text-indigo-400',
                          )}
                        ></i>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-50 animate-in slide-in-from-top-2 duration-300">
                        {hw.description && (
                          <div className="pt-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                              Ödev Detayı
                            </label>
                            <p className="text-sm text-slate-600 font-medium leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                              {hw.description}
                            </p>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">
                            Durumu Değiştir
                          </label>
                          <div className="grid grid-cols-6 gap-1.5">
                            {(
                              [
                                HomeworkStatus.DONE,
                                HomeworkStatus.MISSING,
                                HomeworkStatus.INCOMPLETE,
                                HomeworkStatus.ABSENT,
                                HomeworkStatus.NOT_BROUGHT,
                                HomeworkStatus.PENDING,
                              ] as const
                            ).map((status) => {
                              const sCfg = STATUS_CONFIG[status]
                              const isActive = hw.studentStatus === status
                              return (
                                <button
                                  key={status}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onUpdateStatus(
                                      hw.id,
                                      selectedStudent.id,
                                      status,
                                    )
                                  }}
                                  className={cn(
                                    'h-10 rounded-xl flex items-center justify-center transition-all border',
                                    isActive
                                      ? `${sCfg.lightBg} ${sCfg.textColor} ${sCfg.borderColor} shadow-sm scale-105 z-10`
                                      : `bg-slate-50 ${sCfg.textColor} border-slate-100 hover:${sCfg.hoverBg}`,
                                  )}
                                  title={sCfg.label}
                                >
                                  <i className={cn(sCfg.icon, 'text-sm')}></i>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {needsNotification && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSendWhatsApp(hw, isNotified)
                              }}
                              disabled={isLoading === hw.id}
                              className={cn(
                                'flex-1 font-black text-xs h-11 shadow-md',
                                isNotified
                                  ? 'bg-slate-200 text-slate-500 border border-slate-300'
                                  : hw.studentStatus === HomeworkStatus.DONE
                                    ? 'bg-emerald-600 hover:bg-emerald-700'
                                    : 'bg-green-500 hover:bg-green-600',
                              )}
                            >
                              {isLoading === hw.id ? (
                                <i className="fas fa-spinner fa-spin mr-2"></i>
                              ) : (
                                <i
                                  className={cn(
                                    'text-base mr-3',
                                    isNotified
                                      ? 'fas fa-check-double'
                                      : 'fab fa-whatsapp',
                                  )}
                                ></i>
                              )}
                              {isLoading === hw.id
                                ? 'Hazırlanıyor...'
                                : isNotified
                                  ? 'BİLDİRİLDİ'
                                  : hw.studentStatus === HomeworkStatus.DONE
                                    ? 'TEŞEKKÜR MESAJI'
                                    : 'VELİYE BİLDİR'}
                            </Button>
                            {isNotified && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSendWhatsApp(hw, true)
                                }}
                                disabled={isLoading === hw.id}
                                className="px-5 h-11 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 font-black text-xs shadow-sm"
                                title="Tekrar Gönder"
                              >
                                <i className="fas fa-redo"></i>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                )
              })
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 space-y-4 animate-in fade-in duration-700">
          <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-200 text-4xl">
            <i className="fas fa-user-graduate"></i>
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-slate-900 font-bold text-lg">Öğrenci Seçin</h3>
            <p className="text-slate-400 font-medium italic text-sm">
              Gelişim geçmişini görmek için bir öğrenci seçin.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

const COLOR_VARIANTS: Record<
  string,
  {
    bg: string
    text: string
    hover: string
    lightBg: string
    iconText: string
    fadedText: string
    borderColor: string
  }
> = {
  indigo: {
    bg: 'bg-indigo-500',
    text: 'text-indigo-600',
    hover: 'hover:bg-indigo-50',
    lightBg: 'bg-indigo-50',
    iconText: 'text-indigo-600',
    fadedText: 'text-indigo-700',
    borderColor: 'border-indigo-200',
  },
  emerald: {
    bg: 'bg-emerald-500',
    text: 'text-emerald-600',
    hover: 'hover:bg-emerald-50',
    lightBg: 'bg-emerald-50',
    iconText: 'text-emerald-600',
    fadedText: 'text-emerald-700',
    borderColor: 'border-emerald-200',
  },
  rose: {
    bg: 'bg-rose-500',
    text: 'text-rose-600',
    hover: 'hover:bg-rose-50',
    lightBg: 'bg-rose-50',
    iconText: 'text-rose-600',
    fadedText: 'text-rose-700',
    borderColor: 'border-rose-200',
  },
  amber: {
    bg: 'bg-amber-500',
    text: 'text-amber-600',
    hover: 'hover:bg-amber-50',
    lightBg: 'bg-amber-50',
    iconText: 'text-amber-600',
    fadedText: 'text-amber-700',
    borderColor: 'border-amber-200',
  },
  violet: {
    bg: 'bg-violet-500',
    text: 'text-violet-600',
    hover: 'hover:bg-violet-50',
    lightBg: 'bg-violet-50',
    iconText: 'text-violet-600',
    fadedText: 'text-violet-700',
    borderColor: 'border-violet-200',
  },
  blue: {
    bg: 'bg-blue-500',
    text: 'text-blue-600',
    hover: 'hover:bg-blue-50',
    lightBg: 'bg-blue-50',
    iconText: 'text-blue-600',
    fadedText: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  slate: {
    bg: 'bg-slate-500',
    text: 'text-slate-600',
    hover: 'hover:bg-slate-50',
    lightBg: 'bg-slate-50',
    iconText: 'text-slate-600',
    fadedText: 'text-slate-700',
    borderColor: 'border-slate-200',
  },
  orange: {
    bg: 'bg-orange-500',
    text: 'text-orange-600',
    hover: 'hover:bg-orange-50',
    lightBg: 'bg-orange-50',
    iconText: 'text-orange-600',
    fadedText: 'text-orange-700',
    borderColor: 'border-orange-200',
  },
}

const FilterButton: React.FC<{
  active: boolean
  onClick: () => void
  label: string
  color: string
  count: number
}> = ({ active, onClick, label, color, count }) => {
  const styles = COLOR_VARIANTS[color] || COLOR_VARIANTS.indigo

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-2xl border-2 transition-all whitespace-nowrap shadow-sm group',
        active
          ? `${styles.borderColor} ${styles.lightBg} ${styles.text} shadow-md scale-105 z-10`
          : `border-slate-100 bg-white text-slate-500 hover:border-slate-200 ${styles.hover}`,
      )}
    >
      <span className="text-[10px] font-black uppercase tracking-wider">
        {label}
      </span>
      <span
        className={cn(
          'text-[10px] font-black px-2 py-0.5 rounded-lg transition-colors min-w-[24px]',
          active
            ? 'bg-white/50 text-current mix-blend-multiply'
            : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200',
        )}
      >
        {count}
      </span>
    </button>
  )
}

const StatCard: React.FC<{
  label: string
  value: string | number
  icon: string
  color: string
}> = ({ label, value, icon, color }) => {
  const styles = COLOR_VARIANTS[color] || COLOR_VARIANTS.indigo

  return (
    <Card className="border-none shadow-sm overflow-hidden group">
      <CardContent className={cn('p-4 text-center relative', styles.lightBg)}>
        <div
          className={cn(
            'text-xl mb-1 group-hover:scale-125 transition-transform',
            styles.iconText,
          )}
        >
          <i className={cn('fas', icon)}></i>
        </div>
        <div className="text-xl font-black text-slate-900 leading-tight">
          {value}
        </div>
        <div
          className={cn(
            'text-[9px] font-black uppercase tracking-[0.2em] opacity-80',
            styles.fadedText,
          )}
        >
          {label}
        </div>
        <i
          className={cn(
            'fas',
            icon,
            'absolute -right-2 -bottom-2 text-4xl opacity-[0.03] group-hover:scale-150 transition-transform',
          )}
        ></i>
      </CardContent>
    </Card>
  )
}

export default StudentHistory
