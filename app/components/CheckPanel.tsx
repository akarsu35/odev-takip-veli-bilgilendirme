'use client'

import React, { useEffect, useState } from 'react'
import { Student, Homework, HomeworkStatus } from '@/types'
import { generateParentMessage } from '@/services/geminiService'

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

  const classes = Array.from(new Set(students.map((s) => s.className))).sort()

  // Reset selected homework when class changes
  useEffect(() => {
    const classHws = homeworks.filter((h) =>
      h.targetClasses?.includes(selectedClass),
    )
    if (classHws.length > 0) {
      setSelectedHwId(classHws[0].id)
    } else {
      setSelectedHwId('')
    }
  }, [selectedClass, homeworks])

  // If a class is not selected yet, pick the first one if available
  useEffect(() => {
    if (!selectedClass && classes.length > 0) {
      setSelectedClass(classes[0])
    }
  }, [classes, selectedClass])

  const filteredHomeworks = homeworks.filter((h) =>
    h.targetClasses?.includes(selectedClass),
  )
  const selectedHw = homeworks.find((h) => h.id === selectedHwId)

  const filteredStudents = students.filter((s) => {
    const isRoomMatch = s.className === selectedClass
    if (!isRoomMatch) return false

    // If homework has specific targets, only show those students
    if (
      selectedHw?.targetStudentIds &&
      selectedHw.targetStudentIds.length > 0
    ) {
      return selectedHw.targetStudentIds.includes(s.id)
    }

    return true
  })

  const handleSendWhatsApp = async (
    student: Student,
    status: HomeworkStatus,
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
    )
    setIsLoading(null)

    const encodedMessage = encodeURIComponent(message)
    const phone = student.parentPhone.startsWith('9')
      ? student.parentPhone
      : `9${student.parentPhone}`
    const url = `https://wa.me/${phone}?text=${encodedMessage}`

    window.open(url, '_blank')
    onMarkNotified(selectedHwId, student.id)
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
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 sticky top-[72px] z-40 space-y-3">
        <div>
          <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">
            1. Sınıf Seçin
          </label>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {classes.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedClass(c)}
                className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all whitespace-nowrap ${
                  selectedClass === c
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {c} Sınıfı
              </button>
            ))}
          </div>
        </div>

        {selectedClass && (
          <div>
            <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">
              2. Ödev Seçin
            </label>
            {filteredHomeworks.length > 0 ? (
              <select
                value={selectedHwId}
                onChange={(e) => setSelectedHwId(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 font-medium"
              >
                {filteredHomeworks.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.title}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-orange-500 font-bold bg-orange-50 p-3 rounded-lg border border-orange-100">
                Bu sınıf için henüz ödev oluşturulmamış.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Student List */}
      <div className="space-y-3">
        {selectedClass && filteredStudents.length === 0 ? (
          <p className="text-center p-10 text-slate-400 italic">
            Bu sınıfta öğrenci bulunamadı.
          </p>
        ) : (
          filteredStudents.map((student) => {
            const status =
              selectedHw?.submissions[student.id] || HomeworkStatus.PENDING
            const isMissing =
              status === HomeworkStatus.MISSING ||
              status === HomeworkStatus.INCOMPLETE
            const isNotified =
              selectedHw?.notifiedStudents?.[student.id] || false

            return (
              <div
                key={student.id}
                className={`bg-white p-4 rounded-xl shadow-sm border transition-all ${
                  isNotified ? 'opacity-80' : ''
                }`}
              >
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      {student.name}
                      {isNotified && (
                        <i className="fas fa-check-circle text-emerald-500 text-sm"></i>
                      )}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Veli: {student.parentName}
                    </p>
                  </div>

                  {isMissing && selectedHw && (
                    <button
                      onClick={() => handleSendWhatsApp(student, status)}
                      disabled={isLoading === student.id || isNotified}
                      className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition shadow-sm ${
                        isNotified
                          ? 'bg-slate-100 text-slate-400 border border-slate-200'
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      <i
                        className={`${
                          isNotified ? 'fas fa-check' : 'fab fa-whatsapp'
                        } text-sm`}
                      ></i>
                      {isLoading === student.id
                        ? '...'
                        : isNotified
                          ? 'BİLDİRİLDİ'
                          : 'BİLDİR'}
                    </button>
                  )}
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <StatusButton
                    label="Tamam"
                    active={status === HomeworkStatus.DONE}
                    color="bg-green-50 text-green-600 border-green-100"
                    activeColor="bg-green-600 text-white border-green-600"
                    onClick={() =>
                      onUpdateStatus(
                        selectedHwId,
                        student.id,
                        HomeworkStatus.DONE,
                      )
                    }
                  />
                  <StatusButton
                    label="Yapılmadı"
                    active={status === HomeworkStatus.MISSING}
                    color="bg-red-50 text-red-600 border-red-100"
                    activeColor="bg-red-600 text-white border-red-600"
                    onClick={() =>
                      onUpdateStatus(
                        selectedHwId,
                        student.id,
                        HomeworkStatus.MISSING,
                      )
                    }
                  />
                  <StatusButton
                    label="Eksik"
                    active={status === HomeworkStatus.INCOMPLETE}
                    color="bg-orange-50 text-orange-600 border-orange-100"
                    activeColor="bg-orange-600 text-white border-orange-600"
                    onClick={() =>
                      onUpdateStatus(
                        selectedHwId,
                        student.id,
                        HomeworkStatus.INCOMPLETE,
                      )
                    }
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
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
    className={`flex-1 min-w-[80px] text-center py-2 rounded-lg text-[10px] font-black border transition-all uppercase tracking-tighter ${
      active ? activeColor : color
    }`}
  >
    {label}
  </button>
)

export default CheckPanel
