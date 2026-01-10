import React, { useState, useMemo } from 'react'
import { Homework, Student, HomeworkStatus } from '../types'
import { suggestHomeworkDescription } from '../services/geminiService'
import toast from 'react-hot-toast'

interface Props {
  homeworks: Homework[]
  students: Student[]
  onAdd: (h: Homework) => void
  onDelete: (id: string) => void
  onUpdate: (h: Homework) => void
  onUpdateStatus: (
    hwId: string,
    studentId: string,
    status: HomeworkStatus
  ) => void
}

const HomeworkManager: React.FC<Props> = ({
  homeworks,
  students,
  onAdd,
  onDelete,
  onUpdate,
  onUpdateStatus,
}) => {
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [targetClasses, setTargetClasses] = useState<string[]>([])
  const [targetStudentIds, setTargetStudentIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [analyzingHomeworkId, setAnalyzingHomeworkId] = useState<string | null>(
    null
  )
  const analyzingHomework = useMemo(
    () => homeworks.find((h) => h.id === analyzingHomeworkId) || null,
    [homeworks, analyzingHomeworkId]
  )
  const [analysisFilter, setAnalysisFilter] = useState<string>('ALL')

  const existingClasses = useMemo(
    () => Array.from(new Set(students.map((s) => s.className))).sort(),
    [students]
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
        : [...prev, className]
    )
  }

  const toggleStudent = (id: string) => {
    setTargetStudentIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    )
  }

  const availableStudents = useMemo(
    () =>
      students
        .filter((s) => targetClasses.includes(s.className))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [students, targetClasses]
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
        // If specific students are targeted, only show them
        if (
          analyzingHomework.targetStudentIds &&
          analyzingHomework.targetStudentIds.length > 0
        ) {
          return analyzingHomework.targetStudentIds.includes(s.id)
        }
        // Otherwise show all students in target classes
        return analyzingHomework.targetClasses.includes(s.className)
      })
      .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically

    const filteredStudents = relevantStudents.filter((s) => {
      const status =
        analyzingHomework.submissions[s.id] || HomeworkStatus.PENDING
      if (analysisFilter === 'ALL') return true
      return status === analysisFilter
    })

    const stats = {
      total: relevantStudents.length,
      done: relevantStudents.filter(
        (s) => analyzingHomework.submissions[s.id] === HomeworkStatus.DONE
      ).length,
      missing: relevantStudents.filter(
        (s) => analyzingHomework.submissions[s.id] === HomeworkStatus.MISSING
      ).length,
      incomplete: relevantStudents.filter(
        (s) => analyzingHomework.submissions[s.id] === HomeworkStatus.INCOMPLETE
      ).length,
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {analyzingHomework.title}
            </h2>
            <p className="text-sm text-gray-500">
              {analyzingHomework.description}
            </p>
          </div>
          <button
            onClick={() => setAnalyzingHomeworkId(null)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
          >
            Geri Dön
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-purple-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-700">
              {stats.total}
            </div>
            <div className="text-sm text-purple-600">Toplam Öğrenci</div>
          </div>
          <div className="bg-green-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">
              {stats.done}
            </div>
            <div className="text-sm text-green-600">Tamamlayan</div>
          </div>
          <div className="bg-red-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-700">
              {stats.missing}
            </div>
            <div className="text-sm text-red-600">Yapmayan</div>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-700">
              {stats.incomplete}
            </div>
            <div className="text-sm text-yellow-600">Eksik/Düzeltme</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b flex gap-2 overflow-x-auto">
            {['ALL', 'PENDING', 'DONE', 'MISSING', 'INCOMPLETE'].map(
              (filter) => (
                <button
                  key={filter}
                  onClick={() => setAnalysisFilter(filter)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    analysisFilter === filter
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter === 'ALL' ? 'Tümü' : filter}
                </button>
              )
            )}
          </div>

          <div className="divide-y max-h-[600px] overflow-y-auto">
            {filteredStudents.map((student) => {
              const status =
                analyzingHomework.submissions[student.id] ||
                HomeworkStatus.PENDING
              return (
                <div
                  key={student.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {student.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {student.className} - {student.parentName}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        onUpdateStatus(
                          analyzingHomework.id,
                          student.id,
                          HomeworkStatus.DONE
                        )
                      }
                      className={`p-2 rounded-full ${
                        status === HomeworkStatus.DONE
                          ? 'bg-green-100 text-green-600 ring-2 ring-green-600'
                          : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-500'
                      }`}
                      title="Tamamlandı"
                    >
                      <i className="fas fa-check"></i>
                    </button>
                    <button
                      onClick={() =>
                        onUpdateStatus(
                          analyzingHomework.id,
                          student.id,
                          HomeworkStatus.MISSING
                        )
                      }
                      className={`p-2 rounded-full ${
                        status === HomeworkStatus.MISSING
                          ? 'bg-red-100 text-red-600 ring-2 ring-red-600'
                          : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500'
                      }`}
                      title="Yapılmadı"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                    <button
                      onClick={() =>
                        onUpdateStatus(
                          analyzingHomework.id,
                          student.id,
                          HomeworkStatus.INCOMPLETE
                        )
                      }
                      className={`p-2 rounded-full ${
                        status === HomeworkStatus.INCOMPLETE
                          ? 'bg-yellow-100 text-yellow-600 ring-2 ring-yellow-600'
                          : 'bg-gray-100 text-gray-400 hover:bg-yellow-50 hover:text-yellow-500'
                      }`}
                      title="Eksik"
                    >
                      <i className="fas fa-exclamation"></i>
                    </button>
                    {status !== HomeworkStatus.PENDING && (
                      <button
                        onClick={() =>
                          onUpdateStatus(
                            analyzingHomework.id,
                            student.id,
                            HomeworkStatus.PENDING
                          )
                        }
                        className="p-2 rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200"
                        title="Sıfırla"
                      >
                        <i className="fas fa-undo"></i>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            {filteredStudents.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Bu filtreye uygun öğrenci bulunamadı.
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Main Form and List View
  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow-md space-y-4"
      >
        <h2 className="text-xl font-semibold text-gray-800">
          {editingHomework ? 'Ödevi Düzenle' : 'Yeni Ödev Ekle'}
        </h2>

        {/* Title Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Başlık
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Ödev başlığı..."
            />
            <button
              type="button"
              onClick={handleSuggest}
              disabled={isSuggesting || !title}
              className="bg-purple-100 text-purple-700 px-4 py-2 rounded-md hover:bg-purple-200 disabled:opacity-50 transition-colors"
            >
              {isSuggesting ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-wand-magic-sparkles"></i>
              )}
            </button>
          </div>
        </div>

        {/* Description Textarea */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Açıklama
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Ödev detayları..."
          />
        </div>

        {/* Class Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sınıflar
          </label>
          <div className="flex flex-wrap gap-2">
            {existingClasses.map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => toggleClass(cls)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  targetClasses.includes(cls)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cls}
              </button>
            ))}
          </div>
        </div>

        {/* Target Student Selection (Optional) */}
        {targetClasses.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Öğrenci Seçimi (Tüm sınıf için boş bırakın)
            </label>
            <div className="max-h-40 overflow-y-auto border rounded-md p-2 grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableStudents.map((student) => (
                <div
                  key={student.id}
                  onClick={() => toggleStudent(student.id)}
                  className={`cursor-pointer p-2 rounded text-sm flex items-center gap-2 ${
                    targetStudentIds.includes(student.id)
                      ? 'bg-indigo-50 border border-indigo-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      targetStudentIds.includes(student.id)
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'border-gray-300'
                    }`}
                  >
                    {targetStudentIds.includes(student.id) && (
                      <i className="fas fa-check text-white text-xs"></i>
                    )}
                  </div>
                  <span className="truncate">
                    {student.name} ({student.className})
                  </span>
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {targetStudentIds.length === 0
                ? 'Tüm sınıftaki öğrencilere atanacak.'
                : `${targetStudentIds.length} öğrenci seçildi.`}
            </div>
          </div>
        )}

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Son Teslim Tarihi
          </label>
          <input
            type="date"
            value={dueDate ? dueDate.split('T')[0] : ''}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-2">
          {editingHomework && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              İptal
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-sm"
          >
            {editingHomework ? 'Güncelle' : 'Oluştur'}
          </button>
        </div>
      </form>

      {/* Homework List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
          Ödev Listesi
        </h3>

        {/* Search/Filter Bar could go here */}

        <div className="grid grid-cols-1 gap-4">
          {homeworks.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              Henüz ödev oluşturulmamış.
            </div>
          ) : (
            homeworks.map((h) => (
              <div
                key={h.id}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-lg text-gray-900">
                      {h.title}
                    </h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {h.targetClasses.map((cls) => (
                        <span
                          key={cls}
                          className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded"
                        >
                          {cls}
                        </span>
                      ))}
                      {h.targetStudentIds && h.targetStudentIds.length > 0 && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                          {h.targetStudentIds.length} Öğrenci
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mt-2 text-sm line-clamp-2">
                      {h.description}
                    </p>
                    <div className="text-xs text-gray-500 mt-2">
                      Son Teslim:{' '}
                      {new Date(h.dueDate).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setAnalyzingHomeworkId(h.id)}
                      className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"
                      title="Analiz Et"
                    >
                      <i className="fas fa-chart-pie text-xl"></i>
                    </button>
                    <button
                      onClick={() => handleEdit(h)}
                      className="text-gray-400 hover:text-indigo-600 hover:bg-gray-50 p-2 rounded transition-colors"
                      title="Düzenle"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            'Bu ödevi silmek istediğinize emin misiniz?'
                          )
                        ) {
                          onDelete(h.id)
                          toast.success('Ödev silindi 🗑️')
                        }
                      }}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded transition-colors"
                      title="Sil"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default HomeworkManager
