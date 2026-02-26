import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import CenteredLayout from '@/components/CenteredLayout'
import { useAuth } from '@/contexts/AuthContext'

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

function PlusIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9 2zm0 0v-8" />
    </svg>
  )
}

function TrendUpIcon() {
  return (
    <svg className="w-5 h-5 text-[#0F9D8A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  )
}

function WalletIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
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
  const { user, logout } = useAuth()
  const identifier = (location.state as { email?: string } | null)?.email ?? user?.email ?? user?.phone_number ?? ''
  const name = displayName(identifier)
  const greetingName = name || (i18n.language === 'rw' ? 'Umumotari' : 'Rider')

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'rw' : 'en')
  }

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

  return (
    <CenteredLayout>
      <header className="border-b border-gray-100 px-4 sm:px-6 py-4 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-gray-900">
                {t('rider.greeting', { name: greetingName })}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">{dateFormatted}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleLanguage}
                className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm py-1"
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
                className="p-2 text-gray-500 hover:text-gray-700"
                aria-label={t('rider.logout')}
              >
                <LogoutIcon />
              </button>
            </div>
          </div>
        </header>

      <main className="flex-1 px-4 sm:px-6 py-6 overflow-y-auto">
        {/* Quick Actions */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {t('rider.quickActions')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
            <Link
              to="/rider/add-income"
              state={{ email: identifier }}
              className="bg-gray-50 rounded-xl shadow-soft p-4 sm:p-5 text-left hover:shadow-md transition-shadow block"
            >
              <div className="w-12 h-12 rounded-full bg-[#0F9D8A] flex items-center justify-center text-white mb-3">
                <PlusIcon />
              </div>
              <p className="font-medium text-gray-900 text-sm">
                {t('rider.addIncomeTitle')}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('rider.addIncomeSubtitle')}
              </p>
            </Link>
            <Link
              to="/rider/submit-contribution"
              state={{ email: identifier }}
              className="bg-gray-50 rounded-xl shadow-soft p-4 sm:p-5 text-left hover:shadow-md transition-shadow block"
            >
              <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white mb-3">
                <SendIcon />
              </div>
              <p className="font-medium text-gray-900 text-sm">
                {t('rider.submitContributionTitle')}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('rider.submitContributionSubtitle')}
              </p>
            </Link>
          </div>
        </section>

        {/* Your Summary */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {t('rider.yourSummary')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-xl shadow-soft p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('rider.todaysIncome')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">25,000 RWF</p>
              </div>
              <TrendUpIcon />
            </div>
            <div className="bg-white rounded-xl shadow-soft p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('rider.totalContributions')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">150,000 RWF</p>
              </div>
              <WalletIcon />
            </div>
          </div>
        </section>
      </main>
    </CenteredLayout>
  )
}
