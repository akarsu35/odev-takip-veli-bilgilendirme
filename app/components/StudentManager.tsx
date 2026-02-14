'use client'

import React, { useState } from 'react'
import { Student } from '@/types'
import { read, utils } from 'xlsx'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Props {
  students: Student[]
  onAdd: (s: Student) => void
  onDelete: (id: string) => void
  onUpdate: (s: Student) => void
  onShowHistory?: (id: string) => void
}

const StudentManager: React.FC<Props> = ({
  students,
  onAdd,
  onDelete,
  onUpdate,
  onShowHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [name, setName] = useState('')
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [className, setClassName] = useState('')

  // Get unique existing classes for auto-suggestion
  const existingClasses = Array.from(
    new Set(students.map((s) => s.className)),
  ).sort()

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    setName(student.name)
    setParentName(student.parentName)
    setParentPhone(student.parentPhone)
    setClassName(student.className)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancel = () => {
    setEditingStudent(null)
    setName('')
    setParentName('')
    setParentPhone('')
    setClassName('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !parentPhone || !className) return

    let cleanedPhone = parentPhone.replace(/\D/g, '')
    if (!cleanedPhone.startsWith('0')) cleanedPhone = '0' + cleanedPhone

    if (editingStudent) {
      onUpdate({
        ...editingStudent,
        name,
        parentName,
        parentPhone: cleanedPhone,
        className: className.toUpperCase(),
      })
      toast.success('Öğrenci bilgileri güncellendi 👤')
      handleCancel()
    } else {
      onAdd({
        id: Date.now().toString(),
        name,
        parentName,
        parentPhone: cleanedPhone,
        className: className.toUpperCase(),
      })
      toast.success('Yeni öğrenci eklendi 🎓')

      setName('')
      setParentName('')
      setParentPhone('')
    }
  }

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const toastId = toast.loading('Excel dosyası işleniyor...')

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = utils.sheet_to_json(ws)
        const newStudents: Student[] = []

        data.forEach((row: any) => {
          const studentName =
            row['Ad Soyad'] || row['Öğrenci Adı'] || row['Öğrenci']
          const studentClass = row['Sınıf'] || row['Sınıfı']
          const parentName = row['Veli'] || row['Veli Adı']
          const parentPhone =
            row['Veli Tel'] || row['Veli Telefon'] || row['Telefon']

          if (studentName && studentClass && parentPhone) {
            const cleanedPhone = String(parentPhone).replace(/\D/g, '')
            const student: Student = {
              id: (Date.now() + Math.random()).toString(),
              name: String(studentName).trim(),
              parentName: parentName ? String(parentName).trim() : '',
              parentPhone: cleanedPhone.startsWith('0')
                ? cleanedPhone
                : '0' + cleanedPhone,
              className: String(studentClass).trim().toUpperCase(),
            }
            newStudents.push(student)
          }
        })

        if (newStudents.length > 0) {
          newStudents.forEach((s) => onAdd(s))
          toast.success(`${newStudents.length} öğrenci başarıyla aktarıldı!`, {
            id: toastId,
          })
        } else {
          toast.error('Aktarılacak uygun öğrenci kaydı bulunamadı', {
            id: toastId,
          })
        }
      } catch (error) {
        console.error(error)
        toast.error('Excel dosyası işlenirken hata oluştu', { id: toastId })
      }
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  const filteredStudents = students
    .filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.parentName.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort(
      (a, b) =>
        a.className.localeCompare(b.className) || a.name.localeCompare(b.name),
    )

  return (
    <div className="space-y-6">
      {/* Add/Edit Student Card */}
      <Card
        className={cn(
          'transition-all',
          editingStudent && 'border-indigo-200 bg-indigo-50/30 shadow-md',
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle
            className={cn(
              'text-lg font-bold tracking-tight',
              editingStudent ? 'text-indigo-700' : 'text-slate-800',
            )}
          >
            {editingStudent ? (
              <>
                <i className="fas fa-user-edit mr-2"></i>
                Öğrenci Düzenle
              </>
            ) : (
              <>
                <i className="fas fa-user-plus mr-2"></i>
                Yeni Öğrenci Ekle
              </>
            )}
          </CardTitle>
          {editingStudent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-slate-500 hover:text-slate-700 font-bold"
            >
              Vazgeç
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">
                Öğrenci Adı Soyadı
              </label>
              <Input
                placeholder="Örn: Ahmet Yılmaz"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">
                Sınıf
              </label>
              <div className="relative">
                <Input
                  placeholder="Örn: 8/A"
                  className="uppercase"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  list="classes-list"
                  required
                />
                <datalist id="classes-list">
                  {existingClasses.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">
                Veli Adı Soyadı
              </label>
              <Input
                placeholder="Örn: Mehmet Yılmaz"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">
                Veli Telefon
              </label>
              <Input
                type="tel"
                placeholder="5xxxxxxxxx"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className={cn(
                'w-full md:col-span-2 font-bold shadow-sm',
                editingStudent
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-indigo-600 hover:bg-indigo-700',
              )}
            >
              {editingStudent ? (
                <>
                  <i className="fas fa-save mr-2"></i>Değişiklikleri Kaydet
                </>
              ) : (
                <>
                  <i className="fas fa-plus-circle mr-2"></i>Öğrenciyi Kaydet
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Student List Card */}
      <Card className="overflow-hidden border-slate-100 shadow-sm">
        <CardHeader className="bg-slate-50/50 p-4 border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <CardTitle className="text-base font-bold text-slate-700">
                Öğrenci Listesi ({students.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleExcelImport}
                  className="hidden"
                  id="excel-upload"
                />
                <label
                  htmlFor="excel-upload"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-black cursor-pointer hover:bg-emerald-100 transition shadow-sm"
                >
                  <i className="fas fa-file-excel"></i>
                  EXCEL'DEN AKTAR
                </label>
              </div>
            </div>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <Input
                placeholder="Öğrenci, veli veya sınıf ara..."
                className="pl-9 h-9 text-sm w-full md:w-64 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <i className="fas fa-users-slash text-3xl opacity-20"></i>
                <p className="italic text-sm">
                  Aranan kriterlere uygun öğrenci bulunamadı.
                </p>
              </div>
            ) : (
              filteredStudents.map((s) => (
                <div
                  key={s.id}
                  className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded tracking-wider">
                        {s.className}
                      </span>
                      <h3 className="font-bold text-slate-900 truncate">
                        {s.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <i className="fas fa-user-friends opacity-50"></i>
                        {s.parentName || 'Veli Adı Yok'}
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="fas fa-phone opacity-50"></i>
                        {s.parentPhone}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    {onShowHistory && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onShowHistory(s.id)}
                        className="h-8 w-8 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50"
                        title="Gelişim Geçmişi"
                      >
                        <i className="fas fa-chart-line"></i>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(s)}
                      className="h-8 w-8 text-amber-500 hover:text-amber-700 hover:bg-amber-50"
                      title="Düzenle"
                    >
                      <i className="fas fa-pen text-sm"></i>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (
                          window.confirm(
                            `${s.name} isimli öğrenciyi silmek istediğinize emin misiniz?`,
                          )
                        ) {
                          onDelete(s.id)
                          toast.success('Öğrenci silindi 🗑️')
                        }
                      }}
                      className="h-8 w-8 text-red-400 hover:text-red-700 hover:bg-red-50"
                      title="Sil"
                    >
                      <i className="fas fa-trash-can text-sm"></i>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default StudentManager
