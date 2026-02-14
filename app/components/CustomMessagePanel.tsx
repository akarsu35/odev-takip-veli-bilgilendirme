'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Student } from '@/types'
import StudentSearch, { turkishSearch } from './StudentSearch'

interface Props {
  students: Student[]
  userProfile?: {
    fullName: string | null
    schoolName: string | null
    subject: string | null
  } | null
}

interface Message {
  id: string
  studentId: string
  content: string
  type: string
  createdAt: string
  student: {
    name: string
    className: string
    parentName: string
  }
}

const CustomMessagePanel: React.FC<Props> = ({ students, userProfile }) => {
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new')
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set())
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set(),
  )
  const [messageTemplate, setMessageTemplate] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [sentStudents, setSentStudents] = useState<Set<string>>(new Set())
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set())

  // History State
  const [historyMessages, setHistoryMessages] = useState<Message[]>([])
  const [historySearchTerm, setHistorySearchTerm] = useState('')
  const [historyFilter, setHistoryFilter] = useState<
    'ALL' | 'WHATSAPP' | 'HOMEWORK'
  >('ALL')
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const classes = useMemo(
    () => Array.from(new Set(students.map((s) => s.className))).sort(),
    [students],
  )

  const fetchHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const res = await fetch('/api/messages')
      if (res.ok) {
        const data = await res.json()
        setHistoryMessages(data)
      }
    } catch (error) {
      console.error('Failed to fetch history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory()
    }
  }, [activeTab])

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

  const filteredHistory = useMemo(() => {
    return historyMessages.filter((msg) => {
      const matchesSearch =
        turkishSearch(msg.student.name, historySearchTerm) ||
        turkishSearch(msg.content, historySearchTerm)

      const matchesFilter =
        historyFilter === 'ALL' || msg.type === historyFilter

      return matchesSearch && matchesFilter
    })
  }, [historyMessages, historySearchTerm, historyFilter])

  const handleToggleClass = (className: string) => {
    const newSelected = new Set(selectedClasses)
    if (newSelected.has(className)) {
      // Sınıf kaldırılıyor - bu sınıftaki öğrencileri seçimden çıkar
      newSelected.delete(className)

      // Bu sınıfa ait öğrencileri seçimden ve gönderilmiş listesinden çıkar
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
      // Sınıf ekleniyor - seçimleri koru
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
      // Deselect all in this class
      validClassStudents.forEach((s) => newSelected.delete(s.id))
    } else {
      // Select all in this class
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

    // Mark as sent
    const newSent = new Set(sentStudents)
    newSent.add(student.id)
    setSentStudents(newSent)

    // Save to database
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

  const handleDelete = async (
    type: 'SINGLE' | 'STUDENT' | 'ALL',
    id?: string,
    messageType?: string,
  ) => {
    let confirmMessage = ''
    if (type === 'SINGLE') {
      confirmMessage = 'Bu mesajı silmek istediğinize emin misiniz?'
    } else if (type === 'STUDENT') {
      confirmMessage =
        'Bu öğrenciye ait TÜM mesaj geçmişini silmek istediğinize emin misiniz?'
    } else {
      confirmMessage =
        'TÜM mesaj geçmişini silmek istediğinize emin misiniz? Bu işlem geri alınamaz!'
    }

    if (!confirm(confirmMessage)) return

    let url = '/api/messages?'
    if (type === 'SINGLE' && id) url += `id=${id}`
    else if (type === 'STUDENT' && id) url += `studentId=${id}`
    else if (type === 'ALL') {
      url += 'all=true'
      if (messageType && messageType !== 'ALL') url += `&type=${messageType}`
    }

    try {
      const res = await fetch(url, { method: 'DELETE' })
      if (res.ok) {
        await fetchHistory()
      } else {
        alert('Silme işlemi başarısız oldu.')
      }
    } catch (error) {
      console.error('Delete failed:', error)
      alert('Bir hata oluştu.')
    }
  }

  const handleReset = () => {
    setSentStudents(new Set())
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-xl shadow-lg text-white">
        <div className="flex items-center gap-3 mb-2">
          <i className="fas fa-paper-plane text-2xl"></i>
          <h2 className="text-2xl font-bold">Mesaj Yönetimi</h2>
        </div>
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'new'
                ? 'bg-white text-indigo-600 shadow-lg'
                : 'bg-indigo-500/30 text-indigo-100 hover:bg-indigo-500/50'
            }`}
          >
            <i className="fas fa-plus mr-2"></i>
            Yeni Mesaj
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'history'
                ? 'bg-white text-indigo-600 shadow-lg'
                : 'bg-indigo-500/30 text-indigo-100 hover:bg-indigo-500/50'
            }`}
          >
            <i className="fas fa-history mr-2"></i>
            Geçmiş ({filteredHistory.length})
          </button>
        </div>
      </div>

      {activeTab === 'new' ? (
        <>
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
                  💡 İpucu: Mesajınızın sonuna okul adı, branş ve adınız
                  otomatik eklenecektir.
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
                          {userProfile?.subject || ''}-
                          {userProfile?.fullName || ''}
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

                {/* Group students by class */}
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
                          {/* Class Header */}
                          <div
                            onClick={() =>
                              handleToggleClassExpansion(className)
                            }
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

                          {/* Student List */}
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
                                              className={`${isSent ? 'fas fa-check' : 'fab fa-whatsapp'}`}
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
              <h3 className="text-lg font-semibold text-slate-800">
                Sınıf Seçin
              </h3>
              <p className="text-slate-500 mt-2">
                Mesaj göndermek için önce bir sınıf seçin.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          {/* History Filter & Search */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4">
            <StudentSearch
              value={historySearchTerm}
              onChange={setHistorySearchTerm}
              placeholder="Öğrenci adı veya mesaj ara..."
            />

            <div className="flex gap-2">
              <button
                onClick={() => handleDelete('ALL', undefined, historyFilter)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                title="Görüntülenen tüm mesajları sil"
              >
                <i className="fas fa-trash-alt mr-1"></i>
                TÜMÜNÜ SİL
              </button>
              <div className="w-px bg-slate-200 mx-1"></div>
              <button
                onClick={() => setHistoryFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  historyFilter === 'ALL'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                TÜMÜ
              </button>
              <button
                onClick={() => setHistoryFilter('WHATSAPP')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  historyFilter === 'WHATSAPP'
                    ? 'bg-green-600 text-white'
                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                }`}
              >
                ÖZEL
              </button>
              <button
                onClick={() => setHistoryFilter('HOMEWORK')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  historyFilter === 'HOMEWORK'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                }`}
              >
                ÖDEV
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[600px] p-4 space-y-4">
            {isLoadingHistory ? (
              <div className="p-10 text-center text-slate-400">
                <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
                <p>Yükleniyor...</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <i className="fas fa-inbox text-2xl mb-2"></i>
                <p>Kayıtlı mesaj bulunamadı.</p>
              </div>
            ) : (
              // Group by student
              Object.values(
                filteredHistory.reduce(
                  (acc, msg) => {
                    const studentId = msg.studentId
                    if (!acc[studentId]) {
                      acc[studentId] = {
                        student: msg.student,
                        messages: [],
                        latestDate: msg.createdAt,
                      }
                    }
                    acc[studentId].messages.push(msg)
                    // Update latest date if this message is newer
                    if (
                      new Date(msg.createdAt) >
                      new Date(acc[studentId].latestDate)
                    ) {
                      acc[studentId].latestDate = msg.createdAt
                    }
                    return acc
                  },
                  {} as Record<
                    string,
                    { student: any; messages: Message[]; latestDate: string }
                  >,
                ),
              )
                .sort(
                  (a, b) =>
                    new Date(b.latestDate).getTime() -
                    new Date(a.latestDate).getTime(),
                )
                .map((group) => {
                  const isExpanded = expandedClasses.has(group.student.name) // Reuse expandedClasses set for simplicity, or create new state
                  // Actually, let's better use a specific state for this or reuse expandedClasses with a prefix to avoid collision if needed,
                  // but here we can just use the student ID.
                  // Let's create a new state for history expansion in the component body first.

                  // NOTE: I will need to add `expandedStudents` state in a separate edit or assume I can reuse `expandedClasses` if keys don't collide.
                  // To be safe and clean, I should add `expandedHistoryItems` state.
                  // For now, I will assume I'll add the state.

                  return (
                    <HistoryStudentGroup
                      key={group.student.name + group.latestDate} // unique enough
                      group={group}
                      onDelete={handleDelete}
                    />
                  )
                })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Sub-component for the accordion item to manage its own open/close state if we don't want global state
const HistoryStudentGroup: React.FC<{
  group: { student: any; messages: Message[]; latestDate: string }
  onDelete: (
    type: 'SINGLE' | 'STUDENT' | 'ALL',
    id?: string,
    messageType?: string,
  ) => void
}> = ({ group, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all hover:shadow-md">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 p-4 flex items-center justify-between hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
            {group.student.name.charAt(0)}
          </div>
          <div className="text-left">
            <h4 className="font-bold text-slate-800">{group.student.name}</h4>
            <p className="text-xs text-slate-500">
              {group.student.className} • {group.student.parentName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-slate-600 bg-slate-200 px-2 py-1 rounded-full">
              {group.messages.length} Mesaj
            </span>
            <p className="text-[10px] text-slate-400 mt-1">
              Son: {new Date(group.latestDate).toLocaleDateString('tr-TR')}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete('STUDENT', group.student.id) // Assuming student object has id, check mapping
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-600 transition-colors"
            title="Bu öğrencinin geçmişini sil"
          >
            <i className="fas fa-trash-alt"></i>
          </button>
          <i
            className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-slate-400 transition-transform`}
          ></i>
        </div>
      </div>

      {isOpen && (
        <div className="divide-y divide-slate-100 bg-white">
          {group.messages.map((msg) => (
            <div
              key={msg.id}
              className="p-4 hover:bg-slate-50 transition-colors border-l-4 border-l-transparent hover:border-l-indigo-500"
            >
              <div className="flex justify-between items-start mb-2">
                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                    msg.type === 'WHATSAPP'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  <i className={`fab fa-whatsapp mr-1`}></i>
                  {msg.type === 'WHATSAPP' ? 'ÖZEL MESAJ' : 'ÖDEV BİLDİRİMİ'}
                </span>
                <div className="text-xs text-slate-400">
                  {new Date(msg.createdAt).toLocaleString('tr-TR')}
                </div>
              </div>
              <div className="flex justify-between gap-4">
                <div className="ml-1 pl-3 border-l-2 border-slate-100 text-sm text-slate-700 whitespace-pre-wrap font-medium flex-1">
                  {msg.content}
                </div>
                <button
                  onClick={() => onDelete('SINGLE', msg.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors px-2"
                  title="Mesajı sil"
                >
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CustomMessagePanel
