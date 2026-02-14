'use client'

import React, { useState, useEffect } from 'react'
import { Student, Homework, HomeworkStatus } from '@/types'
import { Toaster } from 'react-hot-toast'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

import StudentManager from './components/StudentManager'
import HomeworkManager from './components/HomeworkManager'
import CheckPanel from './components/CheckPanel'
import Settings from './components/Settings'
import StudentHistory from './components/StudentHistory'
import ProfileSetupModal from './components/ProfileSetupModal'
import ProfileSettings from './components/ProfileSettings'
import CustomMessagePanel from './components/CustomMessagePanel'

import { useStore } from '@/store/useStore'
import { useSyncState } from '@/hooks/useAppState'

const Page: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    students,
    homeworks,
    setStudents,
    setHomeworks,
    addStudent: addStudentToStore,
    deleteStudent: deleteStudentFromStore,
    updateStudent: updateStudentInStore,
    addHomework: addHomeworkToStore,
    deleteHomework: deleteHomeworkFromStore,
    updateHomework: updateHomeworkInStore,
    updateSubmission: updateSubmissionInStore,
    markAsNotified: markAsNotifiedInStore,
  } = useStore()

  // Initialize data syncing
  const { isInitialized, isLoading } = useSyncState()

  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    localStorage.removeItem('odev_takip_v2')
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  )

  // These local states are for UI/Auth only, not data
  const [syncFailed, setSyncFailed] = useState(false) // Keeping simple for now, useSyncState could return error too
  const [user, setUser] = useState<any>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [profileChecked, setProfileChecked] = useState(false)

  // Auth Effect
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      if (user) checkUserProfile()
    }
    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) checkUserProfile()
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkUserProfile = async () => {
    if (profileChecked) return
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setUserProfile(data.profile)
        if (
          !data.profile ||
          (!data.profile.fullName &&
            !data.profile.schoolName &&
            !data.profile.subject)
        ) {
          if (typeof window !== 'undefined') {
            const hasSeenModal = sessionStorage.getItem('profileModalShown')
            if (!hasSeenModal) {
              setShowProfileModal(true)
              sessionStorage.setItem('profileModalShown', 'true')
            }
          }
        }
      }
    } catch (error) {
      console.error('Profile check error:', error)
    } finally {
      setProfileChecked(true)
    }
  }

  const handleProfileSave = (profile: any) => {
    setUserProfile(profile)
  }

  // Handlers wrapped to preserve existing logic (e.g. API calls)

  const addStudent = (s: Student) => addStudentToStore(s)

  const deleteStudent = async (id: string) => {
    const previousStudents = students
    deleteStudentFromStore(id)

    try {
      const res = await fetch(`/api/student?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Silme işlemi başarısız')
    } catch (e) {
      console.error('Failed to delete student', e)
      setStudents(previousStudents)
      alert('Öğrenci silinemedi: ' + (e as Error).message)
    }
  }

  const updateStudent = (s: Student) => updateStudentInStore(s)

  const addHomework = (h: Homework) => addHomeworkToStore(h)

  const deleteHomework = (id: string) => deleteHomeworkFromStore(id)

  const updateHomework = (h: Homework) => updateHomeworkInStore(h)

  const updateSubmission = (
    hwId: string,
    studentId: string,
    status: HomeworkStatus,
  ) => updateSubmissionInStore(hwId, studentId, status)

  const markAsNotified = (hwId: string, studentId: string) =>
    markAsNotifiedInStore(hwId, studentId)

  if (isLoading && !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium italic">
            Sınıflar Hazırlanıyor...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Toaster position="top-right" />
      <ProfileSetupModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSave={handleProfileSave}
      />
      {/* Header */}
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-black text-indigo-600 flex items-center gap-2 tracking-tight">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
              <i className="fas fa-check-double"></i>
            </div>
            ÖDEV TAKİP
          </h1>
          <div className="flex items-center gap-2">
            {user && (
              <div className="flex items-center gap-2 mr-2 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Avatar"
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 text-xs font-bold">
                    {(user.email?.[0] || 'U').toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-medium text-indigo-900 max-w-[100px] truncate hidden sm:block">
                  {user.user_metadata?.full_name || user.email}
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors"
            >
              ÇIKIŞ
            </button>
            {/* Sync Status - Simplified for new hook */}
            {!isLoading ? (
              <>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">
                  BULUT DB
                </span>
              </>
            ) : (
              <span className="text-[10px] font-bold text-slate-400">
                SYNC...
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4">
        {activeTab === 'students' && (
          <StudentManager
            students={students}
            onAdd={addStudent}
            onDelete={deleteStudent}
            onUpdate={updateStudent}
            onShowHistory={(id) => {
              setSelectedStudentId(id)
              setActiveTab('history')
            }}
          />
        )}
        {activeTab === 'homework' && (
          <HomeworkManager
            homeworks={homeworks}
            students={students}
            userProfile={userProfile}
            onAdd={addHomework}
            onDelete={deleteHomework}
            onUpdate={updateHomework}
            onUpdateStatus={updateSubmission}
            onMarkNotified={markAsNotified}
          />
        )}
        {activeTab === 'check' && (
          <CheckPanel
            students={students}
            homeworks={homeworks}
            userProfile={userProfile}
            onUpdateStatus={updateSubmission}
            onMarkNotified={markAsNotified}
          />
        )}
        {activeTab === 'settings' && (
          <>
            <ProfileSettings />
            <div className="mt-4">
              <Settings state={{ students, homeworks }} />
            </div>
          </>
        )}
        {activeTab === 'history' && (
          <StudentHistory
            students={students}
            homeworks={homeworks}
            initialStudentId={selectedStudentId}
            userProfile={userProfile}
            onUpdateStatus={updateSubmission}
            onMarkNotified={markAsNotified}
          />
        )}
        {activeTab === 'messages' && (
          <CustomMessagePanel students={students} userProfile={userProfile} />
        )}
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around p-3 pb-6 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-50">
        <NavButton
          active={activeTab === 'check'}
          icon="fas fa-clipboard-list"
          label="Kontrol"
          onClick={() => setActiveTab('check')}
        />
        <NavButton
          active={activeTab === 'homework'}
          icon="fas fa-book"
          label="Ödevler"
          onClick={() => setActiveTab('homework')}
        />
        <NavButton
          active={activeTab === 'students'}
          icon="fas fa-user-graduate"
          label="Öğrenciler"
          onClick={() => setActiveTab('students')}
        />
        <NavButton
          active={activeTab === 'history'}
          icon="fas fa-chart-line"
          label="Gelişim"
          onClick={() => setActiveTab('history')}
        />
        <NavButton
          active={activeTab === 'messages'}
          icon="fas fa-paper-plane"
          label="Mesajlar"
          onClick={() => setActiveTab('messages')}
        />
        <NavButton
          active={activeTab === 'settings'}
          icon="fas fa-cog"
          label="Ayarlar"
          onClick={() => setActiveTab('settings')}
        />
      </nav>
    </div>
  )
}

const NavButton: React.FC<{
  active: boolean
  icon: string
  label: string
  onClick: () => void
}> = ({ active, icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all duration-300 ${
      active ? 'text-indigo-600 scale-110' : 'text-slate-400'
    }`}
  >
    <div className={`p-1.5 rounded-xl ${active ? 'bg-indigo-50' : ''}`}>
      <i className={`${icon} text-lg`}></i>
    </div>
    <span className="text-[10px] font-bold uppercase tracking-wider">
      {label}
    </span>
  </button>
)

export default Page
