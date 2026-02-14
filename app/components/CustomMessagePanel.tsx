'use client'

import React, { useState } from 'react'
import { Student } from '@/types'
import { MessageComposer } from './messages/MessageComposer'
import { MessageHistory } from './messages/MessageHistory'

interface Props {
  students: Student[]
  userProfile?: {
    fullName: string | null
    schoolName: string | null
    subject: string | null
  } | null
}

const CustomMessagePanel: React.FC<Props> = ({ students, userProfile }) => {
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new')

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
            Geçmiş Mesajlar
          </button>
        </div>
      </div>

      {activeTab === 'new' ? (
        <MessageComposer students={students} userProfile={userProfile} />
      ) : (
        <MessageHistory />
      )}
    </div>
  )
}

export default CustomMessagePanel
