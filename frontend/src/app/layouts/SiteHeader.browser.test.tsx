import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import avatarAsset from '../../shared/ui/icons/assets/notification.svg?url&no-inline'
import '../styles/global.css'
import '../../shared/styles/tokens.css'
import { getAccountProfileCacheKey, readAccountProfileCache, writeAccountProfileCache } from '../../shared/api/accountProfileCache'
import { clearTokens, saveTokens } from '../../shared/api/auth'
import { SiteHeader } from './SiteHeader'

let host: HTMLDivElement
let root: Root | undefined
let previousAccess: string | null
let previousRefresh: string | null
const cacheKeys = new Set<string>()
const fetchMock = vi.fn<typeof fetch>()
const portrait = (id: string) => `${new URL(avatarAsset, window.location.href).href}?profile=${id}`
const token = (id: string) => `header.${btoa(JSON.stringify({ user_id: id }))}.signature`
const response = (url: string | null) => Response.json({ data: { portrait: url }, updated_at: '2026-10-26T12:00:00Z' })

function rememberCache() {
  const key = getAccountProfileCacheKey()
  if (key) cacheKeys.add(key)
}

function image() {
  return host.querySelector<HTMLImageElement>('a[data-guide-target="profile"] img')
}

function frame() {
  return new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

async function mount() {
  root = createRoot(host)
  await act(async () => { root!.render(<MemoryRouter><SiteHeader /></MemoryRouter>); await frame() })
}

async function flush() {
  await act(async () => { await frame() })
}

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  previousAccess = localStorage.getItem('surveyAuth.access')
  previousRefresh = localStorage.getItem('surveyAuth.refresh')
  saveTokens({ access: token(`header-avatar-${crypto.randomUUID()}`), refresh: 'test-refresh' })
  rememberCache()
  fetchMock.mockReset().mockResolvedValue(response(null))
  vi.stubGlobal('fetch', fetchMock)
  host = document.createElement('div')
  document.body.append(host)
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  host.remove()
  for (const key of cacheKeys) localStorage.removeItem(key)
  cacheKeys.clear()
  if (previousAccess === null) localStorage.removeItem('surveyAuth.access')
  else localStorage.setItem('surveyAuth.access', previousAccess)
  if (previousRefresh === null) localStorage.removeItem('surveyAuth.refresh')
  else localStorage.setItem('surveyAuth.refresh', previousRefresh)
  vi.unstubAllGlobals()
})

