import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import CenteredLayout from '@/components/CenteredLayout'
import { useAuth } from '@/contexts/AuthContext'
import {
  getIncomeForDate,
  getMyContributions,
  getMyIncomeRecords,
  type IncomeRecordItem,
} from '@/lib/api'

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

function IncomeActionIcon() {
  return (
    <img src="/income-icon.png" alt="" className="w-9 h-9 object-contain" aria-hidden />
  )
}

function SubmitActionIcon() {
  return (
    <img src="/submiticon.png" alt="" className="w-9 h-9 object-contain" aria-hidden />
  )
}

function TrendUpIcon() {
  return (
    <svg className="w-5 h-5 text-[#0F9D8A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  )
}

function ContributionIcon() {
  return (
    <div
      className="w-10 h-10 shrink-0"
      style={{
        maskImage: 'url(/dollar-icon.png)',
        WebkitMaskImage: 'url(/dollar-icon.png)',
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
        backgroundColor: '#0F9D8A',
      }}
      aria-hidden
    />
  )
}

function displayName(identifier: string | undefined): string {
  if (!identifier?.trim()) return ''
  if (identifier.includes('@')) {
    const local = identifier.split('@')[0]?.trim() ?? ''
    return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return identifier.trim()
}

export default function RiderDashboard() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, loading, logout, refreshUser } = useAuth()
  const identifier = (location.state as { email?: string } | null)?.email ?? user?.email ?? user?.phone_number ?? ''
  const name = displayName(identifier)
  const greetingName = name || (i18n.language === 'rw' ? 'Umumotari' : 'Rider')
  const isVerifiedMember = user?.role === 'RIDER' ? user.is_member_verified !== false : Boolean(user?.is_member_verified)

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'rw' : 'en')
  }

  const [todaysIncome, setTodaysIncome] = useState<number | null>(null)
  const [todaysContribution, setTodaysContribution] = useState<number | null>(null)
  const [contributions, setContributions] = useState<Awaited<ReturnType<typeof getMyContributions>>>([])
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecordItem[]>([])

  const loadDashboard = useCallback(async () => {
    if (user?.role !== 'RIDER') return
    const dateStr = new Date().toISOString().slice(0, 10)
    try {
      const [income, contribs, incomes] = await Promise.all([
        getIncomeForDate(dateStr),
        getMyContributions(),
        getMyIncomeRecords(),
      ])

      const todaysContribTotal = contribs
        .filter((c) => c.date.slice(0, 10) === dateStr)
        .reduce((sum, c) => sum + Number(c.amount || 0), 0)

      setTodaysIncome(income)
      setTodaysContribution(todaysContribTotal)
      setContributions(contribs)
      setIncomeRecords(incomes)
    } catch {
      setTodaysIncome(0)
      setTodaysContribution(0)
      setContributions([])
      setIncomeRecords([])
    }
  }, [user?.role])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void refreshUser()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [refreshUser])

  useEffect(() => {
    if (loading) return
    if (!user) {
      navigate('/login?next=/rider', { replace: true })
      return
    }
    if (user.role === 'COOPERATIVE_ADMIN' && user.is_superuser !== true) {
      navigate('/admin', { replace: true })
    }
  }, [loading, user, navigate])

  useEffect(() => {
    if (loading || !user) return
    void loadDashboard()
  }, [loading, user, loadDashboard, location.pathname])

  const today = new Date()
  const dateFormatted =
    i18n.language === 'rw'
      ? (() => {
          const weekdays = t('date.weekdays', { returnObjects: true }) as string[]
          const months = t('date.months', { returnObjects: true }) as string[]
          if (Array.isArray(weekdays) && Array.isArray(months)) {
            const dayName = weekdays[today.getDay()]
            const monthName = months[today.getMonth()]
            return `${dayName}, ${monthName} ${today.getDate()}, ${today.getFullYear()}`
          }
          return today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        })()
      : today.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })

  const dateStr = today.toISOString().slice(0, 10)
  const hasIncomeToday = incomeRecords.some((r) => String(r.date).slice(0, 10) === dateStr)
  const hasContributionToday = contributions.some((c) => String(c.date).slice(0, 10) === dateStr)
  const contributionQuickActionBlocked = !isVerifiedMember || hasContributionToday

  const historyItems = useMemo(() => {
    type Row =
      | {
          kind: 'income'
          id: number
          date: string
          amount: number
          cooperative?: string
        }
      | {
          kind: 'contribution'
          id: number
          date: string
          amount: number
          cooperative?: string
          status: string
        }
    const items: Row[] = []
    for (const r of incomeRecords) {
      items.push({
        kind: 'income',
        id: r.id,
        date: String(r.date),
        amount: Number(r.amount || 0),
        cooperative: r.cooperative?.name,
      })
    }
    for (const c of contributions) {
      items.push({
        kind: 'contribution',
        id: c.id,
        date: String(c.date),
        amount: Number(c.amount || 0),
        cooperative: c.cooperative?.name,
        status: c.status,
      })
    }
    items.sort((a, b) => {
      const dc = b.date.localeCompare(a.date)
      if (dc !== 0) return dc
      const ko = (a.kind === 'income' ? 0 : 1) - (b.kind === 'income' ? 0 : 1)
      if (ko !== 0) return ko
      return b.id - a.id
    })
    return items
  }, [incomeRecords, contributions])

  if (loading) {
    return (
      <CenteredLayout>
        <div className="flex-1 flex items-center justify-center p-8 text-gray-600 text-sm">
          {t('rider.loading', 'Loading…')}
        </div>
      </CenteredLayout>
    )
  }

  if (!user) {
    return (
      <CenteredLayout>
        <div className="flex-1 flex items-center justify-center p-8 text-gray-600 text-sm">
          {t('rider.loading', 'Loading…')}
        </div>
      </CenteredLayout>
    )
  }

  if (user.role === 'COOPERATIVE_ADMIN' && user.is_superuser !== true) {
    return (
      <CenteredLayout>
        <div className="flex-1 flex items-center justify-center p-8 text-gray-600 text-sm">
          {t('rider.loading', 'Loading…')}
        </div>
      </CenteredLayout>
    )
  }

  return (
    <CenteredLayout>
      <header className="bg-[#0F9D8A] px-4 sm:px-6 py-4 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-white">
                {t('rider.greeting', { name: greetingName })}
              </h1>
              <p className="text-sm text-white/70 mt-0.5">{dateFormatted}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleLanguage}
                className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm py-1 transition-colors"
                aria-label={t('rider.language')}
              >
                <GlobeIcon />
                <span>{t('rider.language')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  logout()
                  navigate('/login')
                }}
                className="p-2 text-white/80 hover:text-white transition-colors"
                aria-label={t('rider.logout')}
              >
                <LogoutIcon />
              </button>
            </div>
          </div>
        </header>

      <main className="flex-1 px-4 sm:px-6 py-6 overflow-y-auto">
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-[#0F9D8A] uppercase tracking-wide mb-3">
            {t('rider.quickActions')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
            <Link
              to={hasIncomeToday ? '#' : '/rider/add-income'}
              state={{ email: identifier }}
              aria-disabled={hasIncomeToday}
              className={`bg-gray-50 rounded-xl shadow-soft p-4 sm:p-5 text-left transition-shadow block ${
                hasIncomeToday ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'hover:shadow-md'
              }`}
            >
              <div className="w-11 h-11 flex items-center justify-center mb-3">
                <IncomeActionIcon />
              </div>
              <p className="font-medium text-gray-900 text-sm">
                {t('rider.addIncomeTitle')}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('rider.addIncomeSubtitle')}
              </p>
              {hasIncomeToday && (
                <p className="text-xs text-amber-700 mt-1">
                  {t(
                    'rider.alreadyRecordedIncomeToday',
                    'You already recorded income for today.'
                  )}
                </p>
              )}
            </Link>
            <Link
              to={contributionQuickActionBlocked ? '#' : '/rider/submit-contribution'}
              state={{ email: identifier }}
              aria-disabled={contributionQuickActionBlocked}
              className={`bg-gray-50 rounded-xl shadow-soft p-4 sm:p-5 text-left transition-shadow block ${
                contributionQuickActionBlocked
                  ? 'opacity-60 cursor-not-allowed pointer-events-none'
                  : 'hover:shadow-md'
              }`}
            >
              <div className="w-11 h-11 flex items-center justify-center mb-3">
                <SubmitActionIcon />
              </div>
              <p className="font-medium text-gray-900 text-sm">
                {t('rider.submitContributionTitle')}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('rider.submitContributionSubtitle')}
              </p>
              {!isVerifiedMember && (
                <p className="text-xs text-red-600 mt-1">
                  {t(
                    'rider.notVerified',
                    'Waiting for your cooperative administrator to verify your membership.'
                  )}
                </p>
              )}
              {isVerifiedMember && hasContributionToday && (
                <p className="text-xs text-amber-700 mt-1">
                  {t(
                    'rider.alreadyRecordedContributionToday',
                    'You already submitted a contribution for today.'
                  )}
                </p>
              )}
            </Link>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-[#0F9D8A] uppercase tracking-wide mb-3">
            {t('rider.yourSummary')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-xl shadow-soft p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('rider.todaysIncome')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {todaysIncome === null ? '…' : `${Number(todaysIncome).toLocaleString()} RWF`}
                </p>
              </div>
              <TrendUpIcon />
            </div>
            <div className="bg-white rounded-xl shadow-soft p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('rider.todaysContribution')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {todaysContribution === null
                    ? '…'
                    : `${Number(todaysContribution).toLocaleString()} RWF`}
                </p>
              </div>
              <ContributionIcon />
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-[#0F9D8A] uppercase tracking-wide mb-3">
            {t('rider.paymentHistory', 'Payment & contribution history')}
          </h2>
          {historyItems.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-4">{t('rider.noHistoryYet', 'No payments or contributions yet.')}</p>
          ) : (
            <div className="bg-white rounded-xl shadow-soft overflow-hidden">
              <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                {historyItems.map((row) => {
                  if (row.kind === 'income') {
                    return (
                      <div
                        key={`income-${row.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {Number(row.amount).toLocaleString()} RWF
                          </p>
                          <p className="text-xs text-gray-500">
                            {row.date}
                            {row.cooperative ? ` · ${row.cooperative}` : ''}
                          </p>
                        </div>
                        <span className="text-xs font-medium shrink-0 text-[#0F9D8A]">
                          {t('rider.income', 'Income')}
                        </span>
                      </div>
                    )
                  }
                  const st = String(row.status).toUpperCase()
                  const isVerified = st === 'VERIFIED'
                  return (
                    <div
                      key={`contrib-${row.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {Number(row.amount).toLocaleString()} RWF
                        </p>
                        <p className="text-xs text-gray-500">
                          {row.date}
                          {row.cooperative ? ` · ${row.cooperative}` : ''}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium shrink-0 ${isVerified ? 'text-purple-600' : 'text-amber-600'}`}
                      >
                        {isVerified
                          ? t('rider.contribution', 'Contribution')
                          : t('rider.contributionPending', 'Pending approval')}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      </main>
    </CenteredLayout>
  )
}
