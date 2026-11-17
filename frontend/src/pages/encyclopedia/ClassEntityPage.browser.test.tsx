import { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import type { NavigateFunction } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '../../app/styles/global.css'
import '../../shared/styles/tokens.css'
import { seekerClassDetail, borderKeeperClassDetail } from '../../entities/character-class/testing/classFixtures'
import ClassEntityPage from './ClassEntityPage'
import EncyclopediaEntryPage from './EncyclopediaEntryPage'
import { entryPath } from './encyclopediaApi'

let host: HTMLDivElement
let root: Root | undefined
let navigateTo: NavigateFunction | undefined
let previousAccess: string | null
let previousUrl: string
let testHistoryKey: string
const details = [seekerClassDetail, borderKeeperClassDetail]

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
}

function server(input: RequestInfo | URL) {
  const url = new URL(String(input))
  const id = Number(url.pathname.match(/\/api\/encyclopedia\/(\d+)\/$/)?.[1])
  if (id) return json(details.find(detail => detail.id === id) ?? { detail: 'Не найдено' }, details.some(detail => detail.id === id) ? 200 : 404)
  if (url.pathname.endsWith('/api/encyclopedia/')) {
    const results = details.filter(detail => detail.slug === url.searchParams.get('slug'))
    return json({ count: results.length, results })
  }
  return json({ detail: 'Неожиданный тестовый запрос' }, 404)
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  previousAccess = localStorage.getItem('surveyAuth.access')
  const userId = `class-route-${crypto.randomUUID()}`
  localStorage.setItem('surveyAuth.access', `header.${btoa(JSON.stringify({ user_id: userId }))}.signature`)
  testHistoryKey = `cauldron.encyclopedia.recent.v1:${encodeURIComponent(userId)}`
  previousUrl = window.location.href
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
  fetchMock.mockReset().mockImplementation(async input => server(input))
  vi.stubGlobal('fetch', fetchMock)
  host = document.createElement('div')
  host.style.width = '1100px'; host.style.maxWidth = '100%'
  document.body.append(host)
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined; navigateTo = undefined
  host.remove()
  localStorage.removeItem(testHistoryKey)
  if (previousAccess === null) localStorage.removeItem('surveyAuth.access')
  else localStorage.setItem('surveyAuth.access', previousAccess)
  window.history.replaceState(null, '', previousUrl)
  vi.unstubAllGlobals()
})

function TestRoutes() {
  const navigate = useNavigate()
  useEffect(() => { navigateTo = navigate }, [navigate])
  return <Routes>
    <Route path="/encyclopedia/class/:slug" element={<ClassEntityPage />} />
    <Route path="/encyclopedia/entry/:id" element={<EncyclopediaEntryPage />} />
  </Routes>
}

