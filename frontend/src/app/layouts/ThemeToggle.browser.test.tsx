import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '../../shared/styles/tokens.css'
import '../styles/global.css'
import { THEME_STORAGE_KEY, setTheme } from '../../shared/lib/theme'
import { Button } from '../../shared/ui/Button'
import { SiteHeader } from './SiteHeader'

let host: HTMLDivElement
let root: Root | undefined
let previousTheme: string | undefined
let previousPreference: string | null

function toggle() {
  return host.querySelector<HTMLButtonElement>('button[aria-label^="Включить"]')!
}

async function mount() {
  root = createRoot(host)
  await act(async () => {
    root!.render(<MemoryRouter><SiteHeader /><Button>Действие</Button></MemoryRouter>)
  })
}

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  previousTheme = document.documentElement.dataset.theme
  previousPreference = localStorage.getItem(THEME_STORAGE_KEY)
  setTheme('dark')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: {}, updated_at: '' })))
  host = document.createElement('div')
  document.body.append(host)
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  host.remove()
  if (previousTheme === undefined) delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = previousTheme
  if (previousPreference === null) localStorage.removeItem(THEME_STORAGE_KEY)
  else localStorage.setItem(THEME_STORAGE_KEY, previousPreference)
  vi.unstubAllGlobals()
})

describe('Переключение темы в шапке', () => {
  it('переключает палитру всего интерфейса и сохраняет выбор', async () => {
    await mount()
    expect(toggle().getAttribute('aria-label')).toBe('Включить светлую тему')
    expect(toggle().nextElementSibling?.getAttribute('data-guide-target')).toBe('profile')
    expect(toggle().querySelector('[data-icon="sun"]')).not.toBeNull()
    expect(getComputedStyle(toggle().firstElementChild!).width).toBe('16px')

    await act(async () => toggle().click())
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    expect(getComputedStyle(document.documentElement).colorScheme).toBe('light')
    expect(getComputedStyle(document.body).backgroundColor).toBe('rgb(250, 240, 231)')
    expect(getComputedStyle(document.body).color).toBe('rgb(51, 41, 50)')
    await expect.poll(() => getComputedStyle(host.querySelector('button[data-variant="primary"]')!).color).toBe('rgb(252, 245, 236)')
    expect(toggle().querySelector('[data-icon="moon"]')).not.toBeNull()
    expect(toggle().getAttribute('aria-label')).toBe('Включить тёмную тему')

    await act(async () => root!.unmount())
    await mount()
    expect(toggle().getAttribute('aria-label')).toBe('Включить тёмную тему')
    await act(async () => toggle().click())
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(getComputedStyle(document.body).backgroundColor).toBe('rgb(2, 1, 8)')
  })

  it('синхронизирует выбор из другой вкладки и сбрасывается при очистке хранилища', async () => {
    await mount()
    await act(async () => window.dispatchEvent(new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: 'light' })))
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(toggle().getAttribute('aria-label')).toBe('Включить тёмную тему')
    await act(async () => window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated', newValue: 'dark' })))
    expect(document.documentElement.dataset.theme).toBe('light')
    await act(async () => window.dispatchEvent(new StorageEvent('storage', { key: null })))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(toggle().getAttribute('aria-label')).toBe('Включить светлую тему')
  })

  it('работает при недоступном localStorage', async () => {
    await mount()
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded') })
    try {
      await act(async () => toggle().click())
      expect(document.documentElement.dataset.theme).toBe('light')
      expect(toggle().getAttribute('aria-label')).toBe('Включить тёмную тему')
    } finally {
      setItem.mockRestore()
    }
  })
})
