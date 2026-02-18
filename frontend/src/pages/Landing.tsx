import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function GlobeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  )
}

export default function Landing() {
  const { t, i18n } = useTranslation()
  const [heroImageError, setHeroImageError] = useState(false)

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'rw' : 'en')
  }

  return (
    <div className="min-h-screen bg-[#F5F7F6] flex flex-col items-center py-6 px-4 sm:py-8">
      {/* Language selector – top right */}
      <div className="w-full max-w-mobile flex justify-end pr-0 mb-2">
        <button
          type="button"
          onClick={toggleLanguage}
          className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm"
          aria-label={t('landing.language')}
        >
          <GlobeIcon />
          <span>{t('landing.language')}</span>
        </button>
      </div>

      {/* Card – 390px mobile width */}
      <main className="w-full max-w-mobile bg-white rounded-2xl shadow-soft overflow-hidden flex flex-col flex-1">
        {/* Hero image – rounded top */}
        <div className="w-full aspect-[4/5] max-h-[320px] bg-gray-200 overflow-hidden rounded-t-2xl flex items-center justify-center">
          {heroImageError ? (
            <span className="text-gray-400 text-sm">Woman rider</span>
          ) : (
            <img
              src="/woman-rider.png"
              alt=""
              className="w-full h-full object-cover object-center"
              onError={() => setHeroImageError(true)}
            />
          )}
        </div>

        <div className="flex flex-col flex-1 px-6 pt-6 pb-8">
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            {t('landing.appName')}
          </h1>
          <p className="text-base font-medium text-[#0F9D8A] text-center mt-2">
            {t('landing.subtitle')}
          </p>
          <p className="text-sm text-gray-600 text-center mt-3 leading-relaxed">
            {t('landing.description')}
          </p>

          <div className="mt-8 flex flex-col gap-4">
            <Link
              to="/login"
              className="w-full py-3.5 rounded-xl font-medium text-center text-white bg-[#0F9D8A] hover:bg-[#0d8a7a] transition-colors block"
            >
              {t('landing.logIn')}
            </Link>
            <p className="text-sm text-gray-600 text-center">
              {t('landing.newToImena')}{' '}
              <Link to="/signup" className="text-[#0F9D8A] font-medium hover:underline">
                {t('landing.createAccount')}
              </Link>
            </p>
          </div>

          <footer className="mt-auto pt-8 text-center text-gray-400 text-xs">
            {t('landing.footer')}
          </footer>
        </div>
      </main>
    </div>
  )
}
