import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import CenteredLayout from '@/components/CenteredLayout'
import ProgressChart from '@/components/ProgressChart'
import { useAuth } from '@/contexts/AuthContext'
import {
  createCooperative,
  getCooperativeDetail,
  getCooperatives,
  getTotalIncome,
  verifyMember,
  type Cooperative,
  type CooperativeMember,
  type CooperativeDetail,
} from '@/lib/api'

/* ─── Icons ─── */
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
    <img src="/riders-icon.png" alt="" className="w-9 h-9 object-contain" aria-hidden />
  )
}
function MoneyIcon() {
  return (
    <img src="/income-icon.png" alt="" className="w-9 h-9 object-contain" aria-hidden />
  )
}
function ClockIcon() {
  return (
    <img src="/unverified-icon.png" alt="" className="w-9 h-9 object-contain" aria-hidden />
  )
}
function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}
function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  )
}

/* ─── Types ─── */
type FlatMember = CooperativeMember & { cooperativeId: number; cooperativeName: string }

function initials(email: string) {
  return email[0]?.toUpperCase() ?? '?'
}

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:border-[#0F9D8A] focus:ring-2 focus:ring-[#0F9D8A]/20 focus:outline-none text-gray-900 placeholder-gray-400'

/* ─── Stat card ─── */
function StatCard({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-soft p-4 flex flex-col justify-between gap-3">
      <div className={`w-11 h-11 rounded-full ${iconBg} flex items-center justify-center text-white shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  )
}

/* ─── Component ─── */
export default function AdminDashboard() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [cooperatives, setCooperatives] = useState<Cooperative[]>([])
  const [showAddCoop, setShowAddCoop] = useState(false)
  const [newCoopName, setNewCoopName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // All members from all cooperatives, flattened for the members list
  const [allMembers, setAllMembers] = useState<FlatMember[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [totalIncome, setTotalIncome] = useState<number | null>(null)
  // Per-member toggling spinner
  const [toggling, setToggling] = useState<Record<number, boolean>>({})

  const loadCooperatives = useCallback(async () => {
    try {
      const coops = await getCooperatives()
      setCooperatives(coops)
      return coops
    } catch {
      setCooperatives([])
      return []
    }
  }, [])

  // Load all members from every cooperative in parallel
  const loadAllMembers = useCallback(async (coops: Cooperative[]) => {
    if (coops.length === 0) { setAllMembers([]); setMembersLoading(false); return }
    setMembersLoading(true)
    try {
      const details: CooperativeDetail[] = await Promise.all(
        coops.map((c) => getCooperativeDetail(c.id))
      )
      const flat: FlatMember[] = details.flatMap((d) =>
        d.members.map((m) => ({
          ...m,
          cooperativeId: d.id,
          cooperativeName: d.name,
        }))
      )
      setAllMembers(flat)
    } catch {
      setAllMembers([])
    } finally {
      setMembersLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCooperatives().then(loadAllMembers)
    getTotalIncome().then(setTotalIncome).catch(() => setTotalIncome(0))
  }, [loadCooperatives, loadAllMembers])

  const handleAddCooperative = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCoopName.trim()) return
    setAddError(null)
    setSubmitting(true)
    try {
      await createCooperative(newCoopName.trim())
      setNewCoopName('')
      setShowAddCoop(false)
      const coops = await loadCooperatives()
      await loadAllMembers(coops)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : t('admin.addCooperativeError'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerify = async (member: FlatMember) => {
    if (toggling[member.id]) return
    setToggling((prev) => ({ ...prev, [member.id]: true }))
    try {
      const result = await verifyMember(member.cooperativeId, member.id)
      setAllMembers((prev) =>
        prev.map((m) =>
          m.id === member.id ? { ...m, is_verified: result.is_verified } : m
        )
      )
    } catch {
      // silently ignore
    } finally {
      setToggling((prev) => ({ ...prev, [member.id]: false }))
    }
  }

  const toggleLanguage = () => i18n.changeLanguage(i18n.language === 'en' ? 'rw' : 'en')

  const totalRiders = allMembers.length
  const verifiedCount = allMembers.filter((m) => m.is_verified).length

  return (
    <CenteredLayout wide>
      {/* ── Top nav bar ── */}
      <header className="bg-[#0F9D8A] px-4 sm:px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-white">{t('admin.title')}</h1>
            <p className="text-sm text-white/70 hidden sm:block">{t('admin.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleLanguage}
              className="hidden sm:inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm py-1 transition-colors"
            >
              <GlobeIcon />
              <span>{t('admin.language')}</span>
            </button>
            <button
              type="button"
              onClick={toggleLanguage}
              className="sm:hidden p-2 text-white/80 hover:text-white transition-colors"
              aria-label="Language"
            >
              <GlobeIcon />
            </button>
            <button
              type="button"
              onClick={() => { logout(); navigate('/login') }}
              className="p-2 text-white/80 hover:text-white transition-colors"
              aria-label={t('admin.logout')}
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] min-h-full">

          {/* ── Left / main column ── */}
          <main className="px-4 sm:px-6 py-6 space-y-8 border-b lg:border-b-0 lg:border-r border-gray-100">

            {/* Stats */}
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {t('admin.overview')}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard
                  icon={<UsersIcon />}
                  iconBg=""
                  label={t('admin.totalRiders')}
                  value={membersLoading ? '…' : String(totalRiders)}
                />
                <StatCard
                  icon={<MoneyIcon />}
                  iconBg=""
                  label={t('admin.totalIncome')}
                  value={
                    totalIncome === null
                      ? '…'
                      : totalIncome >= 1_000_000
                      ? `${(totalIncome / 1_000_000).toFixed(1)}M RWF`
                      : totalIncome >= 1_000
                      ? `${(totalIncome / 1_000).toFixed(1)}K RWF`
                      : `${totalIncome} RWF`
                  }
                />
                <div className="col-span-2 sm:col-span-1">
                  <StatCard
                    icon={<ClockIcon />}
                    iconBg=""
                    label={t('admin.unverified')}
                    value={membersLoading ? '…' : String(totalRiders - verifiedCount)}
                  />
                </div>
              </div>
            </section>

            {/* Members list with verify toggle */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  {t('admin.recentContributions')}
                </h2>
                {!membersLoading && (
                  <span className="text-xs text-gray-400">
                    {t('admin.verifiedCount', { verified: verifiedCount, total: totalRiders })}
                  </span>
                )}
              </div>

              {membersLoading ? (
                <p className="text-sm text-gray-400 py-4">{t('admin.loadingMembers')}</p>
              ) : allMembers.length === 0 ? (
                <p className="text-sm text-gray-400 italic py-4">
                  {t('admin.noRiders')}
                </p>
              ) : (
                <div className="bg-gray-50 rounded-xl divide-y divide-gray-100 overflow-hidden">
                  {allMembers.map((m) => (
                    <div key={m.id} className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0F9D8A]/10 text-[#0F9D8A] flex items-center justify-center font-semibold text-sm shrink-0">
                        {initials(m.email)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm truncate">{m.email}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{m.cooperativeName}</p>
                      </div>
                      <button
                        type="button"
                        disabled={toggling[m.id]}
                        onClick={() => handleVerify(m)}
                        className={[
                          'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                          m.is_verified
                            ? 'bg-[#0F9D8A] text-white hover:bg-[#0c8070]'
                            : 'bg-white border border-gray-300 text-gray-600 hover:border-[#0F9D8A] hover:text-[#0F9D8A]',
                          toggling[m.id] ? 'opacity-50 cursor-wait' : '',
                        ].join(' ')}
                      >
                        {m.is_verified && <CheckIcon />}
                        {toggling[m.id] ? '…' : m.is_verified ? t('admin.verified') : t('admin.verify')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Progress chart */}
            <ProgressChart />
          </main>

          {/* ── Right / sidebar: Cooperative Riders ── */}
          <aside className="px-4 sm:px-6 py-6 space-y-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              {t('admin.cooperativeRiders')}
            </h2>
            {membersLoading ? (
              <p className="text-sm text-gray-400 py-2">{t('admin.loadingMembers')}</p>
            ) : allMembers.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-2">{t('admin.noRiders')}</p>
            ) : (
              <div className="space-y-2">
                {allMembers.map((m) => (
                  <div
                    key={`${m.cooperativeId}-${m.id}`}
                    className="w-full text-left px-4 py-3 bg-gray-50 rounded-xl text-sm font-medium text-gray-900 flex flex-col gap-0.5"
                  >
                    <span className="truncate">{m.email || t('admin.noRiders')}</span>
                    <span className="text-xs text-gray-400">{m.cooperativeName}</span>
                  </div>
                ))}
              </div>
            )}
          </aside>

        </div>
      </div>
    </CenteredLayout>
  )
}
