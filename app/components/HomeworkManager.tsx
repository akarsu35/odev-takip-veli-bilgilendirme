'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Homework, Student, HomeworkStatus } from '@/types'
import { suggestHomeworkDescription } from '@/services/geminiService'
import toast from 'react-hot-toast'
import StudentSearch, { turkishSearch } from './StudentSearch'
import BulkNotificationModal from './BulkNotificationModal'
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
  homeworks: Homework[]
  students: Student[]
  userProfile?: {
    fullName: string | null
    schoolName: string | null
    subject: string | null
  } | null
  onAdd: (h: Homework) => void
  onDelete: (id: string) => void
  onUpdate: (h: Homework) => void
  onUpdateStatus: (
    hwId: string,
    studentId: string,
    status: HomeworkStatus,
  ) => void
  onMarkNotified?: (hwId: string, studentId: string) => void
}

const HomeworkManager: React.FC<Props> = ({
  homeworks,
  students,
  userProfile,
  onAdd,
  onDelete,
  onUpdate,
  onUpdateStatus,
  onMarkNotified,
}) => {
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [targetClasses, setTargetClasses] = useState<string[]>([])
  const [targetStudentIds, setTargetStudentIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [classFilter, setClassFilter] = useState<string>('ALL')
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [analyzingHomeworkId, setAnalyzingHomeworkId] = useState<string | null>(
    null,
  )
  const [isMounted, setIsMounted] = useState(false)

  // Prevent SSR hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const analyzingHomework = useMemo(
    () => homeworks.find((h) => h.id === analyzingHomeworkId) || null,
    [homeworks, analyzingHomeworkId],
  )
  const [analysisFilter, setAnalysisFilter] = useState<string>('ALL')
  const [analysisSearchTerm, setAnalysisSearchTerm] = useState<string>('')
  const [notifyModalHomework, setNotifyModalHomework] =
    useState<Homework | null>(null)

  const existingClasses = useMemo(
    () => Array.from(new Set(students.map((s) => s.className))).sort(),
    [students],
  )

  const handleSuggest = async () => {
    if (!title) return
    setIsSuggesting(true)
    try {
      const desc = await suggestHomeworkDescription(title)
      setDescription(desc)
    } catch (error) {
      toast.error('Öneri alınamadı')
    } finally {
      setIsSuggesting(false)
    }
  }

  const handleEdit = (homework: Homework) => {
    setEditingHomework(homework)
    setTitle(homework.title)
    setDescription(homework.description)
    setDueDate(homework.dueDate)
    setTargetClasses(homework.targetClasses)
    setTargetStudentIds(homework.targetStudentIds || [])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancel = () => {
    setEditingHomework(null)
    setTitle('')
    setDescription('')
    setDueDate('')
    setTargetClasses([])
    setTargetStudentIds([])
  }

  const toggleClass = (className: string) => {
    setTargetClasses((prev) =>
      prev.includes(className)
        ? prev.filter((c) => c !== className)
        : [...prev, className],
    )
  }

  const toggleStudent = (id: string) => {
    setTargetStudentIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id],
    )
  }

  const availableStudents = useMemo(
    () =>
      students
        .filter((s) => targetClasses.includes(s.className))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [students, targetClasses],
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || targetClasses.length === 0) {
      toast.error('Lütfen başlık ve en az bir sınıf seçin')
      return
    }

    if (editingHomework) {
      onUpdate({
        ...editingHomework,
        title,
        description,
        dueDate: dueDate || new Date().toISOString(),
        targetClasses,
        targetStudentIds,
      })
      toast.success('Ödev başarıyla güncellendi 📝')
      handleCancel()
    } else {
      onAdd({
        id: Date.now().toString(),
        title,
        description,
        assignedDate: new Date().toISOString(),
        dueDate: dueDate || new Date().toISOString(),
        targetClasses,
        targetStudentIds,
        submissions: {},
      })
      toast.success('Yeni ödev başarıyla oluşturuldu ✨')

      setTitle('')
      setDescription('')
      setDueDate('')
      setTargetClasses([])
      setTargetStudentIds([])
    }
  }

  // Analysis View Implementation
  if (analyzingHomework) {
    const relevantStudents = students
      .filter((s) => {
        if (
          analyzingHomework.targetStudentIds &&
          analyzingHomework.targetStudentIds.length > 0
        ) {
          return analyzingHomework.targetStudentIds.includes(s.id)
        }
        return analyzingHomework.targetClasses.includes(s.className)
      })
      .sort((a, b) => a.name.localeCompare(b.name))

    const filteredStudents = relevantStudents.filter((s) => {
      const status =
        analyzingHomework.submissions[s.id] || HomeworkStatus.PENDING
      const statusMatch = analysisFilter === 'ALL' || status === analysisFilter
      const searchMatch =
        turkishSearch(s.name, analysisSearchTerm) ||
        turkishSearch(s.parentName, analysisSearchTerm)
      return statusMatch && searchMatch
    })

    const statsArray = [
      {
        label: 'Toplam',
        count: relevantStudents.length,
        color: 'indigo',
        icon: 'fas fa-users',
      },
      {
        label: 'Tamam',
        count: relevantStudents.filter(
          (s) => analyzingHomework.submissions[s.id] === HomeworkStatus.DONE,
        ).length,
        color: 'emerald',
        icon: 'fas fa-check-circle',
      },
      {
        label: 'Yapmadı',
        count: relevantStudents.filter(
          (s) => analyzingHomework.submissions[s.id] === HomeworkStatus.MISSING,
        ).length,
        color: 'rose',
        icon: 'fas fa-times-circle',
      },
      {
        label: 'Eksik',
        count: relevantStudents.filter(
          (s) =>
            analyzingHomework.submissions[s.id] === HomeworkStatus.INCOMPLETE,
        ).length,
        color: 'amber',
        icon: 'fas fa-exclamation-circle',
      },
      {
        label: 'Gelmedi',
        count: relevantStudents.filter(
          (s) => analyzingHomework.submissions[s.id] === HomeworkStatus.ABSENT,
        ).length,
        color: 'violet',
        icon: 'fas fa-user-slash',
      },
      {
        label: 'Getirmedi',
        count: relevantStudents.filter(
          (s) =>
            analyzingHomework.submissions[s.id] === HomeworkStatus.NOT_BROUGHT,
        ).length,
        color: 'blue',
        icon: 'fas fa-box',
      },
    ]

    return (
      <div className="space-y-6">
        <Card className="border-indigo-100 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-xl font-bold text-slate-800">
                {analyzingHomework.title}
              </CardTitle>
              <CardDescription className="font-medium">
                {analyzingHomework.description}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnalyzingHomeworkId(null)}
              className="font-bold border-slate-200"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Geri Dön
            </Button>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {statsArray.map((stat) => (
            <Card
              key={stat.label}
              className={cn('border-none shadow-sm', `bg-${stat.color}-50`)}
            >
              <CardContent className="p-4 text-center">
                <div
                  className={cn(
                    'text-2xl font-black mb-1',
                    `text-${stat.color}-700`,
                  )}
                >
                  {stat.count}
                </div>
                <div
                  className={cn(
                    'text-[10px] font-black uppercase tracking-wider',
                    `text-${stat.color}-600/70`,
                  )}
                >
                  {stat.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-sm border-slate-100">
          <CardHeader className="p-4 border-b border-slate-100 space-y-4">
            <StudentSearch
              value={analysisSearchTerm}
              onChange={setAnalysisSearchTerm}
              placeholder="Öğrenci veya veli ara..."
            />
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {[
                'ALL',
                'PENDING',
                'DONE',
                'MISSING',
                'INCOMPLETE',
                'ABSENT',
                'NOT_BROUGHT',
              ].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setAnalysisFilter(filter)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap uppercase tracking-tighter',
                    analysisFilter === filter
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                  )}
                >
                  {filter === 'ALL'
                    ? 'TÜMÜ'
                    : filter === 'PENDING'
                      ? 'BEKLEYEN'
                      : filter === 'DONE'
                        ? 'TAMAM'
                        : filter === 'MISSING'
                          ? 'YAPILMADI'
                          : filter === 'INCOMPLETE'
                            ? 'EKSİK'
                            : filter === 'ABSENT'
                              ? 'GELMEDİ'
                              : 'GETİRMEDİ'}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 max-h-[1000px] overflow-y-auto">
              {filteredStudents.map((student) => {
                const status =
                  analyzingHomework.submissions[student.id] ||
                  HomeworkStatus.PENDING
                return (
                  <div
                    key={student.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">
                        {student.name}
                      </div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {student.className} • {student.parentName}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {[
                        {
                          status: HomeworkStatus.DONE,
                          icon: 'fa-check',
                          color: 'emerald',
                          title: 'Tamamlandı',
                        },
                        {
                          status: HomeworkStatus.MISSING,
                          icon: 'fa-times',
                          color: 'rose',
                          title: 'Yapılmadı',
                        },
                        {
                          status: HomeworkStatus.INCOMPLETE,
                          icon: 'fa-exclamation',
                          color: 'amber',
                          title: 'Eksik',
                        },
                        {
                          status: HomeworkStatus.ABSENT,
                          icon: 'fa-user-slash',
                          color: 'violet',
                          title: 'Gelmedi',
                        },
                        {
                          status: HomeworkStatus.NOT_BROUGHT,
                          icon: 'fa-box',
                          color: 'blue',
                          title: 'Getirmedi',
                        },
                      ].map((btn) => (
                        <button
                          key={btn.status}
                          onClick={() =>
                            onUpdateStatus(
                              analyzingHomework.id,
                              student.id,
                              btn.status,
                            )
                          }
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                            status === btn.status
                              ? `bg-${btn.color}-600 text-white shadow-lg scale-110 z-10`
                              : `bg-slate-100 text-slate-400 hover:bg-${btn.color}-50 hover:text-${btn.color}-600`,
                          )}
                          title={btn.title}
                        >
                          <i className={cn('fas', btn.icon, 'text-xs')}></i>
                        </button>
                      ))}
                      {status !== HomeworkStatus.PENDING && (
                        <button
                          onClick={() =>
                            onUpdateStatus(
                              analyzingHomework.id,
                              student.id,
                              HomeworkStatus.PENDING,
                            )
                          }
                          className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors"
                          title="Sıfırla"
                        >
                          <i className="fas fa-undo text-xs"></i>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              {filteredStudents.length === 0 && (
                <div className="p-20 text-center text-slate-400 italic">
                  Kriterlere uygun öğrenci bulunamadı.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Homework Form Card */}
      <Card
        className={cn(
          'transition-all',
          editingHomework && 'border-indigo-200 bg-indigo-50/30 shadow-md',
        )}
      >
        <CardHeader className="pb-4">
          <CardTitle
            className={cn(
              'text-lg font-bold tracking-tight',
              editingHomework ? 'text-indigo-700' : 'text-slate-800',
            )}
          >
            {editingHomework ? (
              <>
                <i className="fas fa-edit mr-2"></i>Ödevi Düzenle
              </>
            ) : (
              <>
                <i className="fas fa-plus-circle mr-2"></i>Yeni Ödev Ekle
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">
                Ödev Başlığı
              </label>
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  placeholder="Örn: 14 Şubat Matematik Ödevi"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSuggest}
                  disabled={isSuggesting || !title}
                  className="bg-purple-50 border-purple-100 text-purple-700 hover:bg-purple-100 hover:text-purple-800 font-bold"
                >
                  {isSuggesting ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-wand-magic-sparkles mr-2"></i>
                  )}
                  {isSuggesting ? '' : 'AI Öneri'}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">
                Açıklama
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all outline-none resize-none"
                placeholder="Ödev detayları..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">
                Hedef Sınıflar
              </label>
              <div className="flex flex-wrap gap-2">
                {existingClasses.map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => toggleClass(cls)}
                    className={cn(
                      'px-4 py-1.5 rounded-lg text-xs font-bold transition-all border',
                      targetClasses.includes(cls)
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300',
                    )}
                  >
                    {cls} Sınıfı
                  </button>
                ))}
              </div>
            </div>

            {targetClasses.length > 0 && (
              <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 flex justify-between">
                  Özel Öğrenci Seçimi
                  <span className="text-indigo-600 lowercase normal-case">
                    {targetStudentIds.length === 0
                      ? '(Tüm sınıfa atanacak)'
                      : `(${targetStudentIds.length} öğrenci seçildi)`}
                  </span>
                </label>
                <div className="max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pr-1 no-scrollbar">
                  {availableStudents.map((student) => (
                    <div
                      key={student.id}
                      onClick={() => toggleStudent(student.id)}
                      className={cn(
                        'cursor-pointer p-2 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all',
                        targetStudentIds.includes(student.id)
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-100 hover:border-indigo-200',
                      )}
                    >
                      <i
                        className={cn(
                          'fas',
                          targetStudentIds.includes(student.id)
                            ? 'fa-check-circle'
                            : 'fa-circle opacity-20',
                          'text-[10px]',
                        )}
                      ></i>
                      <span className="truncate">{student.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">
                Son Teslim Tarihi
              </label>
              <Input
                type="date"
                value={dueDate ? dueDate.split('T')[0] : ''}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full md:w-auto"
              />
            </div>

            <div className="flex gap-2 pt-2">
              {editingHomework && (
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 font-bold"
                >
                  İptal
                </Button>
              )}
              <Button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 font-bold shadow-md"
              >
                {editingHomework ? 'Değişiklikleri Kaydet' : 'Ödevi Oluştur'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Homework List Card */}
      <Card className="border-slate-100 shadow-sm overflow-hidden text-left">
        <CardHeader className="bg-slate-50/50 p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-slate-700">
              Ödev Listesi ({homeworks.length})
            </CardTitle>
          </div>
          {/* Class Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setClassFilter('ALL')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border',
                classFilter === 'ALL'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300',
              )}
            >
              <i className="fas fa-layer-group mr-1.5"></i>Tümü
            </button>
            {existingClasses.map((cls) => {
              const count = homeworks.filter((h) =>
                h.targetClasses.includes(cls),
              ).length
              return (
                <button
                  key={cls}
                  onClick={() => setClassFilter(cls)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-1.5',
                    classFilter === cls
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300',
                  )}
                >
                  {cls}
                  <span
                    className={cn(
                      'text-[10px] font-black px-1.5 py-0.5 rounded-full',
                      classFilter === cls
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {(() => {
            const filtered =
              classFilter === 'ALL'
                ? [...homeworks]
                : homeworks.filter((h) => h.targetClasses.includes(classFilter))

            const sorted = filtered.sort(
              (a, b) =>
                new Date(b.assignedDate).getTime() -
                new Date(a.assignedDate).getTime(),
            )

            if (sorted.length === 0) {
              return (
                <div className="p-16 text-center text-slate-400 space-y-3">
                  <i className="fas fa-book-open text-3xl opacity-20"></i>
                  <p className="italic text-sm font-medium">
                    {homeworks.length === 0
                      ? 'Henüz bir ödev oluşturulmamış.'
                      : 'Bu sınıfa ait ödev bulunamadı.'}
                  </p>
                </div>
              )
            }

            // Group by date label
            const now = new Date()
            const startOfToday = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
            )
            const startOfWeek = new Date(startOfToday)
            startOfWeek.setDate(
              startOfToday.getDate() - startOfToday.getDay() + 1,
            )
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

            const getGroup = (hw: (typeof sorted)[0]) => {
              const d = new Date(hw.assignedDate)
              if (d >= startOfToday) return 'Bugün'
              const yesterday = new Date(startOfToday)
              yesterday.setDate(startOfToday.getDate() - 1)
              if (d >= yesterday) return 'Dün'
              if (d >= startOfWeek) return 'Bu Hafta'
              if (d >= startOfMonth) return 'Bu Ay'
              return 'Önceki'
            }

            const groups: { label: string; items: typeof sorted }[] = []
            const groupOrder = ['Bugün', 'Dün', 'Bu Hafta', 'Bu Ay', 'Önceki']
            groupOrder.forEach((label) => {
              const items = sorted.filter((hw) => getGroup(hw) === label)
              if (items.length > 0) groups.push({ label, items })
            })

            return (
              <div className="divide-y divide-slate-100">
                {groups.map(({ label, items }) => (
                  <div key={label}>
                    <div className="px-5 py-2.5 bg-slate-50 flex items-center gap-2">
                      <i className="fas fa-clock text-[10px] text-slate-400"></i>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {label}
                      </span>
                      <span className="text-[10px] font-black text-slate-300 ml-1">
                        ({items.length})
                      </span>
                    </div>
                    {items.map((h) => (
                      <div
                        key={h.id}
                        className="p-5 flex flex-col sm:flex-row justify-between items-start gap-4 hover:bg-slate-50 transition-colors group border-t border-slate-50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {h.title}
                            </h4>
                            <div className="flex gap-1.5">
                              {h.targetClasses.map((cls) => (
                                <span
                                  key={cls}
                                  className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded uppercase tracking-wider border border-indigo-100"
                                >
                                  {cls}
                                </span>
                              ))}
                              {h.targetStudentIds &&
                                h.targetStudentIds.length > 0 && (
                                  <span className="text-[10px] font-black bg-amber-50 text-amber-700 px-2 py-0.5 rounded uppercase tracking-wider border border-amber-100">
                                    {h.targetStudentIds.length} ÖZEL
                                  </span>
                                )}
                            </div>
                          </div>
                          <p className="text-slate-500 text-sm line-clamp-2 font-medium mb-3">
                            {h.description}
                          </p>
                          <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5">
                              <i className="fas fa-calendar-plus text-slate-400"></i>
                              Verildi:{' '}
                              {isMounted
                                ? new Date(h.assignedDate).toLocaleDateString(
                                    'tr-TR',
                                  )
                                : h.assignedDate.split('T')[0]}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <i className="fas fa-calendar-check text-indigo-400"></i>
                              Teslim:{' '}
                              {isMounted
                                ? new Date(h.dueDate).toLocaleDateString(
                                    'tr-TR',
                                  )
                                : h.dueDate.split('T')[0]}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto overflow-x-auto pb-1 no-scrollbar opacity-60 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs justify-start h-9 px-3"
                            onClick={() => setNotifyModalHomework(h)}
                          >
                            <i className="fab fa-whatsapp mr-2 text-base"></i>
                            Bildir
                          </Button>
                          <Button
                            variant="ghost"
                            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs justify-start h-9 px-3"
                            onClick={() => setAnalyzingHomeworkId(h.id)}
                          >
                            <i className="fas fa-chart-pie mr-2 text-base"></i>
                            Analiz
                          </Button>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                              onClick={() => handleEdit(h)}
                            >
                              <i className="fas fa-pen text-sm"></i>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    'Bu ödevi silmek istediğinize emin misiniz?',
                                  )
                                ) {
                                  onDelete(h.id)
                                  toast.success('Ödev silindi 🗑️')
                                }
                              }}
                            >
                              <i className="fas fa-trash-can text-sm"></i>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )
          })()}
        </CardContent>
      </Card>

      {/* Bulk Notification Modal */}
      <BulkNotificationModal
        isOpen={!!notifyModalHomework}
        homework={notifyModalHomework}
        students={students}
        userProfile={userProfile}
        onClose={() => setNotifyModalHomework(null)}
        onMarkNotified={
          notifyModalHomework && onMarkNotified
            ? (studentId) => onMarkNotified(notifyModalHomework.id, studentId)
            : undefined
        }
      />
    </div>
  )
}

export default HomeworkManager
