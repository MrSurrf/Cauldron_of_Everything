import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authFetch, checkSession, clearTokens, saveTokens } from '../../shared/api/auth'

beforeEach(() => {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  })
  vi.stubGlobal('window', new EventTarget())
})
afterEach(() => vi.unstubAllGlobals())

describe('Проверка доступа к сайту', () => {
  it('отказ в конкретной кампании не разлогинивает, но 401 по-прежнему закрывает сессию', async () => {
    saveTokens({ access: 'token', refresh: 'refresh' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 403 })))
    const denied = await authFetch('/api/campaigns/foreign/table/public/', {}, { forbiddenScope: 'resource' })
    expect(denied.status).toBe(403)
    expect(localStorage.getItem('surveyAuth.access')).toBe('token')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))
    await authFetch('/api/campaigns/foreign/table/public/', {}, { forbiddenScope: 'resource' })
    expect(localStorage.getItem('surveyAuth.access')).toBeNull()
  })
  it('не разрешает вход без токенов', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    expect(await checkSession()).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('не доверяет наличию токена: серверный запрет очищает сессию', async () => {
    saveTokens({ access: 'old', refresh: 'refresh' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 403 })))
    expect(await checkSession()).toBe(false)
    expect(localStorage.getItem('surveyAuth.access')).toBeNull()
  })
  it('обновляет истёкший JWT и повторно проверяет серверный доступ', async () => {
    saveTokens({ access: 'expired', refresh: 'refresh' })
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ access: 'new' }))
      .mockResolvedValueOnce(Response.json({ authenticated: true }))
    vi.stubGlobal('fetch', fetch)
    expect(await checkSession()).toBe(true)
    expect(fetch.mock.calls[2][1].headers.get('Authorization')).toBe('Bearer new')
  })
  it('не открывает сайт при недоступном сервере и сохраняет токены для повтора', async () => {
    saveTokens({ access: 'token', refresh: 'refresh' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })))
    await expect(checkSession()).rejects.toThrow()
    expect(localStorage.getItem('surveyAuth.access')).toBe('token')
  })
  it('сохраняет пользовательские заголовки и сигнал отмены', async () => {
    saveTokens({ access: 'token', refresh: 'refresh' })
    const fetch = vi.fn().mockResolvedValue(Response.json({}))
    vi.stubGlobal('fetch', fetch)
    const signal = new AbortController().signal
    await authFetch('/api/encyclopedia/', { headers: new Headers({ Accept: 'application/json' }), signal })
    expect(fetch.mock.calls[0][1].headers.get('Accept')).toBe('application/json')
    expect(fetch.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer token')
    expect(fetch.mock.calls[0][1].signal).toBe(signal)
  })
  it('не принимает HTML или пустой успешный ответ за разрешение доступа', async () => {
    saveTokens({ access: 'token', refresh: 'refresh' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({})))
    await expect(checkSession()).rejects.toThrow('Сервер не подтвердил')
  })
  it('не восстанавливает сессию из запоздавшего refresh после выхода', async () => {
    saveTokens({ access: 'expired', refresh: 'refresh' })
    let resolveRefresh!: (response: Response) => void
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockImplementationOnce(() => new Promise<Response>(resolve => { resolveRefresh = resolve }))
    vi.stubGlobal('fetch', fetch)
    const pending = checkSession()
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    clearTokens()
    resolveRefresh(Response.json({ access: 'late' }))
    expect(await pending).toBe(false)
    expect(localStorage.getItem('surveyAuth.access')).toBeNull()
  })
})
