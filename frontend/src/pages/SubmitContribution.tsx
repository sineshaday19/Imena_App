import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import CenteredLayout from '@/components/CenteredLayout'
import { apiFetch, getCooperatives, type Cooperative } from '@/lib/api'

function GlobeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  )
}

function BackArrowIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:border-[#0F9D8A] focus:ring-2 focus:ring-[#0F9D8A]/20 focus:outline-none text-gray-900 placeholder-gray-400 transition-colors'

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export default function SubmitContribution() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as { email?: string } | null) ?? {}
  const [cooperatives, setCooperatives] = useState<Cooperative[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState('')

  useEffect(() => {
    getCooperatives()
      .then(setCooperatives)
      .catch(() => setCooperatives([]))
      .finally(() => setLoading(false))
  }, [])

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'rw' : 'en')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount.trim()) return
    const coop = cooperatives[0]
    if (!coop) {
      setError('No cooperative found. Please contact your administrator.')
      return
    }
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) return
    setError(null)
    setSubmitting(true)
    try {
      await apiFetch('/api/contributions/', {
        method: 'POST',
        body: JSON.stringify({
          cooperative: coop.id,
          date: formatDate(new Date()),
          amount: amt,
        }),
      })
      navigate('/rider', { state })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit contribution')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CenteredLayout>
      <div className="w-full max-w-mobile bg-white rounded-2xl shadow-soft overflow-hidden max-h-[90vh] flex flex-col">
        <header className="relative flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <Link
            to="/rider"
            state={state}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900 inline-flex"
            aria-label={t('submitContribution.back')}
          >
            <BackArrowIcon />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900 absolute left-1/2 -translate-x-1/2">
            {t('submitContribution.pageTitle')}
          </h1>
          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm"
            aria-label={t('submitContribution.language')}
          >
            <GlobeIcon />
            <span>{t('submitContribution.language')}</span>
          </button>
        </header>

        <div className="p-6 overflow-y-auto">
          <p className="text-sm text-gray-600 mb-6">
            {t('submitContribution.subtitle')}
          </p>

          {loading ? (
            <p className="text-sm text-gray-500">{t('submitContribution.loading', 'Loading...')}</p>
          ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                {t('submitContribution.amountLabel')}
              </label>
              <input
                id="amount"
                type="number"
                min="0"
                step="100"
                placeholder={t('submitContribution.amountPlaceholder')}
                className={inputClass}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl font-medium text-white bg-[#0F9D8A] hover:bg-[#0d8a7a] disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? t('submitContribution.submitting', 'Submitting...') : t('submitContribution.submit')}
            </button>
          </form>
          )}
        </div>
      </div>
    </CenteredLayout>
  )
}
