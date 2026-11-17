import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '../../../app/styles/global.css'
import '../../../shared/styles/tokens.css'
import { captureImageAssetRepository, DEFAULT_IMAGE_EDITS } from '../model'
import type { ArticleImage } from '../model'
import { ArticleCropFrame } from './ArticleCropFrame'

type Crop = ArticleImage['edits']['crop']
type Point = { x: number; y: number }
type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

let host: HTMLDivElement
let root: Root | undefined
let previousToken: string | null

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  previousToken = localStorage.getItem('surveyAuth.access')
  localStorage.setItem('surveyAuth.access', `header.${btoa(JSON.stringify({ user_id: `crop-${crypto.randomUUID()}` }))}.signature`)
  // Синтетические pointerId не входят в список активных указателей Chromium.
  // Обработчики получают обычные PointerEvent, а запрос pointer capture проверяем отдельно.
  vi.spyOn(Element.prototype, 'setPointerCapture').mockImplementation(() => {})
  vi.spyOn(Element.prototype, 'releasePointerCapture').mockImplementation(() => {})
  host = document.createElement('div')
  host.style.width = '600px'
  host.style.height = '520px'
  host.style.position = 'relative'
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

async function mount({ width = 800, height = 600, rotation = 0, crop = { x: 0.2, y: 0.2, width: 0.4, height: 0.4 }, aspectRatio }: {
  width?: number; height?: number; rotation?: ArticleImage['edits']['rotation']; crop?: Crop; aspectRatio?: number
} = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const context = canvas.getContext('2d')!
  context.fillStyle = 'navy'; context.fillRect(0, 0, width, height)
  context.fillStyle = 'gold'; context.fillRect(width * 0.25, height * 0.25, width * 0.5, height * 0.5)
  const blob = await new Promise<Blob>(resolve => canvas.toBlob(value => resolve(value!), 'image/png'))
  const assetId = crypto.randomUUID()
  await captureImageAssetRepository().save(assetId, blob)
  const image: ArticleImage = { id: crypto.randomUUID(), assetId, name: 'crop-fixture.png', alt: 'Изображение для кадрирования', caption: '',
    edits: { ...DEFAULT_IMAGE_EDITS, rotation, crop } }
  let current = crop
  const changed = vi.fn<(crop: Crop) => void>()
  function Harness() {
    const [selection, setSelection] = useState(crop)
    return <ArticleCropFrame image={{ ...image, edits: { ...image.edits, crop: selection } }} dimensions={{ width, height }}
      aspectRatio={aspectRatio} onCropChange={next => { current = next; changed(next); setSelection(next) }} />
  }
  root = createRoot(host)
  await act(async () => root!.render(<Harness />))
  await expect.poll(() => host.querySelector<HTMLElement>('[data-article-crop-surface]')?.getBoundingClientRect().width ?? 0).toBeGreaterThan(0)
  const stage = host.querySelector<HTMLElement>('[data-article-crop-stage]')!
  const surface = host.querySelector<HTMLElement>('[data-article-crop-surface]')!
  const frame = host.querySelector<HTMLElement>('[data-article-crop-frame]')!
  const handle = (value: Handle) => host.querySelector<HTMLButtonElement>(`[data-article-crop-handle="${value}"]`)!
  return { stage, surface, frame, handle, crop: () => current, changed }
}

function center(element: Element): Point {
  const box = element.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

async function pointer(target: Element, type: string, at: Point, pointerType = 'mouse') {
  const event = new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7,
    pointerType, isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: at.x, clientY: at.y })
  await act(async () => { target.dispatchEvent(event) })
  return event
}

async function drag(target: Element, dx: number, dy: number, pointerType = 'mouse') {
  const start = center(target)
  const end = { x: start.x + dx, y: start.y + dy }
  await pointer(target, 'pointerdown', start, pointerType)
  await pointer(target, 'pointermove', end, pointerType)
  await pointer(target, 'pointerup', end, pointerType)
}

async function key(target: HTMLElement, value: string, shiftKey = false) {
  const event = new KeyboardEvent('keydown', { key: value, shiftKey, bubbles: true, cancelable: true })
  await act(async () => { target.focus() })
  expect(document.activeElement).toBe(target)
  await act(async () => { target.dispatchEvent(event) })
  return event
}

function expectInside(crop: Crop) {
  expect(crop.x).toBeGreaterThanOrEqual(-0.000001)
  expect(crop.y).toBeGreaterThanOrEqual(-0.000001)
  expect(crop.width).toBeGreaterThan(0)
  expect(crop.height).toBeGreaterThan(0)
  expect(crop.x + crop.width).toBeLessThanOrEqual(1.000001)
  expect(crop.y + crop.height).toBeLessThanOrEqual(1.000001)
}

