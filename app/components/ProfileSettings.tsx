'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface UserProfile {
  id: string
  userId: string
  fullName: string | null
  schoolName: string | null
  subject: string | null
}

export default function ProfileSettings() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [fullName, setFullName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [subject, setSubject] = useState('')
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      if (!response.ok) throw new Error('Failed to load profile')

      const data = await response.json()
      if (data.profile) {
        setProfile(data.profile)
        setFullName(data.profile.fullName || '')
        setSchoolName(data.profile.schoolName || '')
        setSubject(data.profile.subject || '')
      }
    } catch (error) {
      console.error('Profile load error:', error)
    }
  }

  const handleSave = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, schoolName, subject }),
      })

      if (!response.ok) throw new Error('Failed to save profile')

      const data = await response.json()
      setProfile(data.profile)
      setIsEditing(false)
      toast.success('Profil bilgileriniz güncellendi! ✨')
    } catch (error) {
      console.error('Profile save error:', error)
      toast.error('Profil güncellenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setFullName(profile.fullName || '')
      setSchoolName(profile.schoolName || '')
      setSubject(profile.subject || '')
    }
    setIsEditing(false)
  }

  return (
    <Card className="border-indigo-100 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <i className="fas fa-user-circle text-indigo-600"></i>
          Profil Bilgilerim
        </CardTitle>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-indigo-600 font-bold hover:text-indigo-700 hover:bg-indigo-50"
          >
            <i className="fas fa-edit mr-2"></i>
            Düzenle
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Ad Soyad
            </label>
            {isEditing ? (
              <Input
                placeholder="Örn: Cumhur Akarsu"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            ) : (
              <div className="text-slate-700 font-medium px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                {profile?.fullName || 'Belirtilmemiş'}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Çalıştığınız Kurum
            </label>
            {isEditing ? (
              <Input
                placeholder="Örn: Bornova Bilnet"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
              />
            ) : (
              <div className="text-slate-700 font-medium px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                {profile?.schoolName || 'Belirtilmemiş'}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Branş
            </label>
            {isEditing ? (
              <Input
                placeholder="Örn: Matematik Öğretmeni"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            ) : (
              <div className="text-slate-700 font-medium px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                {profile?.subject || 'Belirtilmemiş'}
              </div>
            )}
          </div>

          {isEditing && (
            <div className="flex gap-3 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1 font-bold h-11"
              >
                İptal
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 font-bold h-11 shadow-lg shadow-indigo-100"
              >
                {loading ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  'Değişiklikleri Kaydet'
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 border-dashed">
          <p className="text-xs text-blue-700 font-medium leading-relaxed">
            <i className="fas fa-info-circle mr-2 opacity-70"></i>
            Bu bilgiler veli mesajlarında (imza olarak) kullanılır. Tamamen
            isteğe bağlıdır ve dilediğiniz zaman güncelleyebilirsiniz.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
