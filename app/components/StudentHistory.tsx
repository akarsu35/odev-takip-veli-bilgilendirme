'use client'

import React, { useState, useMemo } from 'react'
import { Student, Homework, HomeworkStatus } from '@/types'
import { generateParentMessage } from '@/services/geminiService'

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
  }
> = {
  [HomeworkStatus.DONE]: {
    label: 'TAMAMLANDI',
    icon: 'fas fa-check',
    bgColor: 'bg-emerald-600',
    lightBg: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    borderColor: 'border-emerald-100',
  },
  [HomeworkStatus.MISSING]: {
    label: 'YAPILMADI',
    icon: 'fas fa-times',
    bgColor: 'bg-red-600',
    lightBg: 'bg-red-50',
    textColor: 'text-red-600',
    borderColor: 'border-red-100',
  },
  [HomeworkStatus.INCOMPLETE]: {
    label: 'EKSİK',
    icon: 'fas fa-exclamation',
    bgColor: 'bg-orange-600',
    lightBg: 'bg-orange-50',
    textColor: 'text-orange-600',
    borderColor: 'border-orange-100',
  },
  [HomeworkStatus.ABSENT]: {
    label: 'GELMEDİ',
    icon: 'fas fa-user-slash',
    bgColor: 'bg-purple-600',
    lightBg: 'bg-purple-50',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-100',
  },
  [HomeworkStatus.PENDING]: {
    label: 'BEKLİYOR',
    icon: 'fas fa-clock',
    bgColor: 'bg-slate-500',
    lightBg: 'bg-slate-50',
    textColor: 'text-slate-500',
    borderColor: 'border-slate-100',
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
      .sort((a, b) => a.name.localeCompare(b.name))
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
          [HomeworkStatus.PENDING]: 3,
          [HomeworkStatus.DONE]: 4,
        }
        return order[a.studentStatus] - order[b.studentStatus]
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
      onMarkNotified(hw.id, selectedStudent.id)
    } catch (e) {
      console.error('WhatsApp message failed', e)
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Student Selector */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider ml-1">
            Öğrenci Ara
          </label>
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"></i>
            <input
              type="text"
              placeholder="İsim veya sınıf ile ara..."
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/50 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider ml-1">
            Öğrenci Seçin
          </label>
          <select
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium shadow-sm"
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
      </div>

      {selectedStudent ? (
        <>
          {/* Stats Bar */}
          {stats && (
            <div className="grid grid-cols-3 gap-4">
              <StatCard
                label="TOPLAM"
                value={stats.total}
                icon="fa-book"
                color="text-indigo-600"
              />
              <StatCard
                label="TAMAM"
                value={stats.done}
                icon="fa-check-circle"
                color="text-emerald-600"
              />
              <StatCard
                label="BAŞARI"
                value={`%${stats.percentage}`}
                icon="fa-rocket"
                color="text-orange-600"
              />
            </div>
          )}

          {/* List Controls */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">Ödev Geçmişi</h2>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setSortBy('date')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                    sortBy === 'date'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Tarih
                </button>
                <button
                  onClick={() => setSortBy('status')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                    sortBy === 'status'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Durum
                </button>
              </div>
            </div>

            {/* Status Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <FilterButton
                active={statusFilter === 'ALL'}
                onClick={() => setStatusFilter('ALL')}
                label="Hepsi"
                count={processedHomeworks.length}
              />
              <FilterButton
                active={statusFilter === HomeworkStatus.DONE}
                onClick={() => setStatusFilter(HomeworkStatus.DONE)}
                label="Tamamlandı"
                color="bg-emerald-500"
                count={
                  processedHomeworks.filter(
                    (h) => h.studentStatus === HomeworkStatus.DONE,
                  ).length
                }
              />
              <FilterButton
                active={statusFilter === HomeworkStatus.MISSING}
                onClick={() => setStatusFilter(HomeworkStatus.MISSING)}
                label="Yapılmadı"
                color="bg-red-500"
                count={
                  processedHomeworks.filter(
                    (h) => h.studentStatus === HomeworkStatus.MISSING,
                  ).length
                }
              />
              <FilterButton
                active={statusFilter === HomeworkStatus.INCOMPLETE}
                onClick={() => setStatusFilter(HomeworkStatus.INCOMPLETE)}
                label="Eksik"
                color="bg-orange-500"
                count={
                  processedHomeworks.filter(
                    (h) => h.studentStatus === HomeworkStatus.INCOMPLETE,
                  ).length
                }
              />
              <FilterButton
                active={statusFilter === HomeworkStatus.PENDING}
                onClick={() => setStatusFilter(HomeworkStatus.PENDING)}
                label="Bekliyor"
                color="bg-slate-400"
                count={
                  processedHomeworks.filter(
                    (h) => h.studentStatus === HomeworkStatus.PENDING,
                  ).length
                }
              />
              <FilterButton
                active={statusFilter === HomeworkStatus.ABSENT}
                onClick={() => setStatusFilter(HomeworkStatus.ABSENT)}
                label="Gelmedi"
                color="bg-purple-500"
                count={
                  processedHomeworks.filter(
                    (h) => h.studentStatus === HomeworkStatus.ABSENT,
                  ).length
                }
              />
            </div>
          </div>

          {/* Homework List */}
          <div className="space-y-3">
            {studentHomeworks.length === 0 ? (
              <div className="bg-white p-10 rounded-xl text-center border-2 border-dashed border-slate-200">
                <p className="text-slate-400 italic">
                  Bu öğrenci için atanmış ödev bulunmuyor.
                </p>
              </div>
            ) : (
              studentHomeworks.map((hw) => {
                const cfg = STATUS_CONFIG[hw.studentStatus]
                const isExpanded = expandedHwId === hw.id
                const isNotified =
                  hw.notifiedStudents?.[selectedStudent.id] || false
                const needsNotification =
                  hw.studentStatus === HomeworkStatus.DONE ||
                  hw.studentStatus === HomeworkStatus.MISSING ||
                  hw.studentStatus === HomeworkStatus.INCOMPLETE ||
                  hw.studentStatus === HomeworkStatus.ABSENT

                return (
                  <div
                    key={hw.id}
                    className={`bg-white rounded-xl shadow-sm border transition-all ${
                      isExpanded
                        ? `${cfg.borderColor} border-2`
                        : 'border-slate-100'
                    }`}
                  >
                    {/* Homework Header - Clickable */}
                    <div
                      onClick={() => setExpandedHwId(isExpanded ? null : hw.id)}
                      className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50/50 transition-colors rounded-xl"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-800 truncate">
                          {hw.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 uppercase font-black">
                          {new Date(hw.assignedDate).toLocaleDateString(
                            'tr-TR',
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${cfg.lightBg} ${cfg.textColor} ${cfg.borderColor}`}
                        >
                          {cfg.label}
                        </span>
                        <i
                          className={`fas fa-chevron-down text-slate-400 text-xs transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        ></i>
                      </div>
                    </div>

                    {/* Expanded Panel */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 space-y-3 border-t border-slate-100">
                        {/* Description */}
                        {hw.description && (
                          <p className="text-sm text-slate-500 pt-3">
                            {hw.description}
                          </p>
                        )}

                        {/* Status Change Buttons */}
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">
                            Durumu Değiştir
                          </label>
                          <div className="flex gap-1.5">
                            {(
                              [
                                HomeworkStatus.DONE,
                                HomeworkStatus.MISSING,
                                HomeworkStatus.INCOMPLETE,
                                HomeworkStatus.ABSENT,
                                HomeworkStatus.PENDING,
                              ] as const
                            ).map((status) => {
                              const sCfg = STATUS_CONFIG[status]
                              const isActive = hw.studentStatus === status
                              return (
                                <button
                                  key={status}
                                  onClick={() =>
                                    onUpdateStatus(
                                      hw.id,
                                      selectedStudent.id,
                                      status,
                                    )
                                  }
                                  className={`flex-1 py-2 rounded-lg text-[10px] font-black border transition-all flex items-center justify-center gap-1 ${
                                    isActive
                                      ? `${sCfg.bgColor} text-white border-transparent`
                                      : `bg-white ${sCfg.textColor} ${sCfg.borderColor} hover:${sCfg.lightBg}`
                                  }`}
                                  title={sCfg.label}
                                >
                                  <i className={sCfg.icon}></i>
                                  <span className="hidden sm:inline">
                                    {sCfg.label}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* WhatsApp Notification */}
                        {needsNotification && (
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleSendWhatsApp(hw, isNotified)}
                              disabled={isLoading === hw.id}
                              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition shadow-sm ${
                                isNotified
                                  ? 'bg-slate-100 text-slate-400 border border-slate-200'
                                  : hw.studentStatus === HomeworkStatus.DONE
                                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                    : 'bg-green-500 text-white hover:bg-green-600'
                              }`}
                            >
                              <i
                                className={`${
                                  isNotified
                                    ? 'fas fa-check'
                                    : 'fab fa-whatsapp'
                                } text-lg`}
                              ></i>
                              {isLoading === hw.id
                                ? 'Mesaj hazırlanıyor...'
                                : isNotified
                                  ? 'BİLDİRİLDİ'
                                  : hw.studentStatus === HomeworkStatus.DONE
                                    ? 'TEŞEKKÜR MESAJI'
                                    : 'VELİYE BİLDİR'}
                            </button>
                            {isNotified && (
                              <button
                                onClick={() => handleSendWhatsApp(hw, true)}
                                disabled={isLoading === hw.id}
                                className="px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-sm bg-amber-500 text-white hover:bg-amber-600"
                              >
                                <i className="fas fa-redo"></i>
                                {isLoading === hw.id ? '...' : 'TEKRAR'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </>
      ) : (
        <div className="text-center p-20 opacity-40">
          <i className="fas fa-user-circle text-6xl mb-4 text-slate-300"></i>
          <p className="font-medium text-slate-500 italic">
            Geçmişi görüntülemek için bir öğrenci seçin.
          </p>
        </div>
      )}
    </div>
  )
}

const FilterButton: React.FC<{
  active: boolean
  onClick: () => void
  label: string
  color?: string
  count: number
}> = ({ active, onClick, label, color = 'bg-indigo-500', count }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 transition-all whitespace-nowrap ${
      active
        ? `border-transparent ${color} text-white shadow-md scale-105`
        : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
    }`}
  >
    <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
    <span
      className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
        active ? 'bg-white/20' : 'bg-slate-100 text-slate-400'
      }`}
    >
      {count}
    </span>
  </button>
)

const StatCard: React.FC<{
  label: string
  value: string | number
  icon: string
  color: string
}> = ({ label, value, icon, color }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center">
    <div className={`text-xl mb-1 ${color}`}>
      <i className={`fas ${icon}`}></i>
    </div>
    <div className="text-lg font-black text-slate-800 leading-tight">
      {value}
    </div>
    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
      {label}
    </div>
  </div>
)

export default StudentHistory
