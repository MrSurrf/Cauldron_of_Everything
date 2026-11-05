import { getAccessToken } from '../../api/auth'

const REFRESH_TOKEN_KEY = 'surveyAuth.refresh'

function identityFromToken(token: string | null): string | null {
  if (!token) return null

  try {
    const encoded = token.split('.')[1]
    if (!encoded) return null
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const payload: unknown = JSON.parse(
      atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')),
    )
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null

    const claims = payload as { sub?: unknown; user_id?: unknown }
    const identity = claims.user_id ?? claims.sub
    if (typeof identity !== 'string' && typeof identity !== 'number') return null

    const value = String(identity)
    return value.length > 0 ? value : null
  } catch {
    return null
  }
}

/**
 * Локальная область разделяет медиа разных аккаунтов, но не является проверкой
 * авторизации. Refresh используется только как запасной стабильный идентификатор,
 * когда access-токен истёк между двумя локальными операциями.
 */
export function getCampaignWikiImageAccountScope(): string {
  try {
    const identity = identityFromToken(getAccessToken())
      ?? identityFromToken(localStorage.getItem(REFRESH_TOKEN_KEY))
    return identity ? encodeURIComponent(identity) : 'guest'
  } catch {
    return 'guest'
  }
}

