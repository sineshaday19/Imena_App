const API_BASE: string = import.meta.env.VITE_API_URL

const LEGACY_ACCESS = 'imena_access_token'
const LEGACY_REFRESH = 'imena_refresh_token'

export type ApiPersona = 'rider' | 'admin'

export type ApiAuthMode = 'infer' | 'none' | ApiPersona

function accessKey(persona: ApiPersona): string {
  return persona === 'admin' ? 'imena_access_token_admin' : 'imena_access_token_rider'
}

function refreshKey(persona: ApiPersona): string {
  return persona === 'admin' ? 'imena_refresh_token_admin' : 'imena_refresh_token_rider'
}

export function getApiPersonaFromPathname(pathname: string): ApiPersona | null {
  if (pathname.startsWith('/admin')) return 'admin'
  if (pathname.startsWith('/rider')) return 'rider'
  return null
}

function migrateLegacyTokensIfNeeded(): void {
  try {
    const la = localStorage.getItem(LEGACY_ACCESS)
    const lr = localStorage.getItem(LEGACY_REFRESH)
    const hasNew =
      localStorage.getItem(accessKey('rider')) || localStorage.getItem(accessKey('admin'))
    if (la && lr && !hasNew) {
      localStorage.setItem(accessKey('rider'), la)
      localStorage.setItem(refreshKey('rider'), lr)
      localStorage.removeItem(LEGACY_ACCESS)
      localStorage.removeItem(LEGACY_REFRESH)
    }
  } catch {
  }
}

migrateLegacyTokensIfNeeded()

export function getAccessTokenForPersona(persona: ApiPersona): string | null {
  migrateLegacyTokensIfNeeded()
  return localStorage.getItem(accessKey(persona))
}

async function refreshAccessTokenForPersona(persona: ApiPersona): Promise<string | null> {
  const refresh = localStorage.getItem(refreshKey(persona))
  if (!refresh) return null
  try {
    const res = await fetch(`${API_BASE}/api/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (!res.ok) return null
    const data = await res.json() as { access: string }
    localStorage.setItem(accessKey(persona), data.access)
    return data.access
  } catch {
    return null
  }
}

function setTokensForPersona(persona: ApiPersona, access: string, refresh: string): void {
  localStorage.setItem(accessKey(persona), access)
  localStorage.setItem(refreshKey(persona), refresh)
}

export function clearTokensForPersona(persona: ApiPersona): void {
  localStorage.removeItem(accessKey(persona))
  localStorage.removeItem(refreshKey(persona))
}

export function clearAllImenaTokens(): void {
  clearTokensForPersona('rider')
  clearTokensForPersona('admin')
  try {
    localStorage.removeItem(LEGACY_ACCESS)
    localStorage.removeItem(LEGACY_REFRESH)
  } catch {
  }
}

export type TokenResponse = { access: string; refresh: string }
export type UserMe = {
  id: number
  email: string
  phone_number: string
  role: string
  is_superuser?: boolean
  is_staff?: boolean
  is_member_verified?: boolean
  cooperative?: { id: number; name: string } | null
}

export function userMayAccessAdminDashboard(user: UserMe): boolean {
  return user.role === 'COOPERATIVE_ADMIN' || user.is_superuser === true
}

export function persistSessionForUser(
  me: UserMe,
  access: string,
  refresh: string
): void {
  const adminCapable = userMayAccessAdminDashboard(me)
  const riderCapable = me.role === 'RIDER' || me.is_superuser === true
  if (riderCapable) setTokensForPersona('rider', access, refresh)
  if (adminCapable) setTokensForPersona('admin', access, refresh)
}

export async function fetchMeWithAccessToken(access: string): Promise<UserMe> {
  const url = `${API_BASE}/api/users/me/`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
  return res.json() as Promise<UserMe>
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  auth: ApiAuthMode = 'infer'
): Promise<T> {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  let persona: ApiPersona | null =
    auth === 'infer'
      ? typeof window !== 'undefined'
        ? getApiPersonaFromPathname(window.location.pathname)
        : null
      : auth === 'none'
        ? null
        : auth

  let token = persona ? getAccessTokenForPersona(persona) : null
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }
  let res = await fetch(url, { ...options, headers })

  if (res.status === 401 && !path.includes('/api/token/') && persona) {
    token = await refreshAccessTokenForPersona(persona)
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
      if (j.detail) {
        message = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail)
      } else if (Array.isArray(j.non_field_errors) && j.non_field_errors.length) {
        const n = j.non_field_errors[0]
        message = typeof n === 'string' ? n : String(n)
      } else if (j.cooperative) message = (j.cooperative as string[])[0] || body
      else if (j.date) message = (j.date as string[])[0] || body
      else if (typeof j === 'object' && j !== null) {
        const priority = [
          'phone_number',
          'cooperative_id',
          'cooperatives',
          'invite_code',
          'confirm_password',
          'password',
          'email',
        ] as const
        let picked = false
        for (const key of priority) {
          const val = j[key as string]
          if (Array.isArray(val) && val[0] !== undefined && val[0] !== '') {
            message = String(val[0])
            picked = true
            break
          }
          if (typeof val === 'string' && val) {
            message = val
            picked = true
            break
          }
        }
        if (!picked) {
          const firstKey = Object.keys(j)[0]
          const val = j[firstKey]
          if (Array.isArray(val) && val[0]) message = String(val[0])
          else if (typeof val === 'string') message = val
        }
      }
    } catch {
      if (body.trimStart().startsWith('<')) {
        message = res.status >= 500 ? 'Server error. Please try again.' : 'Request failed.'
      }
    }
    throw new Error(message || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
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

export async function getMyContributions(): Promise<ContributionItem[]> {
  const data = await apiFetch<ContributionItem[] | { results: ContributionItem[] }>('/api/contributions/')
  if (Array.isArray(data)) return data
  return Array.isArray((data as { results: ContributionItem[] }).results)
    ? (data as { results: ContributionItem[] }).results
    : []
}

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
