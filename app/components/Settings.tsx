'use client'

import React from 'react'
import { db } from '@/services/db'
import { AppState } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Props {
  state: AppState
}

const Settings: React.FC<Props> = ({ state }) => {
  const handleExport = async () => {
    const url = await db.exportData()
    const a = document.createElement('a')
    a.href = url
    a.download = `odev_takip_yedek_${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const content = event.target?.result as string
      await db.importData(content)
      window.location.reload()
    }
    reader.readAsText(file)
  }

  const clearAll = () => {
    if (
      confirm(
        'Tüm verileri silmek istediğinize emin misiniz? Bu işlem geri alınamaz!',
      )
    ) {
      localStorage.clear()
      window.location.reload()
    }
  }

  return (
    <div className="space-y-6 pb-20">
      <Card className="border-indigo-100 shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold flex items-center gap-3 text-slate-800">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
              <i className="fas fa-database text-lg"></i>
            </div>
            Veritabanı Yönetimi
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Stats Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 group hover:border-indigo-100 transition-colors">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Öğrenci Sayısı
              </span>
              <span className="text-3xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                {state.students.length}
              </span>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 group hover:border-indigo-100 transition-colors">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Toplam Ödev
              </span>
              <span className="text-3xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                {state.homeworks.length}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <Button
              onClick={handleExport}
              className="w-full h-16 flex items-center justify-between px-6 bg-white border-2 border-slate-100 text-slate-700 hover:border-indigo-600 hover:bg-white hover:text-indigo-600 rounded-2xl transition-all shadow-sm font-bold group"
            >
              <div className="flex items-center gap-4">
                <i className="fas fa-download text-indigo-500 group-hover:scale-125 transition-transform"></i>
                <div className="text-left">
                  <div className="text-sm">Veritabanını Yedekle</div>
                  <div className="text-[10px] font-black opacity-40 uppercase tracking-widest">
                    JSON FORMATINDA
                  </div>
                </div>
              </div>
              <i className="fas fa-chevron-right text-xs opacity-30"></i>
            </Button>

            <label className="w-full h-16 flex items-center justify-between px-6 bg-white border-2 border-slate-100 text-slate-700 hover:border-emerald-600 hover:bg-white hover:text-emerald-600 rounded-2xl transition-all shadow-sm font-bold cursor-pointer group">
              <div className="flex items-center gap-4">
                <i className="fas fa-upload text-emerald-500 group-hover:scale-125 transition-transform"></i>
                <div className="text-left">
                  <div className="text-sm">Yedek Geri Yükle</div>
                  <div className="text-[10px] font-black opacity-40 uppercase tracking-widest">
                    ÖNCEKİ YEDEKLERDEN
                  </div>
                </div>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".json"
                onChange={handleImport}
              />
              <i className="fas fa-chevron-right text-xs opacity-30"></i>
            </label>

            <div className="pt-4 mt-6 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={clearAll}
                className="w-full h-14 border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:border-rose-200 transition-all font-bold flex items-center gap-3"
              >
                <i className="fas fa-trash-alt"></i>
                Tüm Veritabanını Sıfırla
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center space-y-2 opacity-30">
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">
          Tüm verileriniz tarayıcıda yerel olarak saklanmaktadır.
        </p>
        <div className="flex items-center justify-center gap-2">
          <span className="w-8 h-[1px] bg-slate-400"></span>
          <span className="text-xs font-bold">V2.1.0-BETA</span>
          <span className="w-8 h-[1px] bg-slate-400"></span>
        </div>
      </div>
    </div>
  )
}

export default Settings