function nextFrame() {
  return new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

async function mount(path: string) {
  root = createRoot(host)
  await act(async () => { root!.render(<MemoryRouter initialEntries={[path]}><TestRoutes /></MemoryRouter>); await nextFrame() })
}

async function expectHeading(name: string) {
  await expect.poll(async () => {
    await act(async () => { await nextFrame() })
    return host.querySelector('h1')?.textContent
  }).toBe(name)
}

describe('Маршруты и API классов энциклопедии', () => {
  it('загружает canonical slug через class-list/detail и показывает настоящий ClassFullView', async () => {
    await mount(`/encyclopedia/class/${seekerClassDetail.slug}`)
    await expectHeading('Искатель')
    expect(host.querySelector('nav[aria-label="Оглавление класса"]')).not.toBeNull()
    expect(host.querySelector('table[data-progression="true"] tbody')?.children).toHaveLength(20)
    const urls = fetchMock.mock.calls.map(([input]) => new URL(String(input)))
    const list = urls.find(url => url.searchParams.has('slug'))!
    expect(list.searchParams.get('type')).toBe('class')
    expect(list.searchParams.get('slug')).toBe(seekerClassDetail.slug)
    expect(urls.some(url => url.pathname.endsWith('/7101/'))).toBe(true)
  })

  it('старый numeric route класса тоже показывает ClassFullView, а не плоский content_text', async () => {
    await mount('/encyclopedia/entry/7101')
    await expectHeading('Искатель')
    expect(host.querySelector('nav[aria-label="Оглавление класса"]')).not.toBeNull()
    expect(host.querySelector('table[data-progression="true"] tbody')?.children).toHaveLength(20)
    expect(fetchMock.mock.calls).toHaveLength(1)
    expect(localStorage.getItem(testHistoryKey)).toContain(`/encyclopedia/class/${seekerClassDetail.slug}`)
  })

  it('при смене slug отменяет старый detail-запрос и игнорирует его запоздалый ответ', async () => {
    let oldSignal: AbortSignal | null | undefined
    let completeOld: ((response: Response) => void) | undefined
    fetchMock.mockImplementation(async (input, init) => {
      if (new URL(String(input)).pathname.endsWith('/7101/')) {
        oldSignal = init?.signal
        return new Promise<Response>(resolve => { completeOld = resolve })
      }
      return server(input)
    })
    await mount(`/encyclopedia/class/${seekerClassDetail.slug}`)
    await expect.poll(() => completeOld).toBeDefined()
    await act(async () => { await navigateTo!(`/encyclopedia/class/${borderKeeperClassDetail.slug}`); await nextFrame() })
    expect(oldSignal?.aborted).toBe(true)
    await expectHeading('Страж рубежа')
    await act(async () => { completeOld!(json(seekerClassDetail)); await nextFrame() })
    expect(host.querySelector('h1')?.textContent).toBe('Страж рубежа')
    expect(localStorage.getItem(testHistoryKey)).not.toContain(`/encyclopedia/class/${seekerClassDetail.slug}`)
  })

  it('позволяет повторить неуспешную загрузку списка и затем открыть класс', async () => {
    fetchMock.mockResolvedValueOnce(json({ detail: 'Тестовый сбой' }, 500))
    await mount(`/encyclopedia/class/${seekerClassDetail.slug}`)
    await expectHeading('Не удалось открыть класс')
    expect(host.querySelector('[role="alert"]')).not.toBeNull()
    const retry = Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent?.trim() === 'Повторить')!
    await act(async () => retry.click())
    await expectHeading('Искатель')
    expect(fetchMock.mock.calls.filter(([input]) => new URL(String(input)).searchParams.has('slug'))).toHaveLength(2)
  })

  it('показывает отсутствие класса без detail-запроса при пустом результате slug-поиска', async () => {
    await mount('/encyclopedia/class/synthetic-missing-class')
    await expectHeading('Класс не найден')
    expect(host.querySelector('[role="alert"]')).toBeNull()
    expect(fetchMock.mock.calls).toHaveLength(1)
  })

  it('обрабатывает HTTP404 detail без падения и оставляет возможность повторить запрос', async () => {
    fetchMock.mockImplementation(async input => new URL(String(input)).pathname.endsWith('/7101/') ? json({ detail: 'Не найдено' }, 404) : server(input))
    await mount(`/encyclopedia/class/${seekerClassDetail.slug}`)
    await expectHeading('Не удалось открыть класс')
    expect(host.querySelector('[role="alert"]')).not.toBeNull()
    expect(Array.from(host.querySelectorAll('button')).some(button => button.textContent?.trim() === 'Повторить')).toBe(true)
    expect(host.querySelector('table')).toBeNull()
  })

  it('entryPath использует canonical class slug с кодированием и сохраняет numeric fallback других типов', () => {
    const entry = { id: 7101, name: 'Тестовый класс', name_en: 'Test', entity_type: 'class', slug: 'синтетический класс' }
    expect(entryPath(entry)).toBe(`/encyclopedia/class/${encodeURIComponent(entry.slug)}`)
    expect(entryPath({ ...entry, entity_type: 'spell' })).toBe('/encyclopedia/entry/7101')
  })
})
