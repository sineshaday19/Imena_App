import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CenteredLayout from '@/components/CenteredLayout'

function GlobeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
      />
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

export type LegalDocId = 'privacy' | 'eula'

interface LegalDocumentPageProps {
  doc: LegalDocId
}

export default function LegalDocumentPage({ doc }: LegalDocumentPageProps) {
  const { t, i18n } = useTranslation()
  const prefix = `legal.${doc}`

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'rw' : 'en')
  }

  const sections = [1, 2, 3, 4].map((n) => ({
    title: t(`${prefix}.s${n}Title`),
    body: t(`${prefix}.s${n}Body`),
  }))

  const otherDoc = doc === 'privacy' ? 'eula' : 'privacy'
  const otherPath = otherDoc === 'privacy' ? '/privacy' : '/eula'
  const otherLabel =
    otherDoc === 'privacy' ? t('legal.navPrivacy') : t('legal.navEula')

  return (
    <CenteredLayout wide>
      <div className="flex flex-col flex-1 min-h-0 max-h-[92vh]">
        <header className="flex-shrink-0 flex items-center justify-between gap-2 px-4 sm:px-6 py-4 border-b border-gray-100">
          <Link
            to="/"
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900 inline-flex items-center gap-1.5 text-sm font-medium"
            aria-label={t('legal.backHome')}
          >
            <BackArrowIcon />
            <span className="hidden sm:inline">{t('legal.backHome')}</span>
          </Link>
          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm flex-shrink-0"
            aria-label={t('legal.language')}
          >
            <GlobeIcon />
            <span>{t('legal.language')}</span>
          </button>
        </header>

        <article className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 text-gray-800">
          <h1 className="text-2xl font-bold text-gray-900">{t(`${prefix}.pageTitle`)}</h1>
          <p className="mt-2 text-base font-medium text-[#0F9D8A]">{t(`${prefix}.subtitle`)}</p>
          <p className="mt-1 text-xs text-gray-500">{t(`${prefix}.lastUpdated`)}</p>
          <p className="mt-6 text-sm leading-relaxed text-gray-700">{t(`${prefix}.intro`)}</p>

          <ol className="mt-8 space-y-8 list-none p-0 m-0">
            {sections.map((section, index) => (
              <li key={section.title}>
                <h2 className="text-lg font-semibold text-gray-900">
                  <span className="text-[#0F9D8A] mr-2">{index + 1}.</span>
                  {section.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-gray-700">{section.body}</p>
              </li>
            ))}
          </ol>

          <p className="mt-10 pt-6 border-t border-gray-100 text-sm text-gray-600">
            {doc === 'privacy' ? t('legal.privacyClosing') : t('legal.eulaClosing')}{' '}
            <Link to={otherPath} className="text-[#0F9D8A] font-medium hover:underline">
              {otherLabel}
            </Link>
            .
          </p>
        </article>
      </div>
    </CenteredLayout>
  )
}
