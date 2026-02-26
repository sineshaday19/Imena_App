import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { apiFetch, clearTokens, setTokens, type TokenResponse, type UserMe } from '@/lib/api'

interface AuthState {
  user: UserMe | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<UserMe>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
  }, [])

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('imena_access_token')
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const me = await apiFetch<UserMe>('/api/users/me/')
      setUser(me)
    } catch {
      clearTokens()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const login = useCallback(
    async (username: string, password: string): Promise<UserMe> => {
      const data = await apiFetch<TokenResponse>('/api/token/', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      setTokens(data.access, data.refresh)
      const me = await apiFetch<UserMe>('/api/users/me/')
      setUser(me)
      return me
    },
    []
  )

  const value: AuthContextValue = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
