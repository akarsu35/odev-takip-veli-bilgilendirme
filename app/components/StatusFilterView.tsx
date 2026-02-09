'use client'

import React, { useState, useMemo } from 'react'
import { Student, Homework, HomeworkStatus } from '@/types'
import { generateParentMessage } from '@/services/geminiService'
import { turkishSearch } from './StudentSearch'

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

const STATUS_CONFIG = {
  MISSING: {
    label: 'Yapılmadı',
    icon: 'fas fa-times',
    bgColor: 'bg-red-500',
    lightBg: 'bg-red-50',
    textColor: 'text-red-600',
    borderColor: 'border-red-200',
    emoji: '❌',
  },
  INCOMPLETE: {
    label: 'Eksik',
    icon: 'fas fa-exclamation',
    bgColor: 'bg-orange-500',
    lightBg: 'bg-orange-50',
    textColor: 'text-orange-600',
    borderColor: 'border-orange-200',
    emoji: '⚠️',
  },
  ABSENT: {
    label: 'Gelmedi',
    icon: 'fas fa-user-slash',
    bgColor: 'bg-purple-500',
    lightBg: 'bg-purple-50',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-200',
    emoji: '📦',
  },
  DONE: {
    label: 'Tamamladı',
    icon: 'fas fa-check',
    bgColor: 'bg-green-500',
    lightBg: 'bg-green-50',
    textColor: 'text-green-600',
    borderColor: 'border-green-200',
    emoji: '✅',
  },
  PENDING: {
    label: 'Beklemede',
    icon: 'fas fa-clock',
    bgColor: 'bg-slate-500',
    lightBg: 'bg-slate-50',
    textColor: 'text-slate-600',
    borderColor: 'border-slate-200',
    emoji: '⏳',
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
  const [selectedStudent, setSelectedStudent] =
    useState<StudentHomeworkInfo | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState<string | null>(null)

  // Get students with the selected status in any homework
  const studentsWithStatus = useMemo(() => {
    const result: StudentHomeworkInfo[] = []

    students.forEach((student) => {
      const homeworksWithStatus: {
        homework: Homework
        status: HomeworkStatus
      }[] = []

      homeworks.forEach((hw) => {
        // Check if student is target of this homework
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
      .sort(
        (a, b) => b.homeworksWithStatus.length - a.homeworksWithStatus.length,
      )
  }, [students, homeworks, selectedStatus, searchTerm])

  // Get all homeworks for a student (for modal)
  const getAllHomeworksForStudent = (student: Student) => {
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
    const allHomeworks = getAllHomeworksForStudent(info.student)
    setSelectedStudent({
      student: info.student,
      homeworksWithStatus: allHomeworks.map((h) => ({
        homework: h.homework,
        status: h.status,
      })),
    })
  }

  const config = STATUS_CONFIG[selectedStatus]

  return (
    <div className="space-y-4">
      {/* Status Filter Buttons */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">
          Duruma Göre Filtrele
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {(
            Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>
          ).map((status) => {
            const cfg = STATUS_CONFIG[status]
            const isActive = selectedStatus === status
            return (
              <button
                key={status}
                onClick={() => setSelectedStatus(status as HomeworkStatus)}
                className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all whitespace-nowrap flex items-center gap-2 ${
                  isActive
                    ? `${cfg.bgColor} text-white border-transparent shadow-md`
                    : `bg-white ${cfg.textColor} ${cfg.borderColor} hover:${cfg.lightBg}`
                }`}
              >
                <i className={cfg.icon}></i>
                {cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Öğrenci veya veli ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
      </div>

      {/* Stats */}
      <div
        className={`${config.lightBg} ${config.borderColor} border rounded-xl p-4`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 ${config.bgColor} rounded-full flex items-center justify-center`}
          >
            <i className={`${config.icon} text-white text-xl`}></i>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">
              {studentsWithStatus.length}
            </div>
            <div className={`text-sm ${config.textColor} font-medium`}>
              öğrenci "{config.label}" durumunda
            </div>
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className="space-y-3">
        {studentsWithStatus.length === 0 ? (
          <div className="text-center p-10 bg-white rounded-xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-check-circle text-slate-400 text-2xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-slate-800">
              Bu durumda öğrenci yok
            </h3>
            <p className="text-slate-500 mt-2">
              "{config.label}" durumunda öğrenci bulunamadı.
            </p>
          </div>
        ) : (
          studentsWithStatus.map((info) => (
            <div
              key={info.student.id}
              onClick={() => handleStudentClick(info)}
              className={`bg-white p-4 rounded-xl shadow-sm border ${config.borderColor} cursor-pointer hover:shadow-md transition-all`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    {info.student.name}
                    <span
                      className={`text-xs ${config.lightBg} ${config.textColor} px-2 py-0.5 rounded-full font-bold`}
                    >
                      {info.student.className}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Veli: {info.student.parentName}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className={`${config.lightBg} ${config.textColor} px-3 py-1 rounded-full text-sm font-bold`}
                  >
                    {info.homeworksWithStatus.length} ödev
                  </div>
                  <i className="fas fa-chevron-right text-slate-400"></i>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-slate-800">
                  {selectedStudent.student.name}
                </h3>
                <p className="text-sm text-slate-500">
                  {selectedStudent.student.className} - Veli:{' '}
                  {selectedStudent.student.parentName}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="w-10 h-10 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <i className="fas fa-times text-slate-500"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-3">
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                Tüm Ödevler
              </h4>
              {selectedStudent.homeworksWithStatus.map(
                ({ homework, status }) => {
                  const statusCfg =
                    STATUS_CONFIG[status] || STATUS_CONFIG.PENDING
                  const isNotified =
                    homework.notifiedStudents?.[selectedStudent.student.id] ||
                    false
                  const needsNotification =
                    status === HomeworkStatus.DONE ||
                    status === HomeworkStatus.MISSING ||
                    status === HomeworkStatus.INCOMPLETE ||
                    status === HomeworkStatus.ABSENT

                  return (
                    <div
                      key={homework.id}
                      className={`p-4 rounded-xl border ${statusCfg.borderColor} ${statusCfg.lightBg}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h5 className="font-bold text-slate-800 flex items-center gap-2">
                            <span className="text-lg">{statusCfg.emoji}</span>
                            {homework.title}
                          </h5>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                            {homework.description}
                          </p>
                        </div>
                        {needsNotification && (
                          <button
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
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
                              isNotified
                                ? 'bg-amber-500 text-white hover:bg-amber-600'
                                : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                          >
                            <i
                              className={`${isNotified ? 'fas fa-redo' : 'fab fa-whatsapp'} text-sm`}
                            ></i>
                            {isLoading ===
                            `${selectedStudent.student.id}-${homework.id}`
                              ? '...'
                              : isNotified
                                ? 'Tekrar'
                                : 'Bildir'}
                          </button>
                        )}
                      </div>

                      {/* Status Change Buttons */}
                      <div className="flex gap-1.5">
                        {(
                          [
                            'DONE',
                            'MISSING',
                            'INCOMPLETE',
                            'ABSENT',
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
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-center gap-1 ${
                                isActive
                                  ? `${sCfg.bgColor} text-white border-transparent`
                                  : `bg-white ${sCfg.textColor} ${sCfg.borderColor} hover:${sCfg.lightBg}`
                              }`}
                              title={sCfg.label}
                            >
                              <i className={sCfg.icon}></i>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                },
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StatusFilterView
