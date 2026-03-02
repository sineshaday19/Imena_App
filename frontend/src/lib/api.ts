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
export type UserMe = {
  id: number
  email: string
  phone_number: string
  role: string
  is_superuser?: boolean
  is_member_verified?: boolean
  cooperative?: { id: number; name: string } | null
}
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

/** Income for a specific date (e.g. today). Use date=YYYY-MM-DD. */
export async function getIncomeForDate(date: string): Promise<number> {
  const data = await apiFetch<{ total_income: string }>(`/api/income/summary/?date=${date}`)
  return parseFloat(data.total_income) || 0
}

/** Total contributions for the current user (rider). */
export async function getTotalContributions(): Promise<number> {
  const data = await apiFetch<{ total_amount: number | string | null }>(
    '/api/reports/contributions-summary/'
  )
  const v = data.total_amount
  return typeof v === 'number' ? v : parseFloat(String(v ?? 0)) || 0
}

/** Contributions summary (total + verified amount). Admin uses verified_amount for stats. */
export async function getContributionsSummary(): Promise<{
  total_amount: number
  verified_amount: number
  pending_amount: number
  total_count: number
  verified_count: number
  pending_count: number
}> {
  const data = await apiFetch<{
    total_amount: number | string | null
    verified_amount: number | string | null
    pending_amount: number | string | null
    total_count: number
    verified_count: number
    pending_count: number
  }>('/api/reports/contributions-summary/')
  const num = (v: number | string | null) =>
    typeof v === 'number' ? v : parseFloat(String(v ?? 0)) || 0
  return {
    total_amount: num(data.total_amount),
    verified_amount: num(data.verified_amount),
    pending_amount: num(data.pending_amount),
    total_count: data.total_count ?? 0,
    verified_count: data.verified_count ?? 0,
    pending_count: data.pending_count ?? 0,
  }
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

/** Contribution stats grouped by month or year (verified only for admin chart). */
export async function getContributionStats(
  groupBy: 'month' | 'year',
  year?: number
): Promise<StatPoint[]> {
  const params = new URLSearchParams({ group_by: groupBy, verified: '1' })
  if (year) params.set('year', String(year))
  const data = await apiFetch<{ data: { period: string; total: string }[] }>(
    `/api/reports/contributions-stats/?${params}`
  )
  return data.data.map((d) => ({ period: d.period, total: parseFloat(d.total) || 0 }))
}

export type IncomeRecordItem = {
  id: number
  rider: { id: number; email: string }
  cooperative: { id: number; name: string }
  date: string
  amount: string
  notes?: string
}

/** Recent income records for admin overview (last 10, with notes). */
export async function getRecentIncome(): Promise<IncomeRecordItem[]> {
  const data = await apiFetch<IncomeRecordItem[]>('/api/income/recent/')
  return Array.isArray(data) ? data : []
}

/** All income records for the current rider (payments to cooperative). */
export async function getMyIncomeRecords(): Promise<IncomeRecordItem[]> {
  const data = await apiFetch<IncomeRecordItem[] | { results: IncomeRecordItem[] }>('/api/income/')
  if (Array.isArray(data)) return data
  return Array.isArray((data as { results: IncomeRecordItem[] }).results)
    ? (data as { results: IncomeRecordItem[] }).results
    : []
}

export type ContributionItem = {
  id: number
  rider: { id: number; email: string; phone_number?: string }
  cooperative: { id: number; name: string }
  date: string
  amount: string
  status: string
  created_at: string
  updated_at: string
}

/** Recent contributions for admin overview (last 10, with amount and who made it). */
export async function getRecentContributions(): Promise<ContributionItem[]> {
  const data = await apiFetch<ContributionItem[]>('/api/contributions/recent/')
  return Array.isArray(data) ? data : []
}

/** All contributions for the current rider. */
export async function getMyContributions(): Promise<ContributionItem[]> {
  const data = await apiFetch<ContributionItem[] | { results: ContributionItem[] }>('/api/contributions/')
  if (Array.isArray(data)) return data
  return Array.isArray((data as { results: ContributionItem[] }).results)
    ? (data as { results: ContributionItem[] }).results
    : []
}

/** Verify a single contribution (admin). Only PENDING contributions can be verified. */
export async function verifyContribution(contributionId: number): Promise<ContributionItem> {
  return apiFetch<ContributionItem>(`/api/contributions/${contributionId}/verify/`, {
    method: 'POST',
  })
}

/** Unverify a contribution (admin). Only VERIFIED contributions can be set back to PENDING. */
export async function unverifyContribution(contributionId: number): Promise<ContributionItem> {
  return apiFetch<ContributionItem>(`/api/contributions/${contributionId}/unverify/`, {
    method: 'POST',
  })
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
