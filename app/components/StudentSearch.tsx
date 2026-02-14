'use client'

import React from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

import { Input } from '@/components/ui/input'

const StudentSearch: React.FC<Props> = ({
  value,
  onChange,
  placeholder = 'Öğrenci veya veli adı ara...',
}) => {
  return (
    <div className="relative">
      <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm z-10"></i>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-8 bg-slate-50 focus:bg-white transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10"
        >
          <i className="fas fa-times text-sm"></i>
        </button>
      )}
    </div>
  )
}

// Helper function for Turkish-aware case-insensitive search
export const turkishSearch = (text: string, searchTerm: string): boolean => {
  if (!searchTerm.trim()) return true
  const normalizedText = text.toLocaleLowerCase('tr')
  const normalizedTerm = searchTerm.trim().toLocaleLowerCase('tr')
  return normalizedText.includes(normalizedTerm)
}

export default StudentSearch
