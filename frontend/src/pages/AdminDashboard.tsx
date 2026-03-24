import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import CenteredLayout from '@/components/CenteredLayout'
import ProgressChart from '@/components/ProgressChart'
import { useAuth } from '@/contexts/AuthContext'
import {
  createCooperative,
  getCooperativeDetail,
  getCooperatives,
  getContributionsSummary,
  getRecentContributions,
  getRecentIncome,
  getTotalIncome,
  unverifyContribution,
  verifyContribution,
  type Cooperative,
  type CooperativeMember,
  type CooperativeDetail,
  type ContributionItem,
  type IncomeRecordItem,
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
function ContributionStatIcon() {
  return (
    <img src="/dollar-icon.png" alt="" className="w-9 h-9 object-contain" aria-hidden />
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
  const { user, logout, loading: authLoading, isAuthenticated } = useAuth()

  const canViewOperationalData = useMemo(() => {
    if (!user) return false
    if (user.is_superuser) return true
    if (user.role !== 'COOPERATIVE_ADMIN') return true
    return user.is_staff === true
  }, [user])

  const isCoopAdminPendingStaff = useMemo(() => {
    if (!user || user.is_superuser) return false
    return user.role === 'COOPERATIVE_ADMIN' && user.is_staff !== true
  }, [user])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }
    if (user && user.role !== 'COOPERATIVE_ADMIN' && !user.is_superuser) {
      navigate('/rider', { replace: true })
    }
  }, [authLoading, isAuthenticated, user, navigate])

  const [cooperatives, setCooperatives] = useState<Cooperative[]>([])
  const [showAddCoop, setShowAddCoop] = useState(false)
  const [newCoopName, setNewCoopName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // All members from all cooperatives, flattened for the members list
  const [allMembers, setAllMembers] = useState<FlatMember[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [totalIncome, setTotalIncome] = useState<number | null>(null)
  const [verifiedContributionsTotal, setVerifiedContributionsTotal] = useState<number | null>(null)
  const [pendingContributionsCount, setPendingContributionsCount] = useState<number | null>(null)
  const [recentIncome, setRecentIncome] = useState<IncomeRecordItem[]>([])
  const [recentContributions, setRecentContributions] = useState<ContributionItem[]>([])
  const [chartRefreshTrigger, setChartRefreshTrigger] = useState(0)
  const [verifyingContributionId, setVerifyingContributionId] = useState<number | null>(null)
  const [unverifyingContributionId, setUnverifyingContributionId] = useState<number | null>(null)

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
    if (!canViewOperationalData) {
      setCooperatives([])
      setAllMembers([])
      setMembersLoading(false)
      setTotalIncome(null)
      setVerifiedContributionsTotal(null)
      setPendingContributionsCount(null)
      setRecentIncome([])
      setRecentContributions([])
      return
    }
    loadCooperatives().then(loadAllMembers)
    getTotalIncome().then(setTotalIncome).catch(() => setTotalIncome(0))
    getContributionsSummary()
      .then((s) => {
        setVerifiedContributionsTotal(s.verified_amount)
        setPendingContributionsCount(s.pending_count)
      })
      .catch(() => {
        setVerifiedContributionsTotal(0)
        setPendingContributionsCount(0)
      })
    getRecentIncome().then(setRecentIncome).catch(() => setRecentIncome([]))
    getRecentContributions().then(setRecentContributions).catch(() => setRecentContributions([]))
  }, [loadCooperatives, loadAllMembers, canViewOperationalData])

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

  const refetchRecent = useCallback(async () => {
    const [contributions, summary] = await Promise.all([
      getRecentContributions().catch(() => [] as ContributionItem[]),
      getContributionsSummary().catch(() => ({ verified_amount: 0, total_amount: 0, pending_amount: 0, total_count: 0, verified_count: 0, pending_count: 0 })),
    ])
    setRecentContributions(contributions)
    setVerifiedContributionsTotal(summary.verified_amount ?? 0)
    setPendingContributionsCount(summary.pending_count ?? 0)
    setChartRefreshTrigger((n) => n + 1)
  }, [])

  const handleVerifyContribution = async (c: ContributionItem) => {
    if (String(c.status).toUpperCase() === 'VERIFIED') return
    if (verifyingContributionId === c.id) return
    setVerifyingContributionId(c.id)
    try {
      const updated = await verifyContribution(c.id)
      setRecentContributions((prev) =>
        prev.map((item) => (item.id === c.id ? updated : item))
      )
      setVerifiedContributionsTotal((prev) => prev + Number(c.amount))
      setPendingContributionsCount((prev) => Math.max(0, (prev ?? 0) - 1))
      await refetchRecent()
    } catch {
      // ignore
    } finally {
      setVerifyingContributionId(null)
    }
  }

  const handleUnverifyContribution = async (c: ContributionItem) => {
    if (String(c.status).toUpperCase() !== 'VERIFIED') return
    if (unverifyingContributionId === c.id) return
    setUnverifyingContributionId(c.id)
    try {
      const updated = await unverifyContribution(c.id)
      setRecentContributions((prev) =>
        prev.map((item) => (item.id === c.id ? updated : item))
      )
      setVerifiedContributionsTotal((prev) => Math.max(0, prev - Number(c.amount)))
      setPendingContributionsCount((prev) => (prev ?? 0) + 1)
      await refetchRecent()
    } catch {
      // ignore
    } finally {
      setUnverifyingContributionId(null)
    }
  }

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'rw' : 'en')
    setAddError(null)
  }

  const totalRiders = allMembers.length

  if (authLoading || !user) {
    return (
      <CenteredLayout wide>
        <header className="bg-[#0F9D8A] px-4 sm:px-6 py-4 shrink-0">
          <h1 className="text-lg font-semibold text-white">{t('admin.title')}</h1>
        </header>
        <p className="p-6 text-sm text-gray-500" role="status">…</p>
      </CenteredLayout>
    )
  }

  if (isCoopAdminPendingStaff) {
    return (
      <CenteredLayout wide>
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
                aria-label={t('admin.language')}
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
        <main className="flex-1 px-4 sm:px-6 py-8">
          <div className="max-w-lg mx-auto bg-white rounded-xl shadow-soft p-6 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">{t('admin.pendingStaffTitle')}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{t('admin.pendingStaffBody')}</p>
          </div>
        </main>
      </CenteredLayout>
    )
  }

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
              <h2 className="text-sm font-semibold text-[#0F9D8A] uppercase tracking-wide mb-3">
                {t('admin.overview')}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                <StatCard
                  icon={<ContributionStatIcon />}
                  iconBg=""
                  label={t('admin.totalContributions', 'Total Contributions')}
                  value={
                    verifiedContributionsTotal === null
                      ? '…'
                      : verifiedContributionsTotal >= 1_000_000
                      ? `${(verifiedContributionsTotal / 1_000_000).toFixed(1)}M RWF`
                      : verifiedContributionsTotal >= 1_000
                      ? `${(verifiedContributionsTotal / 1_000).toFixed(1)}K RWF`
                      : `${verifiedContributionsTotal} RWF`
                  }
                />
                <StatCard
                  icon={<ClockIcon />}
                  iconBg=""
                  label={t('admin.unverified')}
                  value={pendingContributionsCount === null ? '…' : String(pendingContributionsCount)}
                />
              </div>

              {/* Recent income with notes/descriptions */}
              {recentIncome.length > 0 && (
                <div className="mt-4 bg-white rounded-xl shadow-soft p-4">
                  <h3 className="text-xs font-semibold text-[#0F9D8A] uppercase tracking-wide mb-3">
                    {t('admin.recentIncome', 'Recent Income')}
                  </h3>
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {recentIncome.map((r) => (
                      <div
                        key={r.id}
                        className="flex flex-col gap-0.5 py-2 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {Number(r.amount).toLocaleString()} RWF
                          </span>
                          <span className="text-xs text-gray-400">
                            {r.date} · {r.rider.email || r.rider.phone_number || '—'}
                          </span>
                        </div>
                        {r.notes && r.notes.trim() && (
                          <p className="text-xs text-gray-500 italic line-clamp-2">{r.notes.trim()}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent contributions — amount, date, who made it, status, and Verify for PENDING */}
              {recentContributions.length > 0 && (
                <div className="mt-4 bg-white rounded-xl shadow-soft p-4">
                  <h3 className="text-xs font-semibold text-[#0F9D8A] uppercase tracking-wide mb-3">
                    {t('admin.recentContributionsList')}
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {recentContributions.map((c) => {
                      const isVerified = String(c.status).toUpperCase() === 'VERIFIED'
                      const isVerifying = verifyingContributionId === c.id
                      const isUnverifying = unverifyingContributionId === c.id
                      return (
                        <div
                          key={c.id}
                          className="flex flex-col gap-1 py-2 border-b border-gray-100 last:border-0"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {Number(c.amount).toLocaleString()} RWF
                            </span>
                            <span className="text-xs text-gray-400">
                              {c.date} · {c.rider.email || c.rider.phone_number || '—'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-500">
                              {c.cooperative.name}
                              {isVerified ? ` · ${t('admin.verified')}` : ` · ${t('admin.unverified')}`}
                            </span>
                            {!isVerified ? (
                              <button
                                type="button"
                                disabled={isVerifying}
                                onClick={() => handleVerifyContribution(c)}
                                className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-transparent border-2 border-[#0F9D8A] text-[#0F9D8A] hover:bg-[#0F9D8A] hover:text-white disabled:opacity-50 transition-colors"
                              >
                                <CheckIcon />
                                {isVerifying ? '…' : t('admin.verify', 'Verify')}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isUnverifying}
                                onClick={() => handleUnverifyContribution(c)}
                                className="shrink-0 px-2 py-1 rounded-lg text-xs font-medium bg-[#0F9D8A] text-white border-2 border-[#0F9D8A] hover:bg-[#0c8070] hover:border-[#0c8070] disabled:opacity-50 transition-colors"
                              >
                                {isUnverifying ? '…' : t('admin.unverify', 'Unverify')}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </section>

            {/* Recent contributors — verified only: who, how much, when (disappears when unverified) */}
            <section>
              <h2 className="text-sm font-semibold text-[#0F9D8A] uppercase tracking-wide mb-3">
                {t('admin.recentContributors', 'Recent Contributors')}
              </h2>
              {(() => {
                const verifiedOnly = recentContributions.filter((c) => String(c.status).toUpperCase() === 'VERIFIED')
                if (verifiedOnly.length === 0) {
                  return <p className="text-sm text-gray-400 italic py-4">{t('admin.noVerifiedContributorsYet', 'No verified contributors yet.')}</p>
                }
                return (
                  <div className="bg-gray-50 rounded-xl divide-y divide-gray-100 overflow-hidden">
                    {verifiedOnly.map((c) => (
                      <div key={c.id} className="p-4 flex flex-col gap-1">
                        <p className="font-medium text-gray-900 text-sm">
                          {c.rider.email || c.rider.phone_number || '—'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {Number(c.amount).toLocaleString()} RWF · {c.date}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </section>

            {/* Progress chart — refetches when admin verifies so stats stay in sync */}
            <ProgressChart refreshTrigger={chartRefreshTrigger} />
          </main>

          {/* ── Right / sidebar: Cooperative Riders ── */}
          <aside className="px-4 sm:px-6 py-6 space-y-6">
            <h2 className="text-sm font-semibold text-[#0F9D8A] uppercase tracking-wide">
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
