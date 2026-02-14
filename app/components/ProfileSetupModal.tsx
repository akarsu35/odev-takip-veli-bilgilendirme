'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ProfileSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (profile: {
    fullName: string
    schoolName: string
    subject: string
  }) => void
}

export default function ProfileSetupModal({
  isOpen,
  onClose,
  onSave,
}: ProfileSetupModalProps) {
  const [fullName, setFullName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [subject, setSubject] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, schoolName, subject }),
      })

      if (!response.ok) throw new Error('Failed to save profile')

      const data = await response.json()
      toast.success('Profil bilgileriniz kaydedildi! ✨')
      onSave(data.profile)
      onClose()
    } catch (error) {
      console.error('Profile save error:', error)
      toast.error('Profil kaydedilemedi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in duration-300">
      <Card className="max-w-md w-full shadow-2xl rounded-3xl overflow-hidden border-indigo-100 animate-in zoom-in-95 duration-500">
        <CardContent className="p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-indigo-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 rotate-3 animate-bounce shadow-xl">
              <i className="fas fa-user-circle text-3xl"></i>
            </div>
          </div>

          <h2 className="text-2xl font-black text-center text-slate-800 mb-2 tracking-tight">
            Hoş Geldiniz!
          </h2>
          <p className="text-center text-slate-500 text-sm font-medium mb-8">
            Veli mesajlarını kişiselleştirmek için kısa bilgilerinizi
            girebilirsiniz.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Ad Soyad
              </label>
              <Input
                placeholder="Örn: Cumhur Akarsu"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-11 bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Çalıştığınız Kurum
              </label>
              <Input
                placeholder="Örn: Bornova Bilnet"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="h-11 bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Branş
              </label>
              <Input
                placeholder="Örn: Matematik Öğretmeni"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-11 bg-slate-50 border-slate-200"
              />
            </div>

            <div className="flex gap-3 mt-8">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="flex-1 text-slate-500 font-bold h-12"
              >
                Şimdi Değil
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest h-12 shadow-lg shadow-indigo-100"
              >
                {loading ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  'Kaydet'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
