'use client'

import React, { useState } from 'react'

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

interface HistoryGroupProps {
  group: { student: any; messages: Message[]; latestDate: string }
  onDelete: (
    type: 'SINGLE' | 'STUDENT' | 'ALL',
    id?: string,
    messageType?: string,
  ) => void
}

export const HistoryGroup: React.FC<HistoryGroupProps> = ({
  group,
  onDelete,
}) => {
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
              onDelete('STUDENT', group.student.id)
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
