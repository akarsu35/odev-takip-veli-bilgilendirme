'use client'

import React, { useState, useMemo } from 'react'
import { Student } from '@/types'
import StudentSearch, { turkishSearch } from '../StudentSearch'

interface Props {
  students: Student[]
  userProfile?: {
    fullName: string | null
    schoolName: string | null
    subject: string | null
  } | null
}

export const MessageComposer: React.FC<Props> = ({ students, userProfile }) => {
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set())
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set(),
  )
  const [messageTemplate, setMessageTemplate] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [sentStudents, setSentStudents] = useState<Set<string>>(new Set())
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set())

  const classes = useMemo(
    () => Array.from(new Set(students.map((s) => s.className))).sort(),
    [students],
  )

  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        if (selectedClasses.size === 0) return false
        if (!selectedClasses.has(s.className)) return false
        return (
          turkishSearch(s.name, searchTerm) ||
          turkishSearch(s.parentName, searchTerm)
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
  }, [students, selectedClasses, searchTerm])

  const handleToggleClass = (className: string) => {
    const newSelected = new Set(selectedClasses)
    if (newSelected.has(className)) {
      newSelected.delete(className)
      const studentsInClass = students
        .filter((s) => s.className === className)
        .map((s) => s.id)

      const newSelectedStudents = new Set(selectedStudentIds)
      const newSentStudents = new Set(sentStudents)

      studentsInClass.forEach((id) => {
        newSelectedStudents.delete(id)
        newSentStudents.delete(id)
      })

      setSelectedStudentIds(newSelectedStudents)
      setSentStudents(newSentStudents)
    } else {
      newSelected.add(className)
    }
    setSelectedClasses(newSelected)
  }

  const handleToggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudentIds)
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId)
    } else {
      newSelected.add(studentId)
    }
    setSelectedStudentIds(newSelected)
  }

  const handleToggleClassExpansion = (className: string) => {
    const newExpanded = new Set(expandedClasses)
    if (newExpanded.has(className)) {
      newExpanded.delete(className)
    } else {
      newExpanded.add(className)
    }
    setExpandedClasses(newExpanded)
  }

  const handleSelectClass = (className: string) => {
    const classStudents = students.filter((s) => s.className === className)
    const validClassStudents = classStudents.filter((s) => {
      if (!selectedClasses.has(s.className)) return false
      return (
        turkishSearch(s.name, searchTerm) ||
        turkishSearch(s.parentName, searchTerm)
      )
    })

    const allSelected = validClassStudents.every((s) =>
      selectedStudentIds.has(s.id),
    )

    const newSelected = new Set(selectedStudentIds)
    if (allSelected) {
      validClassStudents.forEach((s) => newSelected.delete(s.id))
    } else {
      validClassStudents.forEach((s) => newSelected.add(s.id))
    }
    setSelectedStudentIds(newSelected)
  }

  const handleSendMessage = async (student: Student) => {
    const signature =
      userProfile?.schoolName || userProfile?.subject || userProfile?.fullName
        ? `\n\n${userProfile?.schoolName || ''}-${userProfile?.subject || ''}-${userProfile?.fullName || ''}`
        : ''

    const finalMessage = messageTemplate + signature
    const encodedMessage = encodeURIComponent(finalMessage)
    const phone = student.parentPhone.startsWith('9')
      ? student.parentPhone
      : `9${student.parentPhone}`
    const url = `https://wa.me/${phone}?text=${encodedMessage}`

    window.open(url, '_blank')

    const newSent = new Set(sentStudents)
    newSent.add(student.id)
    setSentStudents(newSent)

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          content: finalMessage,
          type: 'WHATSAPP',
          student: student,
        }),
      })
    } catch (error) {
      console.error('Failed to save message:', error)
    }
  }

  const handleReset = () => {
    setSentStudents(new Set())
  }

  return (
    <div className="space-y-4">
      {/* Class Selection */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">
          Sınıflar Seçin ({selectedClasses.size} seçili)
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {classes.map((c) => (
            <button
              key={c}
              onClick={() => handleToggleClass(c)}
              className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all whitespace-nowrap ${
                selectedClasses.has(c)
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              }`}
            >
              {c} Sınıfı
            </button>
          ))}
        </div>
      </div>

      {selectedClasses.size > 0 && (
        <>
          {/* Message Template */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Mesaj Metni
            </label>
            <textarea
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              placeholder="Mesajınızı buraya yazın... (İmza otomatik eklenecektir)"
              rows={6}
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
            />
            <div className="text-xs text-slate-500">
              💡 İpucu: Mesajınızın sonuna okul adı, branş ve adınız otomatik
              eklenecektir.
            </div>
            {messageTemplate && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">
                  Önizleme
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {messageTemplate}
                  {(userProfile?.schoolName ||
                    userProfile?.subject ||
                    userProfile?.fullName) && (
                    <span className="text-slate-500">
                      {'\n\n'}
                      {userProfile?.schoolName || ''}-
                      {userProfile?.subject || ''}-{userProfile?.fullName || ''}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Student Selection by Class */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Öğrenci Seçimi ({selectedStudentIds.size} seçili)
              </label>
              <div className="flex gap-2">
                {sentStudents.size > 0 && (
                  <button
                    onClick={handleReset}
                    className="text-xs font-bold text-amber-600 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Sıfırla
                  </button>
                )}
              </div>
            </div>

            <div className="px-2">
              <StudentSearch value={searchTerm} onChange={setSearchTerm} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto px-2">
              {Array.from(selectedClasses)
                .sort()
                .map((className) => {
                  const classStudents = filteredStudents.filter(
                    (s) => s.className === className,
                  )
                  const selectedInClass = classStudents.filter((s) =>
                    selectedStudentIds.has(s.id),
                  ).length
                  const isAllSelected =
                    classStudents.length > 0 &&
                    selectedInClass === classStudents.length
                  const isExpanded = expandedClasses.has(className)

                  return (
                    <div
                      key={className}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                    >
                      <div
                        onClick={() => handleToggleClassExpansion(className)}
                        className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3 cursor-pointer hover:from-indigo-100 hover:to-purple-100 transition-colors border-b border-indigo-100"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <i
                              className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} text-indigo-600 text-xs`}
                            ></i>
                            <span className="font-bold text-indigo-900">
                              {className}
                            </span>
                            <span className="text-xs bg-indigo-200 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                              {classStudents.length} öğrenci
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelectClass(className)
                            }}
                            className={`text-xs font-bold px-2 py-1 rounded transition-colors ${
                              isAllSelected
                                ? 'text-indigo-600 bg-indigo-100 hover:bg-indigo-200'
                                : 'text-slate-500 bg-white border border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {isAllSelected ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-2 space-y-1.5 max-h-[300px] overflow-y-auto">
                          {classStudents.length === 0 ? (
                            <p className="text-center text-slate-400 text-sm py-4">
                              Öğrenci bulunamadı
                            </p>
                          ) : (
                            classStudents.map((student) => {
                              const isSelected = selectedStudentIds.has(
                                student.id,
                              )
                              const isSent = sentStudents.has(student.id)
                              return (
                                <div
                                  key={student.id}
                                  className={`p-2 rounded-lg border transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-indigo-50 border-indigo-200'
                                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                                  } ${isSent ? 'opacity-60' : ''}`}
                                  onClick={() =>
                                    handleToggleStudent(student.id)
                                  }
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <div
                                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                          isSelected
                                            ? 'bg-indigo-600 border-indigo-600'
                                            : 'border-slate-300'
                                        }`}
                                      >
                                        {isSelected && (
                                          <i className="fas fa-check text-white text-[10px]"></i>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm text-slate-800 flex items-center gap-2 truncate">
                                          {student.name}
                                          {isSent && (
                                            <i className="fas fa-check-circle text-emerald-500 text-xs flex-shrink-0"></i>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-slate-500 truncate">
                                          {student.parentName}
                                        </div>
                                      </div>
                                    </div>

                                    {isSelected && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (messageTemplate) {
                                            handleSendMessage(student)
                                          } else {
                                            alert(
                                              'Lütfen önce mesaj metni girin.',
                                            )
                                          }
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 flex-shrink-0 ${
                                          !messageTemplate
                                            ? 'bg-slate-200 text-slate-400 cursor-help'
                                            : isSent
                                              ? 'bg-emerald-100 text-emerald-600 cursor-default'
                                              : 'bg-green-500 text-white hover:bg-green-600 shadow-sm'
                                        }`}
                                        title={
                                          !messageTemplate
                                            ? 'Lütfen önce mesaj metni girin'
                                            : ''
                                        }
                                      >
                                        <i
                                          className={`${
                                            isSent
                                              ? 'fas fa-check'
                                              : 'fab fa-whatsapp'
                                          }`}
                                        ></i>
                                        {isSent ? 'Gönderildi' : 'Gönder'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        </>
      )}

      {selectedClasses.size === 0 && (
        <div className="flex flex-col items-center justify-center p-20 text-center bg-white rounded-2xl border border-dashed border-slate-300">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <i className="fas fa-hand-pointer text-indigo-600 text-2xl"></i>
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Sınıf Seçin</h3>
          <p className="text-slate-500 mt-2">
            Mesaj göndermek için önce bir sınıf seçin.
          </p>
        </div>
      )}
    </div>
  )
}
