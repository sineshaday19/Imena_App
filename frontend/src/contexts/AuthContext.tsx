import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import {
  apiFetch,
  clearTokensForPersona,
  fetchMeWithAccessToken,
  getAccessTokenForPersona,
  persistSessionForUser,
  userMayAccessAdminDashboard,
  type TokenResponse,
  type UserMe,
} from '@/lib/api'

function isLikelyUnauthorizedError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return (
    /\b401\b/.test(msg) ||
    /unauthorized|not authenticated|token is invalid|token not valid|not valid for any token type/i.test(
      msg
    )
  )
}

function routePersona(pathname: string): 'rider' | 'admin' | null {
  if (pathname.startsWith('/admin')) return 'admin'
  if (pathname.startsWith('/rider')) return 'rider'
  return null
}

interface AuthContextValue {
  user: UserMe | null
  loading: boolean
  login: (username: string, password: string) => Promise<UserMe>
  logout: (scope?: 'rider' | 'admin' | 'all') => void
  refreshUser: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const persona = routePersona(pathname)

  const [riderUser, setRiderUser] = useState<UserMe | null>(null)
  const [adminUser, setAdminUser] = useState<UserMe | null>(null)
  const [riderLoading, setRiderLoading] = useState(false)
  const [adminLoading, setAdminLoading] = useState(false)

  const user = persona === 'admin' ? adminUser : persona === 'rider' ? riderUser : null
  const loading =
    persona === 'admin' ? adminLoading : persona === 'rider' ? riderLoading : false

  const loadRiderProfile = useCallback(async () => {
    if (!getAccessTokenForPersona('rider')) {
      setRiderUser(null)
      return
    }
    try {
      const me = await apiFetch<UserMe>('/api/users/me/', {}, 'rider')
      setRiderUser(me)
    } catch (e) {
      if (isLikelyUnauthorizedError(e)) {
        clearTokensForPersona('rider')
        setRiderUser(null)
      }
    }
  }, [])

  const loadAdminProfile = useCallback(async () => {
    if (!getAccessTokenForPersona('admin')) {
      setAdminUser(null)
      return
    }
    try {
      const me = await apiFetch<UserMe>('/api/users/me/', {}, 'admin')
      setAdminUser(me)
    } catch (e) {
      if (isLikelyUnauthorizedError(e)) {
        clearTokensForPersona('admin')
        setAdminUser(null)
      }
    }
  }, [])

  useEffect(() => {
    if (pathname.startsWith('/rider')) {
      setRiderLoading(true)
      void loadRiderProfile().finally(() => setRiderLoading(false))
    } else if (pathname.startsWith('/admin')) {
      setAdminLoading(true)
      void loadAdminProfile().finally(() => setAdminLoading(false))
    }
  }, [pathname, loadRiderProfile, loadAdminProfile])

  const refreshUser = useCallback(async () => {
    if (pathname.startsWith('/rider')) await loadRiderProfile()
    else if (pathname.startsWith('/admin')) await loadAdminProfile()
  }, [pathname, loadRiderProfile, loadAdminProfile])

  const login = useCallback(async (username: string, password: string): Promise<UserMe> => {
    const data = await apiFetch<TokenResponse>(
      '/api/token/',
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      },
      'none'
    )
    const me = await fetchMeWithAccessToken(data.access)
    persistSessionForUser(me, data.access, data.refresh)
    if (me.role === 'RIDER' || me.is_superuser === true) {
      setRiderUser(me)
    }
    if (userMayAccessAdminDashboard(me)) {
      setAdminUser(me)
    }
    return me
  }, [])

  const logout = useCallback(
    (scope?: 'rider' | 'admin' | 'all') => {
      const p =
        scope ??
        (pathname.startsWith('/admin') ? 'admin' : pathname.startsWith('/rider') ? 'rider' : 'all')
      if (p === 'all' || p === 'rider') {
        clearTokensForPersona('rider')
        setRiderUser(null)
      }
      if (p === 'all' || p === 'admin') {
        clearTokensForPersona('admin')
        setAdminUser(null)
      }
    },
    [pathname]
  )

  const value: AuthContextValue = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    isAuthenticated: persona ? Boolean(user) : false,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
