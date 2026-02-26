import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import CenteredLayout from '@/components/CenteredLayout'
import { getCooperativeDetail, verifyMember, type CooperativeDetail, type CooperativeMember } from '@/lib/api'

function BackArrowIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
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

export default function CooperativeMembers() {
  const { id } = useParams<{ id: string }>()
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const [coop, setCoop] = useState<CooperativeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Track per-member toggling state: memberId -> true while request in flight
  const [toggling, setToggling] = useState<Record<number, boolean>>({})

  useEffect(() => {
    if (!id) return
    getCooperativeDetail(Number(id))
      .then(setCoop)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [id])

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'rw' : 'en')
  }

  async function handleVerify(member: CooperativeMember) {
    if (!id || toggling[member.id]) return
    setToggling((prev) => ({ ...prev, [member.id]: true }))
    try {
      const result = await verifyMember(Number(id), member.id)
      // Update just that member's is_verified in local state — no full refetch needed
      setCoop((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          members: prev.members.map((m) =>
            m.id === member.id ? { ...m, is_verified: result.is_verified } : m
          ),
        }
      })
    } catch {
      // silently ignore — button will revert to its previous state automatically
    } finally {
      setToggling((prev) => ({ ...prev, [member.id]: false }))
    }
  }

  return (
    <CenteredLayout>
      <header className="relative flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-100 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900 inline-flex"
            aria-label="Back"
          >
            <BackArrowIcon />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 absolute left-1/2 -translate-x-1/2 truncate max-w-[55%]">
            {loading ? 'Loading...' : (coop?.name ?? 'Cooperative')}
          </h1>
          <button
            type="button"
            onClick={toggleLanguage}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            {i18n.language === 'en' ? 'Kinyarwanda' : 'English'}
          </button>
        </header>

      <main className="flex-1 px-4 sm:px-6 py-6 overflow-y-auto">
          {loading && (
            <p className="text-sm text-gray-400 text-center mt-8">Loading members...</p>
          )}

          {error && (
            <p className="text-sm text-red-600 text-center mt-8">{error}</p>
          )}

          {!loading && !error && coop && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">
                  {coop.members.length} {coop.members.length === 1 ? 'member' : 'members'}
                </p>
                <p className="text-xs text-gray-400">
                  {coop.members.filter((m) => m.is_verified).length} verified
                </p>
              </div>

              {coop.members.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a4 4 0 00-4-4h-1m-4 6H2v-2a4 4 0 014-4h7m0 0a4 4 0 10-8 0 4 4 0 008 0zm6 2a3 3 0 10-6 0 3 3 0 006 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">No riders yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Riders will appear here once they register and select this cooperative.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {coop.members.map((m, i) => (
                    <li key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-[#0F9D8A]/10 text-[#0F9D8A] flex items-center justify-center font-semibold text-sm shrink-0">
                        {m.email[0].toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{m.email}</p>
                        <p className="text-xs text-gray-400 mt-0.5">#{i + 1} · Rider</p>
                      </div>

                      {/* Verify toggle */}
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
                        {toggling[m.id] ? '...' : m.is_verified ? 'Verified' : 'Verify'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
      </main>
    </CenteredLayout>
  )
}
