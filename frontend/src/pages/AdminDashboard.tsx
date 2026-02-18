import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import CenteredLayout from '@/components/CenteredLayout'
import { useAuth } from '@/contexts/AuthContext'
import { createCooperative, getCooperatives, type Cooperative } from '@/lib/api'

function GlobeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-4-4h-1m-4 6H2v-2a4 4 0 014-4h7m0 0a4 4 0 10-8 0 4 4 0 008 0zm6 2a3 3 0 10-6 0 3 3 0 006 0z" />
    </svg>
  )
}

function MoneyIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

type Contribution = {
  name: string
  date: string
  amount: string
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : ''
  return (a + b).toUpperCase()
}

function truncateName(name: string, max = 18) {
  if (name.length <= max) return name
  return `${name.slice(0, max - 1)}…`
}

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:border-[#0F9D8A] focus:ring-2 focus:ring-[#0F9D8A]/20 focus:outline-none text-gray-900 placeholder-gray-400'

export default function AdminDashboard() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [cooperatives, setCooperatives] = useState<Cooperative[]>([])
  const [showAddCoop, setShowAddCoop] = useState(false)
  const [newCoopName, setNewCoopName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const loadCooperatives = useCallback(() => {
    getCooperatives().then(setCooperatives).catch(() => setCooperatives([]))
  }, [])

  useEffect(() => {
    loadCooperatives()
  }, [loadCooperatives])

  const handleAddCooperative = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCoopName.trim()) return
    setAddError(null)
    setSubmitting(true)
    try {
      await createCooperative(newCoopName.trim())
      setNewCoopName('')
      setShowAddCoop(false)
      loadCooperatives()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : t('admin.addCooperativeError'))
    } finally {
      setSubmitting(false)
    }
  }

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'rw' : 'en')
  }

  const recent: Contribution[] = [
    { name: 'Aline Mukamana', date: 'Feb 5', amount: '15,000 RWF' },
    { name: 'Grace Uwase', date: 'Feb 5', amount: '15,000 RWF' },
    { name: 'Jeannette Uwamahoro', date: 'Feb 4', amount: '15,000 RWF' },
  ]

  return (
    <CenteredLayout>
      <div className="w-full max-w-mobile bg-white rounded-2xl shadow-soft overflow-hidden max-h-[90vh] flex flex-col">
        <header className="border-b border-gray-100 px-4 py-4 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-gray-900">{t('admin.title')}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{t('admin.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleLanguage}
                className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm py-1"
                aria-label={t('admin.language')}
              >
                <GlobeIcon />
                <span>{t('admin.language')}</span>
              </button>
              <button
                type="button"
                onClick={() => { logout(); navigate('/login') }}
                className="p-2 text-gray-500 hover:text-gray-700"
                aria-label={t('admin.logout')}
              >
                <LogoutIcon />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 overflow-y-auto">
        {/* Overview */}
        <section className="mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-3">{t('admin.overview')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl shadow-soft p-4">
              <div className="w-12 h-12 rounded-full bg-[#0F9D8A] flex items-center justify-center text-white mb-3">
                <UsersIcon />
              </div>
              <p className="text-xs text-gray-500">{t('admin.totalRiders')}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">45</p>
            </div>

            <div className="bg-white rounded-xl shadow-soft p-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white mb-3">
                <MoneyIcon />
              </div>
              <p className="text-xs text-gray-500">{t('admin.totalIncome')}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">2.9M RWF</p>
            </div>

            <div className="bg-white rounded-xl shadow-soft p-4 col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{t('admin.pending')}</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">8</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white">
                  <ClockIcon />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cooperatives + Add New */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">{t('admin.cooperatives')}</h2>
            <button
              type="button"
              onClick={() => { setShowAddCoop(true); setAddError(null); setNewCoopName('') }}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#0F9D8A] hover:bg-[#0d8a7a] transition-colors"
            >
              {t('admin.addCooperative')}
            </button>
          </div>
          {showAddCoop && (
            <form onSubmit={handleAddCooperative} className="mb-4 p-4 bg-gray-50 rounded-xl space-y-3">
              <div>
                <label htmlFor="newCoopName" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.cooperativeName')}
                </label>
                <input
                  id="newCoopName"
                  type="text"
                  placeholder={t('admin.cooperativeNamePlaceholder')}
                  className={inputClass}
                  value={newCoopName}
                  onChange={(e) => setNewCoopName(e.target.value)}
                  autoFocus
                />
              </div>
              {addError && <p className="text-sm text-red-600">{addError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting || !newCoopName.trim()}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#0F9D8A] hover:bg-[#0d8a7a] disabled:opacity-70 transition-colors"
                >
                  {submitting ? '...' : t('admin.addCooperative')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddCoop(false); setAddError(null); setNewCoopName('') }}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          {cooperatives.length > 0 && (
            <div className="space-y-2">
              {cooperatives.map((c) => (
                <div key={c.id} className="p-3 bg-gray-50 rounded-xl text-sm font-medium text-gray-900">
                  {c.name}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Contributions */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">{t('admin.recentContributions')}</h2>
          <div className="bg-white rounded-xl shadow-soft divide-y divide-gray-100 overflow-hidden">
            {recent.map((c) => (
              <div key={`${c.name}-${c.date}-${c.amount}`} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-semibold text-sm shrink-0">
                  {initials(c.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-gray-900 text-sm truncate">{truncateName(c.name)}</p>
                    <p className="text-xs text-gray-500 shrink-0">{c.date}</p>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{c.amount}</p>
                </div>
                <button
                  type="button"
                  className="shrink-0 px-3 py-2 rounded-xl text-sm font-medium text-white bg-[#0F9D8A] hover:bg-[#0d8a7a] transition-colors"
                >
                  {t('admin.verify')}
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
      </div>
    </CenteredLayout>
  )
}