describe('Рамка кадрирования фотографии статьи', () => {
  it('показывает восемь доступных ручек и рамку в координатах фотографии', async () => {
    const view = await mount()
    expect(host.querySelectorAll('[data-article-crop-handle]')).toHaveLength(8)
    for (const value of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const) {
      expect(view.handle(value).tagName).toBe('BUTTON')
      expect(view.handle(value).getAttribute('aria-label')).toBeTruthy()
    }
    const surface = view.surface.getBoundingClientRect()
    const frame = view.frame.getBoundingClientRect()
    expect(Math.abs(frame.left - surface.left - surface.width * 0.2)).toBeLessThan(2)
    expect(Math.abs(frame.top - surface.top - surface.height * 0.2)).toBeLessThan(2)
    expect(Math.abs(frame.width - surface.width * 0.4)).toBeLessThan(2)
    expect(Math.abs(frame.height - surface.height * 0.4)).toBeLessThan(2)
  })

  it('перемещает мышью без изменения размера и ограничивает перемещение краями фотографии', async () => {
    const view = await mount()
    const box = view.surface.getBoundingClientRect()
    await drag(view.frame, box.width * 0.1, box.height * 0.15)
    expect(view.crop().x).toBeCloseTo(0.3, 3)
    expect(view.crop().y).toBeCloseTo(0.35, 3)
    expect(view.crop().width).toBeCloseTo(0.4, 3)
    expect(view.crop().height).toBeCloseTo(0.4, 3)
    expect(Element.prototype.setPointerCapture).toHaveBeenCalledWith(7)
    await drag(view.frame, box.width * 5, box.height * 5)
    expect(view.crop().x).toBeCloseTo(0.6, 3)
    expect(view.crop().y).toBeCloseTo(0.6, 3)
    expectInside(view.crop())
  })

  it.each(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const)('ручка %s изменяет нужные границы свободного кадра', async value => {
    const view = await mount({ crop: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 } })
    const box = view.surface.getBoundingClientRect()
    const dx = value.includes('w') ? box.width * 0.05 : value.includes('e') ? -box.width * 0.05 : 0
    const dy = value.includes('n') ? box.height * 0.05 : value.includes('s') ? -box.height * 0.05 : 0
    await drag(view.handle(value), dx, dy)
    const crop = view.crop()
    if (value.includes('w')) { expect(crop.x).toBeGreaterThan(0.25); expect(crop.x + crop.width).toBeCloseTo(0.75, 3) }
    else expect(crop.x).toBeCloseTo(0.25, 3)
    if (value.includes('n')) { expect(crop.y).toBeGreaterThan(0.25); expect(crop.y + crop.height).toBeCloseTo(0.75, 3) }
    else expect(crop.y).toBeCloseTo(0.25, 3)
    expect(crop.width).toBeCloseTo(value.includes('e') || value.includes('w') ? 0.45 : 0.5, 3)
    expect(crop.height).toBeCloseTo(value.includes('n') || value.includes('s') ? 0.45 : 0.5, 3)
    expectInside(crop)
  })

  it('в свободном режиме меняет пропорции и не переворачивает рамку при пересечении противоположного угла', async () => {
    const view = await mount()
    const box = view.surface.getBoundingClientRect()
    await drag(view.handle('se'), box.width * 0.15, box.height * 0.05)
    expect(view.crop().width).toBeCloseTo(0.55, 3)
    expect(view.crop().height).toBeCloseTo(0.45, 3)
    await drag(view.handle('se'), -box.width * 5, -box.height * 5)
    expectInside(view.crop())
    expect(view.crop().x).toBeCloseTo(0.2, 3)
    expect(view.crop().y).toBeCloseTo(0.2, 3)
  })

  it.each([16 / 9, 1, 9 / 16])('сохраняет физические пропорции %s при изменении и достижении границ', async aspectRatio => {
    const width = 0.3
    const height = width * (800 / 600) / aspectRatio
    const view = await mount({ aspectRatio, crop: { x: 0.2, y: 0.1, width, height } })
    const box = view.surface.getBoundingClientRect()
    await drag(view.handle('se'), box.width * 0.1, box.height * 0.05)
    expect(view.crop().width * 800 / (view.crop().height * 600)).toBeCloseTo(aspectRatio, 3)
    expect(view.crop().width).toBeGreaterThan(width)
    await drag(view.handle('se'), box.width * 5, box.height * 5)
    expect(view.crop().width * 800 / (view.crop().height * 600)).toBeCloseTo(aspectRatio, 3)
    expectInside(view.crop())
  })

  it('использует настоящую область портрета после поворота, а не letterbox ширину внешнего stage', async () => {
    const view = await mount({ width: 800, height: 400, rotation: 90, crop: { x: 0.25, y: 0.2, width: 0.5, height: 0.4 } })
    const stage = view.stage.getBoundingClientRect()
    const surface = view.surface.getBoundingClientRect()
    expect(surface.width / surface.height).toBeCloseTo(0.5, 2)
    expect(surface.width).toBeLessThan(stage.width - 10)
    expect(surface.left).toBeGreaterThan(stage.left + 5)
    const frame = view.frame.getBoundingClientRect()
    expect(Math.abs(frame.left - surface.left - surface.width * 0.25)).toBeLessThan(2)
    await drag(view.frame, surface.width * 0.1, surface.height * 0.1)
    expect(view.crop().x).toBeCloseTo(0.35, 3)
    expect(view.crop().y).toBeCloseTo(0.3, 3)
    expectInside(view.crop())
  })

  it('показывает полный повёрнутый оригинал за рамкой, а не уже обрезанную копию', async () => {
    const view = await mount({ width: 800, height: 400, rotation: 90, crop: { x: 0.25, y: 0.2, width: 0.5, height: 0.4 } })
    await act(async () => { await new Promise<void>(resolve => window.setTimeout(resolve, 150)) })
    const photo = view.surface.querySelector<HTMLImageElement>('img')!
    expect(photo).not.toBeNull()
    await act(async () => photo.decode())
    expect([photo.naturalWidth, photo.naturalHeight]).toEqual([400, 800])
    expect(photo.draggable).toBe(false)
    expect(getComputedStyle(photo).objectFit).toBe('contain')
  })

  it('поддерживает touch pointer без отдельного мышиного жеста', async () => {
    const view = await mount()
    const box = view.surface.getBoundingClientRect()
    await drag(view.frame, box.width * 0.15, box.height * 0.1, 'touch')
    expect(view.crop().x).toBeCloseTo(0.35, 3)
    expect(view.crop().y).toBeCloseTo(0.3, 3)
    await drag(view.handle('se'), box.width * 0.05, box.height * 0.02, 'touch')
    expect(view.crop().width).toBeCloseTo(0.45, 3)
    expect(view.crop().height).toBeCloseTo(0.42, 3)
    expectInside(view.crop())
  })

  it('двигает и изменяет размер стрелками, Shift ускоряет шаг и не прокручивает страницу', async () => {
    const view = await mount()
    const right = await key(view.frame, 'ArrowRight')
    const regularStep = view.crop().x - 0.2
    expect(right.defaultPrevented).toBe(true)
    expect(regularStep).toBeGreaterThan(0)
    const beforeShift = view.crop().x
    await key(view.frame, 'ArrowRight', true)
    expect(view.crop().x - beforeShift).toBeGreaterThan(regularStep)
    const beforeDown = view.crop().y
    await key(view.frame, 'ArrowDown')
    expect(view.crop().y).toBeGreaterThan(beforeDown)
    const beforeWidth = view.crop().width
    const resize = await key(view.handle('se'), 'ArrowRight')
    expect(resize.defaultPrevented).toBe(true)
    expect(view.crop().width).toBeGreaterThan(beforeWidth)
    expectInside(view.crop())
  })

  it('Escape отменяет незавершённый жест и возвращает исходный прямоугольник', async () => {
    const crop = { x: 0.2, y: 0.2, width: 0.4, height: 0.4 }
    const view = await mount({ crop })
    const start = center(view.frame)
    const box = view.surface.getBoundingClientRect()
    const end = { x: start.x + box.width * 0.1, y: start.y + box.height * 0.1 }
    await pointer(view.frame, 'pointerdown', start)
    await pointer(view.frame, 'pointermove', end)
    await act(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())) })
    expect(Number.parseFloat(view.frame.style.left)).toBeGreaterThan(crop.x * 100)
    // Во время жеста меняется только локальный визуальный прямоугольник.
    expect(view.changed).not.toHaveBeenCalled()
    await key(view.frame, 'Escape')
    expect(view.crop()).toEqual(crop)
    await pointer(view.frame, 'pointerup', end)
    expect(view.crop()).toEqual(crop)
  })
})
