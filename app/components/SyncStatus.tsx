'use client'

import React from 'react'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'

const SyncStatus = () => {
  const { syncStatus, pendingOperations } = useStore()

  if (syncStatus === 'idle') return null

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 px-4 py-2 rounded-full shadow-lg font-bold text-xs flex items-center gap-2 transition-all duration-300 animate-in slide-in-from-bottom-4',
        syncStatus === 'syncing'
          ? 'bg-blue-600 text-white'
          : 'bg-red-600 text-white',
      )}
    >
      {syncStatus === 'syncing' ? (
        <>
          <i className="fas fa-circle-notch fa-spin"></i>
          <span>Kaydediliyor... ({pendingOperations.size})</span>
        </>
      ) : (
        <>
          <i className="fas fa-exclamation-triangle"></i>
          <span>Kayıt Hatası! (Tekrar deneniyor...)</span>
        </>
      )}
    </div>
  )
}

export default SyncStatus
