/**
 * API client for Imena backend.
 * Uses JWT access token from localStorage when available.
 */

const API_BASE: string = import.meta.env.VITE_API_URL

function getAccessToken(): string | null {
  return localStorage.getItem('imena_access_token')
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem('imena_refresh_token')
  if (!refresh) return null
  try {
    const res = await fetch(`${API_BASE}/api/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (!res.ok) return null
    const data = await res.json() as { access: string }
    localStorage.setItem('imena_access_token', data.access)
    return data.access
  } catch {
    return null
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  let token = getAccessToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }
  let res = await fetch(url, { ...options, headers })

  // If 401, try refreshing the access token once then retry
  if (res.status === 401 && !path.includes('/api/token/')) {
    token = await refreshAccessToken()
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
      res = await fetch(url, { ...options, headers })
    }
  }

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
      // use body as-is only if it's not HTML
      if (body.trimStart().startsWith('<')) {
        message = res.status >= 500 ? 'Server error. Please try again.' : 'Request failed.'
      }
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
export type UserMe = { id: number; email: string; phone_number: string; role: string; is_superuser?: boolean }
export type CooperativeMember = { id: number; email: string; is_verified: boolean }
export type Cooperative = { id: number; name: string }
export type CooperativeDetail = {
  id: number
  name: string
  created_at: string
  updated_at: string
  members: CooperativeMember[]
  admins: CooperativeMember[]
}

export async function getTotalIncome(): Promise<number> {
  const data = await apiFetch<{ total_income: string }>('/api/income/summary/')
  return parseFloat(data.total_income) || 0
}

export type StatPoint = { period: string; total: number }

export async function getIncomeStats(
  groupBy: 'month' | 'year',
  year?: number
): Promise<StatPoint[]> {
  const params = new URLSearchParams({ group_by: groupBy })
  if (year) params.set('year', String(year))
  const data = await apiFetch<{ data: { period: string; total: string }[] }>(
    `/api/income/stats/?${params}`
  )
  return data.data.map((d) => ({ period: d.period, total: parseFloat(d.total) || 0 }))
}

export async function getCooperatives(): Promise<Cooperative[]> {
  const data = await apiFetch<Cooperative[]>('/api/cooperatives/')
  return Array.isArray(data) ? data : []
}

/** Public list for signup form - no auth required */
export async function getCooperativesForSignup(): Promise<Cooperative[]> {
  const res = await fetch(`${API_BASE}/api/cooperatives/signup_choices/`)
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function getCooperativeDetail(id: number): Promise<CooperativeDetail> {
  return apiFetch<CooperativeDetail>(`/api/cooperatives/${id}/`)
}

export async function createCooperative(name: string): Promise<Cooperative> {
  return apiFetch<Cooperative>('/api/cooperatives/', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function verifyMember(
  cooperativeId: number,
  memberId: number
): Promise<{ id: number; is_verified: boolean }> {
  return apiFetch(`/api/cooperatives/${cooperativeId}/members/${memberId}/verify/`, {
    method: 'POST',
  })
}
