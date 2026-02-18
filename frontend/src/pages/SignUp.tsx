import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch, getCooperativesForSignup, type Cooperative } from '@/lib/api'

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

type Role = 'rider' | 'administrator'

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:border-[#0F9D8A] focus:ring-2 focus:ring-[#0F9D8A]/20 focus:outline-none text-gray-900 placeholder-gray-400 transition-colors'

export default function SignUp() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<Role>('rider')
  const [cooperativeId, setCooperativeId] = useState<string>('')
  const [cooperatives, setCooperatives] = useState<Cooperative[]>([])
  const [coopsLoading, setCoopsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getCooperativesForSignup()
      .then(setCooperatives)
      .finally(() => setCoopsLoading(false))
  }, [])

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'rw' : 'en')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError(t('signup.errors.emailRequired', 'Email is required'))
      return
    }
    if (password.length < 8) {
      setError(t('signup.errors.passwordMin', 'Password must be at least 8 characters'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('signup.errors.passwordsMatch', 'Passwords do not match'))
      return
    }
    if (role === 'rider' && !cooperativeId) {
      setError(t('signup.errors.cooperativeRequired', 'Please select a cooperative'))
      return
    }
    setSubmitting(true)
    try {
      await apiFetch('/api/users/register/', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          password,
          confirm_password: confirmPassword,
          full_name: fullName.trim(),
          role,
          ...(role === 'rider' && cooperativeId ? { cooperative_id: parseInt(cooperativeId, 10) } : {}),
        }),
      })
      navigate('/login', { state: { message: t('signup.successMessage', 'Account created! You can now log in.') } })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
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

      {/* Card – 390px mobile width */}
      <div className="relative z-10 w-full max-w-mobile bg-white rounded-2xl shadow-soft p-8 mx-4 max-h-[90vh] overflow-y-auto">
        <header className="relative flex items-center justify-between px-0 py-0 mb-4 -mt-1">
          <Link
            to="/"
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900 inline-flex"
            aria-label={t('signup.back')}
          >
            <BackArrowIcon />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900 absolute left-1/2 -translate-x-1/2">
            {t('signup.pageTitle')}
          </h1>
          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm"
            aria-label={t('signup.language')}
          >
            <GlobeIcon />
            <span>{t('signup.language')}</span>
          </button>
        </header>

        <div className="p-6 overflow-y-auto">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('signup.appName')}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {t('signup.subtitle')}
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <div>
              <label htmlFor="fullName" className="sr-only">
                {t('signup.fullName')}
              </label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder={t('signup.fullNamePlaceholder')}
                className={inputClass}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">
                {t('signup.email')}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={t('signup.emailPlaceholder')}
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="phone" className="sr-only">
                {t('signup.phone')}
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder={t('signup.phonePlaceholder')}
                className={inputClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">
                {t('signup.roleLabel')}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRole('rider')}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium border-2 transition-colors ${
                    role === 'rider'
                      ? 'border-[#0F9D8A] bg-[#0F9D8A]/10 text-[#0F9D8A]'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t('signup.roleRider')}
                </button>
                <button
                  type="button"
                  onClick={() => setRole('administrator')}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium border-2 transition-colors ${
                    role === 'administrator'
                      ? 'border-[#0F9D8A] bg-[#0F9D8A]/10 text-[#0F9D8A]'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t('signup.roleAdministrator')}
                </button>
              </div>
            </div>

            {role === 'rider' && (
              <div>
                <label htmlFor="cooperativeId" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('signup.cooperativeName')}
                </label>
                <select
                  id="cooperativeId"
                  className={inputClass}
                  value={cooperativeId}
                  onChange={(e) => setCooperativeId(e.target.value)}
                >
                  <option value="">{t('signup.cooperativeNamePlaceholder')}</option>
                  {cooperatives.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {cooperatives.length === 0 && !coopsLoading && (
                  <p className="text-sm text-amber-600 mt-1">{t('signup.noCooperatives')}</p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="password" className="sr-only">
                {t('signup.password')}
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder={t('signup.passwordPlaceholder')}
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                {t('signup.confirmPassword')}
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder={t('signup.confirmPasswordPlaceholder')}
                className={inputClass}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl font-medium text-white bg-[#0F9D8A] hover:bg-[#0d8a7a] disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? t('signup.creatingAccount', 'Creating account...') : t('signup.createAccount')}
            </button>
          </form>

          <p className="mt-6 text-sm text-gray-600 text-center">
            {t('signup.haveAccount')}{' '}
            <Link to="/login" className="text-[#0F9D8A] font-medium hover:underline">
              {t('signup.logIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
