'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, AlertCircle, Clock, FileText } from 'lucide-react'

export default function OnayPage() {
  const params = useParams()
  const id = params.id as string
  const [submission, setSubmission] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    async function fetchSubmission() {
      try {
        const res = await fetch(`/api/onay/${id}`)
        if (!res.ok) throw new Error('Ödev kaydı bulunamadı.')
        const data = await res.json()
        setSubmission(data)
        if (data.isConfirmed) setCompleted(true)
      } catch (err: any) {
        console.error('Fetch error:', err)
        setError(err.message || 'Bir hata oluştu.')
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchSubmission()
  }, [id])

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      const res = await fetch(`/api/onay/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true }),
      })
      if (!res.ok) throw new Error('Onaylama başarısız.')
      setCompleted(true)
    } catch (err: any) {
      alert('Onaylanırken bir hata oluştu: ' + err.message)
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !submission) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <AlertCircle size={64} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Hata Oluştu</h1>
        <p className="text-gray-600 text-center">
          {error || 'Girdiğiniz link geçersiz veya süresi dolmuş.'}
        </p>
      </div>
    )
  }

  const statusMap: any = {
    DONE: { label: 'Tamamlandı', color: 'text-green-600', icon: CheckCircle2 },
    MISSING: { label: 'Yapılmadı', color: 'text-red-600', icon: AlertCircle },
    INCOMPLETE: { label: 'Eksik', color: 'text-orange-600', icon: AlertCircle },
    ABSENT: { label: 'Gelmedi', color: 'text-blue-600', icon: Clock },
    PENDING: { label: 'Bekliyor', color: 'text-gray-500', icon: Clock },
  }

  const currentStatus = statusMap[submission.status] || statusMap['PENDING']
  const StatusIcon = currentStatus.icon

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-blue-600 p-8 text-white text-center">
          <h1 className="text-2xl font-black mb-1">Ödev Onayı</h1>
          <p className="text-blue-100 text-sm font-medium">
            Veli Bilgilendirme Sistemi
          </p>
        </div>

        <div className="p-8">
          <div className="mb-8">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">
              ÖĞRENCİ
            </label>
            <p className="text-xl font-extrabold text-gray-900">
              {submission.studentName?.toUpperCase()}
            </p>
            <p className="text-sm text-gray-500 font-semibold">
              {submission.className}
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100">
            <div className="mb-4">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                ÖDEV BAŞLIĞI
              </label>
              <p className="text-lg font-bold text-gray-800 leading-tight">
                {submission.homeworkTitle}
              </p>
            </div>

            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-white shadow-sm mr-3">
                <StatusIcon size={20} className={currentStatus.color} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  DURUM
                </label>
                <span className={`text-sm font-black ${currentStatus.color}`}>
                  {currentStatus.label}
                </span>
              </div>
            </div>
          </div>

          {completed ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex flex-col items-center text-center">
              <div className="bg-green-500 p-3 rounded-full mb-4 shadow-lg shadow-green-200">
                <CheckCircle2 size={32} className="text-white" />
              </div>
              <h2 className="text-green-800 font-black text-xl mb-1">
                Onaylandı!
              </h2>
              <p className="text-green-600 text-sm font-semibold">
                Bu ödev raporunu onayladınız. Teşekkür ederiz.
              </p>
            </div>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black py-5 rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
            >
              {confirming ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <CheckCircle2 size={24} />
                  <span className="text-lg">Ödevi Onayla</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <p className="mt-8 text-gray-400 text-xs font-bold tracking-widest uppercase">
        © 2026 Ödev Takip Sistemi
      </p>
    </div>
  )
}
