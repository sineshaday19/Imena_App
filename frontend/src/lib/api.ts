/**
 * API client for Imena backend.
 * Uses JWT access token from localStorage when available.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

function getAccessToken(): string | null {
  return localStorage.getItem('imena_access_token')
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  const token = getAccessToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(url, { ...options, headers })
  if (!res.ok) {
    const body = await res.text()
    let message = body
    try {
      const j = JSON.parse(body) as Record<string, unknown>
      if (j.detail) message = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail)
      else if (j.cooperative) message = (j.cooperative as string[])[0] || body
      else if (j.date) message = (j.date as string[])[0] || body
      else if (typeof j === 'object' && j !== null) {
        const firstKey = Object.keys(j)[0]
        const val = j[firstKey]
        if (Array.isArray(val) && val[0]) message = String(val[0])
        else if (typeof val === 'string') message = val
      }
    } catch {
      // use body as-is
    }
    throw new Error(message || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem('imena_access_token', access)
  localStorage.setItem('imena_refresh_token', refresh)
}

export function clearTokens(): void {
  localStorage.removeItem('imena_access_token')
  localStorage.removeItem('imena_refresh_token')
}

export type TokenResponse = { access: string; refresh: string }
export type UserMe = { id: number; email: string; role: string }
export type Cooperative = { id: number; name: string }

export async function getCooperatives(): Promise<Cooperative[]> {
  const data = await apiFetch<Cooperative[]>('/api/cooperatives/')
  return Array.isArray(data) ? data : []
}

/** Public list for signup form - no auth required */
export async function getCooperativesForSignup(): Promise<Cooperative[]> {
  const base = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
  const res = await fetch(`${base}/api/cooperatives/signup_choices/`)
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function createCooperative(name: string): Promise<Cooperative> {
  return apiFetch<Cooperative>('/api/cooperatives/', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}