describe('Аватар профиля в шапке', () => {
  it('мгновенно показывает совместимый кэш и затем подтверждённый сервером портрет', async () => {
    const cached = portrait('cached')
    const remote = portrait('remote')
    writeAccountProfileCache({ portrait: cached })
    let finish!: (value: Response) => void
    fetchMock.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    await mount()
    expect(image()?.src).toBe(cached)
    expect(host.querySelector('a[data-guide-target="profile"]')?.getAttribute('aria-label')).toBe('Открыть профиль')
    expect(fetchMock.mock.calls[0][1]?.headers).toBeInstanceOf(Headers)
    await act(async () => { finish(response(remote)); await frame() })
    expect(image()?.src).toBe(remote)
    expect(readAccountProfileCache()?.portrait).toBe(remote)
    expect(getComputedStyle(image()!).objectFit).toBe('cover')
  })

  it('сразу обновляется после сохранения, а запоздалый GET не возвращает старую картинку', async () => {
    let finish!: (value: Response) => void
    fetchMock.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    await mount()
    const signal = fetchMock.mock.calls[0][1]?.signal
    const saved = portrait('saved')
    await act(async () => { writeAccountProfileCache({ portrait: saved }); await frame() })
    expect(signal?.aborted).toBe(true)
    expect(image()?.src).toBe(saved)
    await act(async () => { finish(response(portrait('stale'))); await frame() })
    expect(image()?.src).toBe(saved)
    expect(readAccountProfileCache()?.portrait).toBe(saved)
    await act(async () => { writeAccountProfileCache({ portrait: null }); await frame() })
    expect(image()).toBeNull()
  })

  it('очищает аватар при выходе и игнорирует запрос предыдущего аккаунта', async () => {
    const oldPortrait = portrait('old-user')
    writeAccountProfileCache({ portrait: oldPortrait })
    let finishOld!: (value: Response) => void
    fetchMock.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve }))
    await mount()
    expect(image()?.src).toBe(oldPortrait)
    const oldSignal = fetchMock.mock.calls[0][1]?.signal
    await act(async () => { clearTokens(); await frame() })
    expect(image()).toBeNull()
    expect(oldSignal?.aborted).toBe(true)
    const newPortrait = portrait('new-user')
    fetchMock.mockResolvedValueOnce(response(newPortrait))
    await act(async () => {
      saveTokens({ access: token(`header-new-user-${crypto.randomUUID()}`), refresh: 'new-refresh' })
      rememberCache()
      await frame()
    })
    expect(image()?.src).toBe(newPortrait)
    await act(async () => { finishOld(response(oldPortrait)); await frame() })
    expect(image()?.src).toBe(newPortrait)
    expect(readAccountProfileCache()?.portrait).toBe(newPortrait)
  })

  it('реагирует на изменение кэша в другой вкладке и не смешивает его с другими пользователями', async () => {
    fetchMock.mockImplementationOnce(() => new Promise(() => {}))
    await mount()
    const key = getAccountProfileCacheKey()!
    const otherPortrait = portrait('other-tab')
    await act(async () => {
      localStorage.setItem(key, JSON.stringify({ portrait: otherPortrait }))
      window.dispatchEvent(new StorageEvent('storage', { key }))
      await frame()
    })
    expect(image()?.src).toBe(otherPortrait)
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
    await act(async () => { window.dispatchEvent(new StorageEvent('storage', { key: 'profile.cache:other-user', newValue: JSON.stringify({ portrait: portrait('foreign') }) })); await frame() })
    expect(image()?.src).toBe(otherPortrait)
  })

  it('не показывает неподдерживаемые URL и восстанавливается после ошибки изображения при новом URL', async () => {
    fetchMock.mockImplementationOnce(() => new Promise(() => {}))
    await mount()
    await act(async () => { writeAccountProfileCache({ portrait: 'javascript:alert(1)' }); await frame() })
    expect(image()).toBeNull()
    await act(async () => { writeAccountProfileCache({ portrait: 'blob:temporary-preview' }); await frame() })
    expect(image()).toBeNull()
    expect(readAccountProfileCache()?.portrait).toBeNull()
    await act(async () => { writeAccountProfileCache({ portrait: portrait('broken') }); await frame() })
    await act(async () => { image()!.dispatchEvent(new Event('error')); await frame() })
    expect(image()).toBeNull()
    await act(async () => { writeAccountProfileCache({ portrait: portrait('restored') }); await frame() })
    expect(image()?.src).toBe(portrait('restored'))
  })

  it('без авторизации не делает GET, а при размонтировании отменяет запрос', async () => {
    clearTokens()
    await mount()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(image()).toBeNull()
    fetchMock.mockImplementationOnce(() => new Promise(() => {}))
    await act(async () => {
      saveTokens({ access: token(`header-pending-${crypto.randomUUID()}`), refresh: 'pending-refresh' })
      rememberCache()
      await frame()
    })
    const signal = fetchMock.mock.calls[0][1]?.signal
    await act(async () => root!.unmount())
    root = undefined
    expect(signal?.aborted).toBe(true)
  })

  it('не теряет подтверждённое обновление в текущей вкладке при заполненном localStorage', async () => {
    fetchMock.mockImplementationOnce(() => new Promise(() => {}))
    await mount()
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded') })
    try {
      await act(async () => { writeAccountProfileCache({ portrait: portrait('quota') }); await frame() })
      expect(image()?.src).toBe(portrait('quota'))
    } finally {
      setItem.mockRestore()
    }
    await flush()
  })

  it('при недоступном API сохраняет кэш и не добавляет ошибки к навигации', async () => {
    writeAccountProfileCache({ portrait: portrait('offline') })
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await mount()
    expect(image()?.src).toBe(portrait('offline'))
    expect(host.querySelector('[role="alert"]')).toBeNull()
  })
})
