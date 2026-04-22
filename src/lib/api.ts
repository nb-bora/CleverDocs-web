import { apiBaseUrl } from './config'
import { authStore } from './authStore'

export class ApiError extends Error {
  status: number
  detail: unknown
  constructor(status: number, message: string, detail: unknown) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null

export function buildAuthHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra)
  const { accessToken, orgId } = authStore.get()
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  if (orgId) headers.set('X-Org-Id', orgId)
  return headers
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('application/json')) return null
  try {
    return (await res.json()) as unknown
  } catch {
    return null
  }
}

async function refreshAccessToken(): Promise<string> {
  const { refreshToken } = authStore.get()
  if (!refreshToken) throw new ApiError(401, 'No refresh token', null)

  const res = await fetch(`${apiBaseUrl()}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  const data = (await parseJsonSafe(res)) as any
  if (!res.ok) throw new ApiError(res.status, 'Refresh failed', data)

  const access = String(data?.access_token || '')
  const nextRefresh = String(data?.refresh_token || '')
  if (!access || !nextRefresh) throw new ApiError(500, 'Invalid refresh response', data)
  authStore.setTokens(access, nextRefresh)
  return access
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url = `${apiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`

  const headers = buildAuthHeaders(init.headers)
  if (!headers.has('accept')) headers.set('accept', 'application/json')

  const doReq = async () =>
    fetch(url, {
      ...init,
      headers,
    })

  let res = await doReq()
  if (res.status === 401 && authStore.get().refreshToken) {
    try {
      const newAccess = await refreshAccessToken()
      headers.set('Authorization', `Bearer ${newAccess}`)
      res = await doReq()
    } catch {
      authStore.clear()
    }
  }

  if (!res.ok) {
    const detail = await parseJsonSafe(res)
    const msg = typeof detail === 'object' && detail && 'detail' in (detail as any) ? 'API error' : res.statusText
    throw new ApiError(res.status, msg, detail)
  }

  // If endpoint returns a file / empty body, let caller handle via fetch directly.
  const data = (await parseJsonSafe(res)) as T
  return data
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${apiBaseUrl()}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = (await parseJsonSafe(res)) as any
  if (!res.ok) throw new ApiError(res.status, 'Login failed', data)
  const access = String(data?.access_token || '')
  const refresh = String(data?.refresh_token || '')
  if (!access || !refresh) throw new ApiError(500, 'Invalid login response', data)
  authStore.setTokens(access, refresh)
  return { accessToken: access, refreshToken: refresh }
}

export async function apiLogout() {
  const { refreshToken } = authStore.get()
  if (refreshToken) {
    await apiFetch('/v1/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken } satisfies Json),
    })
  }
  authStore.clear()
}

