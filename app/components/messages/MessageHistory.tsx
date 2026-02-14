'use client'

import React, { useState, useMemo, useEffect } from 'react'
import StudentSearch, { turkishSearch } from '../StudentSearch'
import { HistoryGroup } from './HistoryGroup'

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

export const MessageHistory: React.FC = () => {
  const [historyMessages, setHistoryMessages] = useState<Message[]>([])
  const [historySearchTerm, setHistorySearchTerm] = useState('')
  const [historyFilter, setHistoryFilter] = useState<
    'ALL' | 'WHATSAPP' | 'HOMEWORK'
  >('ALL')
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

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
    fetchHistory()
  }, [])

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

  // Group messages by student
  const groupedHistory = useMemo(() => {
    return Object.values(
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
          if (new Date(msg.createdAt) > new Date(acc[studentId].latestDate)) {
            acc[studentId].latestDate = msg.createdAt
          }
          return acc
        },
        {} as Record<
          string,
          { student: any; messages: Message[]; latestDate: string }
        >,
      ),
    ).sort(
      (a, b) =>
        new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime(),
    )
  }, [filteredHistory])

  return (
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
        ) : groupedHistory.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <i className="fas fa-inbox text-2xl mb-2"></i>
            <p>Kayıtlı mesaj bulunamadı.</p>
          </div>
        ) : (
          groupedHistory.map((group) => (
            <HistoryGroup
              key={group.student.name + group.latestDate}
              group={group}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}
