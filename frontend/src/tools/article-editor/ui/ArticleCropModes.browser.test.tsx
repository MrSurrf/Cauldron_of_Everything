import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '../../../app/styles/global.css'
import '../../../shared/styles/tokens.css'
import { captureImageAssetRepository, DEFAULT_IMAGE_EDITS } from '../model'
import type { ArticleImage } from '../model'
import { ArticleImages } from './ArticleImages'

type Crop = ArticleImage['edits']['crop']
type Fixture = { width: number; height: number; crop: Crop }

let host: HTMLDivElement
let root: Root | undefined
let previousToken: string | null

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  previousToken = localStorage.getItem('surveyAuth.access')
  localStorage.setItem('surveyAuth.access', `header.${btoa(JSON.stringify({ user_id: `crop-mode-${crypto.randomUUID()}` }))}.signature`)
  vi.spyOn(Element.prototype, 'setPointerCapture').mockImplementation(() => {})
  vi.spyOn(Element.prototype, 'releasePointerCapture').mockImplementation(() => {})
  host = document.createElement('div')
  host.style.width = '420px'; host.style.height = '900px'; host.style.position = 'relative'
  document.body.append(host)
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  host.remove()
  vi.restoreAllMocks()
  if (previousToken === null) localStorage.removeItem('surveyAuth.access')
  else localStorage.setItem('surveyAuth.access', previousToken)
})

async function settle() {
  await act(async () => { await new Promise<void>(resolve => window.setTimeout(resolve, 120)) })
}

async function mount({ width = 400, height = 400, crop = { x: 0.2, y: 0.2, width: 0.5, height: 0.5 } }: Partial<Fixture> = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const context = canvas.getContext('2d')!
  context.fillStyle = 'navy'; context.fillRect(0, 0, width, height)
  context.fillStyle = 'gold'; context.fillRect(width / 4, height / 4, width / 2, height / 2)
  const blob = await new Promise<Blob>(resolve => canvas.toBlob(value => resolve(value!), 'image/png'))
  const assetId = crypto.randomUUID()
  await captureImageAssetRepository().save(assetId, blob)
  let current: ArticleImage = { id: crypto.randomUUID(), assetId, name: 'crop-modes.png', alt: 'Фотография для проверки пропорций', caption: '',
    edits: { ...DEFAULT_IMAGE_EDITS, crop: { ...crop } } }
  let revision = 0
  const changed = vi.fn<(images: ArticleImage[]) => void>()
  function Harness() {
    const [images, setImages] = useState(() => [current])
    return <ArticleImages images={images} coverImageId={current.id} onInsert={vi.fn()} onCoverChange={vi.fn()}
      onChange={next => { current = next[0]; changed(next); setImages(next) }} />
  }
  root = createRoot(host)
  await act(async () => root!.render(<Harness key={revision} />))
  await settle()
  const mode = () => host.querySelector<HTMLButtonElement>('[aria-label="Пропорции кадра"]')!
  const open = async () => {
    const toggle = host.querySelector<HTMLButtonElement>('[data-article-image-crop-toggle]')!
    expect(toggle.disabled).toBe(false)
    if (toggle.getAttribute('aria-pressed') !== 'true') await act(async () => toggle.click())
    expect(host.querySelector('[data-article-crop-frame]')).not.toBeNull()
  }
  const choose = async (label: string) => {
    await act(async () => mode().click())
    const option = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(value => value.textContent?.startsWith(label))
    expect(option).toBeDefined()
    await act(async () => option!.click())
  }
  return {
    width, height, mode, open, choose, changed,
    crop: () => current.edits.crop,
    surface: () => host.querySelector<HTMLElement>('[data-article-crop-surface]')!,
    handle: (value: string) => host.querySelector<HTMLButtonElement>(`[data-article-crop-handle="${value}"]`)!,
    remount: async () => { await act(async () => root!.render(<Harness key={++revision} />)); await settle() },
  }
}

async function drag(target: HTMLElement, dx: number, dy: number) {
  const box = target.getBoundingClientRect()
  const start = { x: box.left + box.width / 2, y: box.top + box.height / 2 }
  for (const [type, x, y] of [
    ['pointerdown', start.x, start.y],
    ['pointermove', start.x + dx, start.y + dy],
    ['pointerup', start.x + dx, start.y + dy],
  ] as const) {
    await act(async () => { target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true,
      pointerId: 11, pointerType: 'mouse', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: x, clientY: y })) })
  }
}

