// Общая авторизация сайта по email-коду. Ключи сохранены для существующих сессий.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

const ACCESS_KEY = 'surveyAuth.access'
const REFRESH_KEY = 'surveyAuth.refresh'
export const AUTH_CHANGED_EVENT = 'site-auth-changed'

function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}

export type AuthTokens = {
  access: string
  refresh: string
}

export function getAccessToken(): string | null {
  return typeof localStorage === 'undefined' ? null : localStorage.getItem(ACCESS_KEY)
}

export function saveTokens(tokens: AuthTokens): void {
  localStorage.setItem(ACCESS_KEY, tokens.access)
  localStorage.setItem(REFRESH_KEY, tokens.refresh)
  notifyAuthChanged()
}

export function clearTokens(): void {
  const hadTokens = Boolean(localStorage.getItem(ACCESS_KEY) || localStorage.getItem(REFRESH_KEY))
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  if (hadTokens) notifyAuthChanged()
}

export async function requestCode(email: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/request-code/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(
      data?.detail || `Не удалось отправить код: HTTP ${response.status}`,
    )
  }
}

export async function verifyCode(
  email: string,
  code: string,
): Promise<AuthTokens> {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-code/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(
      data?.detail || `Не удалось проверить код: HTTP ${response.status}`,
    )
  }

  return response.json() as Promise<AuthTokens>
}

async function requestRefresh(): Promise<string | null> {
  const refresh = localStorage.getItem(REFRESH_KEY)
  if (!refresh) {
    return null
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })

  if (localStorage.getItem(REFRESH_KEY) !== refresh) return null
  if (response.status === 401 || response.status === 403) {
    clearTokens()
    return null
  }
  if (!response.ok) throw new Error('Не удалось обновить сессию. Попробуйте позже.')

  const data = (await response.json()) as { access: string }
  if (localStorage.getItem(REFRESH_KEY) !== refresh) return null
  localStorage.setItem(ACCESS_KEY, data.access)
  return data.access
}

let pendingRefresh: Promise<string | null> | null = null

function refreshAccessToken() {
  pendingRefresh ??= requestRefresh().finally(() => { pendingRefresh = null })
  return pendingRefresh
}

export async function checkSession(signal?: AbortSignal): Promise<boolean> {
  if (!getAccessToken() && !localStorage.getItem(REFRESH_KEY)) return false
  const response = await authFetch(`${API_BASE_URL}/api/auth/session/`, { signal })
  if (response.status === 401 || response.status === 403) return false
  if (!response.ok) throw new Error('Не удалось проверить доступ. Попробуйте ещё раз.')
  const session = await response.json() as { authenticated?: boolean }
  if (session.authenticated !== true) throw new Error('Сервер не подтвердил доступ к сайту.')
  return true
}

// fetch с заголовком авторизации; при 401 один раз обновляет токен и повторяет запрос
export async function authFetch(
  input: string,
  init: RequestInit = {},
  options: { forbiddenScope?: 'site' | 'resource' } = {},
): Promise<Response> {
  const withAuth = (token: string | null): RequestInit => {
    const headers = new Headers(init.headers)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return { ...init, headers }
  }

  let token = getAccessToken()
  let response = await fetch(input, withAuth(token))

  if (response.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      token = newToken
      response = await fetch(input, withAuth(newToken))
    }
  }

  // Отказ к отдельной кампании/персонажу не означает отзыв доступа ко всему сайту.
  // Для существующих запросов и checkSession сохраняется прежнее поведение.
  if ((response.status === 401 || (response.status === 403 && options.forbiddenScope !== 'resource')) && getAccessToken() === token) clearTokens()
  return response
}
