// Временный модуль авторизации по email-коду.
// Токены хранятся в localStorage; при смене подхода (например, на cookies)
// достаточно переписать этот файл и LoginPage.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

const ACCESS_KEY = 'surveyAuth.access'
const REFRESH_KEY = 'surveyAuth.refresh'

export type AuthTokens = {
  access: string
  refresh: string
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function saveTokens(tokens: AuthTokens): void {
  localStorage.setItem(ACCESS_KEY, tokens.access)
  localStorage.setItem(REFRESH_KEY, tokens.refresh)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
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

async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem(REFRESH_KEY)
  if (!refresh) {
    return null
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })

  if (!response.ok) {
    clearTokens()
    return null
  }

  const data = (await response.json()) as { access: string }
  localStorage.setItem(ACCESS_KEY, data.access)
  return data.access
}

// fetch с заголовком авторизации; при 401 один раз обновляет токен и повторяет запрос
export async function authFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const withAuth = (token: string | null): RequestInit => ({
    ...init,
    headers: {
      ...init.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  let response = await fetch(input, withAuth(getAccessToken()))

  if (response.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      response = await fetch(input, withAuth(newToken))
    }
  }

  return response
}