const defaultCases = [
  { name: 'целый квадратный оригинал', width: 400, height: 400, crop: { x: 0, y: 0, width: 1, height: 1 } },
  { name: 'сохранённый квадратный кадр на квадратном фото', width: 400, height: 400, crop: { x: 0.2, y: 0.2, width: 0.5, height: 0.5 } },
  { name: 'целый портретный оригинал', width: 400, height: 800, crop: { x: 0, y: 0, width: 1, height: 1 } },
  { name: 'сохранённый кадр 1:1 на портретном фото', width: 400, height: 800, crop: { x: 0.2, y: 0.2, width: 0.6, height: 0.3 } },
]

describe('Явный выбор режима пропорций кадрирования', () => {
  it.each(defaultCases)('$name: «Обрезать» открывает свободный режим, боковая ручка не связывает высоту с шириной', async fixture => {
    const view = await mount(fixture)
    await view.open()
    expect(view.mode().textContent).toContain('Свободные пропорции')
    const before = { ...view.crop() }
    const box = view.surface().getBoundingClientRect()
    await drag(view.handle('e'), -box.width * 0.1, 0)
    expect(view.crop().width).toBeCloseTo(before.width - 0.1, 3)
    expect(view.crop().height).toBeCloseTo(before.height, 3)
    expect(view.crop().x).toBeCloseTo(before.x, 3)
    expect(view.crop().y).toBeCloseTo(before.y, 3)
    expect(view.mode().textContent).toContain('Свободные пропорции')
  })

  it('угловая ручка свободного кадра не фиксирует случайно совпавшие пропорции 1:1', async () => {
    const view = await mount()
    await view.open()
    const box = view.surface().getBoundingClientRect()
    await drag(view.handle('ne'), -box.width * 0.08, box.height * 0.04)
    expect(view.crop().width).toBeCloseTo(0.42, 3)
    expect(view.crop().height).toBeCloseTo(0.46, 3)
    expect(view.crop().y).toBeCloseTo(0.24, 3)
    expect(view.crop().width / view.crop().height).not.toBeCloseTo(1, 2)
    expect(view.mode().textContent).toContain('Свободные пропорции')
  })

  it('фиксирует квадрат только после явного выбора 1:1 и сохраняет его при боковом resize', async () => {
    const view = await mount({ width: 400, height: 800, crop: { x: 0.1, y: 0.1, width: 0.8, height: 0.6 } })
    await view.open()
    await view.choose('1:1 — квадрат')
    expect(view.mode().textContent).toContain('1:1 — квадрат')
    const box = view.surface().getBoundingClientRect()
    const before = { ...view.crop() }
    await drag(view.handle('e'), -box.width * 0.1, 0)
    expect(view.crop().width).toBeLessThan(before.width)
    expect(view.crop().height).toBeLessThan(before.height)
    expect(view.crop().width * view.width / (view.crop().height * view.height)).toBeCloseTo(1, 3)
    expect(view.mode().textContent).toContain('1:1 — квадрат')
  })

  it('переключение на свободные пропорции не сбрасывает геометрию и действительно снимает lock', async () => {
    const view = await mount({ width: 400, height: 800 })
    await view.open()
    await view.choose('1:1 — квадрат')
    const before = { ...view.crop() }
    const callsBefore = view.changed.mock.calls.length
    await view.choose('Свободные пропорции')
    expect(view.crop()).toEqual(before)
    expect(view.changed).toHaveBeenCalledTimes(callsBefore)
    expect(view.mode().textContent).toContain('Свободные пропорции')
    const box = view.surface().getBoundingClientRect()
    await drag(view.handle('e'), -box.width * 0.1, 0)
    expect(view.crop().width).toBeCloseTo(before.width - 0.1, 3)
    expect(view.crop().height).toBeCloseTo(before.height, 3)
  })

  it('после remount не восстанавливает lock по форме сохранённого кадра', async () => {
    const view = await mount({ width: 400, height: 800 })
    await view.open()
    await view.choose('1:1 — квадрат')
    const restored = { ...view.crop() }
    await view.remount()
    await view.open()
    expect(view.crop()).toEqual(restored)
    expect(view.mode().textContent).toContain('Свободные пропорции')
    const box = view.surface().getBoundingClientRect()
    await drag(view.handle('e'), -box.width * 0.1, 0)
    expect(view.crop().width).toBeCloseTo(restored.width - 0.1, 3)
    expect(view.crop().height).toBeCloseTo(restored.height, 3)
  })
})
