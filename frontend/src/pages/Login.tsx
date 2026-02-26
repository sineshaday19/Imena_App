import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

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

export default function Login() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'rw' : 'en')
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <img
        src="/woman-rider.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover blur-md scale-110"
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" aria-hidden />

      {/* Card — full screen on mobile, centered card on tablet+ */}
      <div className="relative z-10 w-full sm:max-w-md bg-white sm:rounded-2xl shadow-soft p-6 sm:p-8 mx-0 sm:mx-4 min-h-screen sm:min-h-0 sm:max-h-[90vh] overflow-y-auto flex flex-col justify-center">
        <header className="relative flex items-center justify-between px-0 py-0 mb-4 -mt-1">
          <Link
            to="/"
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900 inline-flex"
            aria-label={t('login.back')}
          >
            <BackArrowIcon />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900 absolute left-1/2 -translate-x-1/2">
            {t('login.pageTitle')}
          </h1>
          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm"
            aria-label={t('login.language')}
          >
            <GlobeIcon />
            <span>{t('login.language')}</span>
          </button>
        </header>

        <div className="px-0 sm:px-2 pt-2">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('login.appName')}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {t('login.subtitle')}
          </p>

          <form
            className="mt-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!email.trim() || !password.trim()) return
              setError(null)
              setSubmitting(true)
              try {
                const user = await login(email.trim(), password)
                const isAdmin = user.role === 'COOPERATIVE_ADMIN'
                navigate(isAdmin ? '/admin' : '/rider', { state: { email: user.email || user.phone_number } })
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Login failed')
              } finally {
                setSubmitting(false)
              }
            }}
          >
            <div>
              <label htmlFor="email" className="sr-only">
                {t('login.emailOrPhone')}
              </label>
              <input
                id="email"
                type="text"
                autoComplete="username"
                placeholder={t('login.emailOrPhonePlaceholder')}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:border-[#0F9D8A] focus:ring-2 focus:ring-[#0F9D8A]/20 focus:outline-none text-gray-900 placeholder-gray-400 transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <div>
              <label htmlFor="password" className="sr-only">
                {t('login.password')}
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder={t('login.passwordPlaceholder')}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:border-[#0F9D8A] focus:ring-2 focus:ring-[#0F9D8A]/20 focus:outline-none text-gray-900 placeholder-gray-400 transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl font-medium text-white bg-[#0F9D8A] hover:bg-[#0d8a7a] disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? t('login.loggingIn', 'Logging in...') : t('login.logIn')}
            </button>
          </form>

          <p className="mt-6 text-sm text-gray-600 text-center">
            {t('login.noAccount')}{' '}
            <Link to="/signup" className="text-[#0F9D8A] font-medium hover:underline">
              {t('login.signUp')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
