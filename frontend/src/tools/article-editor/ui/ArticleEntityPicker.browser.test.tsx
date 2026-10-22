import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import '../../../app/styles/global.css'
import '../../../shared/styles/tokens.css'
import { fetchEncyclopedia } from '../../../entities/encyclopedia'
import { ArticleEntityPicker } from './ArticleEntityPicker'

vi.mock('../../../entities/encyclopedia', () => ({ fetchEncyclopedia: vi.fn() }))
const fetchMock = vi.mocked(fetchEncyclopedia)
const fixture = { id: 123, entity_type: 'spell', slug: 'shield', name: 'Щит', name_en: 'Shield', sources: ['PHB'], summary: { level: 1, school: 'Ограждение' } }
let host: HTMLDivElement
let root: Root

const settle = () => new Promise<void>((resolve) => window.setTimeout(resolve, 300))

async function mount() {
  const onInsert = vi.fn()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => { root.render(<ArticleEntityPicker onInsert={onInsert} />) })
  const trigger = host.querySelector<HTMLButtonElement>('button')!
  await act(async () => { await userEvent.click(trigger); await settle() })
  return { onInsert, trigger }
}

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ count: 1, results: [fixture] })
})

afterEach(async () => {
  await act(async () => root?.unmount())
  host?.remove()
})

describe('ArticleEntityPicker', () => {
  it('использует утверждённый поиск и modal focus, закрывается Escape с возвратом фокуса', async () => {
    const { trigger } = await mount()
    const dialog = document.querySelector('dialog')!
    const search = dialog.querySelector<HTMLInputElement>('input[type="search"]')!
    expect(dialog.open).toBe(true)
    expect(document.activeElement).toBe(search)
    expect(fetchMock.mock.calls[0][0]).toContain('type=spell')
    expect(dialog.textContent).toContain('Щит')
    await act(async () => { await userEvent.keyboard('{Escape}'); await settle() })
    expect(document.querySelector('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('вставляет локальный snapshot с источниками и закрывает окно', async () => {
    const { onInsert, trigger } = await mount()
    const insert = document.querySelector<HTMLButtonElement>('button[aria-label="Вставить карточку: Щит"]')!
    expect(insert.textContent).toContain('PHB')
    expect(insert.textContent).toContain('1-й уровень')
    await act(async () => { await userEvent.click(insert); await settle() })
    expect(onInsert).toHaveBeenCalledExactlyOnceWith({
      id: 123, type: 'spell', slug: 'shield', name: 'Щит', nameEn: 'Shield',
      summary: { level: 1, school: 'Ограждение', sources: ['PHB'] },
    })
    expect(document.querySelector('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('отменяет устаревший запрос и не подменяет новые результаты старым ответом', async () => {
    const requests: { signal: AbortSignal; resolve: (data: unknown) => void }[] = []
    fetchMock.mockImplementation((_path, signal) => new Promise(resolve => { requests.push({ signal, resolve }) }))
    await mount()
    const search = document.querySelector<HTMLInputElement>('input[type="search"]')!
    await act(async () => { await userEvent.fill(search, 'Щит'); await settle() })
    expect(requests).toHaveLength(2)
    expect(requests[0].signal.aborted).toBe(true)
    expect(fetchMock.mock.calls[1][0]).toContain('q=%D0%A9%D0%B8%D1%82')
    await act(async () => { requests[0].resolve({ count: 1, results: [{ ...fixture, name: 'Старый ответ' }] }); await settle() })
    expect(document.querySelector('dialog')!.textContent).not.toContain('Старый ответ')
    await act(async () => { requests[1].resolve({ count: 1, results: [fixture] }); await settle() })
    expect(document.querySelector('dialog')!.textContent).toContain('Щит')
  })

  it('показывает ошибку с повтором, пустые результаты и поиск выбранного типа', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Энциклопедия недоступна'))
    await mount()
    expect(document.querySelector('[role="alert"]')!.textContent).toContain('Энциклопедия недоступна')
    fetchMock.mockResolvedValue({ count: 0, results: [] })
    const retry = Array.from(document.querySelectorAll('dialog button')).find(button => button.textContent === 'Повторить')!
    await act(async () => { await userEvent.click(retry); await settle() })
    expect(document.querySelector('dialog')!.textContent).toContain('Ничего не найдено')
    const section = document.querySelector<HTMLButtonElement>('button[aria-label="Тип сущности"]')!
    await act(async () => {
      await userEvent.click(section)
      await userEvent.keyboard('{ArrowDown}{Enter}')
      await settle()
    })
    expect(fetchMock.mock.lastCall?.[0]).toContain('type=item')
    expect(document.querySelector('dialog')).not.toBeNull()
  })
})
