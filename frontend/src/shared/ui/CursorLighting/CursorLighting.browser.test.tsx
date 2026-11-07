import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '../../../app/styles/global.css'
import '../../styles/tokens.css'
import './CursorLighting.css'
import { Panel } from '../Panel'
import { trackCursorLighting } from './trackCursorLighting'

const enabled = matchMedia(
  '(any-hover: hover) and (any-pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)',
).matches

let host: HTMLDivElement
let root: Root | undefined
let stop: (() => void) | undefined

function nextFrame() {
  return new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

function surface(name: string) {
  return host.querySelector<HTMLElement>(`[aria-label="${name}"]`)!
}

function light(panel: HTMLElement) {
  return panel.querySelector<HTMLElement>('[data-cursor-reveal-layer]')!
}

function move(x: number, y: number, pointerType = 'mouse') {
  window.dispatchEvent(new PointerEvent('pointermove', {
    clientX: x, clientY: y, pointerType, isPrimary: true,
  }))
}

beforeEach(async () => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  host.setAttribute('data-cursor-light-background', '')
  host.style.cssText = 'position:fixed;inset:0;padding:32px;background:var(--cursor-background-image, none),var(--color-background)'
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(
    <>
      <Panel aria-label="Внешняя панель">
        <p>Содержимое панели</p>
        <Panel aria-label="Вложенная панель">Вложенное содержимое</Panel>
      </Panel>
      <a href="#interactive"><Panel aria-label="Интерактивная панель">Ссылка</Panel></a>
      <section aria-label="Граница секции" data-cursor-reveal="border" style={{ padding: 24, border: '1px solid transparent' }}>
        <span>Содержимое секции</span>
      </section>
    </>,
  ))
  stop = trackCursorLighting()
  await nextFrame()
})

afterEach(async () => {
  stop?.()
  stop = undefined
  await act(async () => root?.unmount())
  root = undefined
  host.remove()
  vi.restoreAllMocks()
})

describe.runIf(enabled)('Изоляция подсветки курсора', () => {
  it('сохраняет локальные координаты панелей и не наследует меняющиеся свойства в содержимое', async () => {
    const panel = surface('Внешняя панель')
    const nested = surface('Вложенная панель')
    const rect = nested.getBoundingClientRect()
    const x = rect.left + 15
    const y = rect.top + 2
    move(x, y)

    await expect.poll(() => light(nested).style.getPropertyValue('--cursor-reveal-active')).toBe('1')
    expect(light(nested).style.getPropertyValue('--cursor-reveal-x')).toBe('15px')
    expect(light(nested).style.getPropertyValue('--cursor-reveal-y')).toBe('2px')
    expect(light(panel).style.getPropertyValue('--cursor-reveal-y')).toBe(`${y - panel.getBoundingClientRect().top}px`)
    expect(getComputedStyle(light(panel)).backgroundImage).toContain('radial-gradient')
    expect(getComputedStyle(host).backgroundImage).toContain('radial-gradient')

    const content = nested.querySelector('div')!
    for (const element of [panel, content]) {
      const style = getComputedStyle(element)
      expect(style.getPropertyValue('--cursor-light-x')).toBe('-1000px')
      expect(style.getPropertyValue('--cursor-light-y')).toBe('-1000px')
      expect(style.getPropertyValue('--cursor-light-active')).toBe('0')
      expect(style.getPropertyValue('--cursor-background-image')).toBe('none')
      expect(style.getPropertyValue('--cursor-reveal-x')).toBe('-1000px')
      expect(style.getPropertyValue('--cursor-reveal-y')).toBe('-1000px')
      expect(style.getPropertyValue('--cursor-reveal-active')).toBe('0')
    }

    const border = surface('Граница секции')
    const borderRect = border.getBoundingClientRect()
    move(borderRect.left + 8, borderRect.top + 2)
    await expect.poll(() => border.style.getPropertyValue('--cursor-reveal-x')).toBe('8px')
    expect(border.style.getPropertyValue('--cursor-reveal-active')).toBe('1')
    expect(getComputedStyle(border.firstElementChild!).getPropertyValue('--cursor-reveal-active')).toBe('0')
    expect(light(surface('Интерактивная панель')).style.getPropertyValue('--cursor-reveal-active')).toBe('')
  })

  it('снимает свечение и прекращает запись стилей на время перетаскивания, затем возобновляет его', async () => {
    const panel = surface('Внешняя панель')
    const layer = light(panel)
    const rect = panel.getBoundingClientRect()
    move(rect.left + 20, rect.top + 1)
    await expect.poll(() => host.style.getPropertyValue('--cursor-light-active')).toBe('1')

    host.setAttribute('data-cursor-light-suspended', '')
    await expect.poll(() => host.style.getPropertyValue('--cursor-light-active')).toBe('')
    expect(layer.style.getPropertyValue('--cursor-reveal-active')).toBe('')
    const backgroundWrite = vi.spyOn(host.style, 'setProperty')
    const surfaceWrite = vi.spyOn(layer.style, 'setProperty')
    for (let i = 0; i < 4; i++) {
      move(rect.left + 20 + i, rect.top + 1)
      document.dispatchEvent(new Event('scroll'))
      await nextFrame()
    }
    expect(backgroundWrite).not.toHaveBeenCalled()
    expect(surfaceWrite).not.toHaveBeenCalled()

    host.removeAttribute('data-cursor-light-suspended')
    await nextFrame()
    move(rect.left + 20, rect.top + 1)
    await expect.poll(() => host.style.getPropertyValue('--cursor-light-active')).toBe('1')
    await expect.poll(() => layer.style.getPropertyValue('--cursor-reveal-active')).toBe('1')
  })

  it('подключает новые панели и обновляет геометрию при прокрутке, отключаясь для touch и blur', async () => {
    const panel = surface('Внешняя панель')
    const rect = panel.getBoundingClientRect()
    move(rect.left + 20, rect.top + 1)
    await expect.poll(() => light(panel).style.getPropertyValue('--cursor-reveal-y')).toBe('1px')
    panel.style.top = '10px'
    document.dispatchEvent(new Event('scroll'))
    await expect.poll(() => light(panel).style.getPropertyValue('--cursor-reveal-y')).toBe('-9px')
    panel.style.removeProperty('top')

    const added = panel.cloneNode(true) as HTMLElement
    added.style.cssText = 'position:fixed;left:10px;top:10px;width:250px'
    host.append(added)
    move(12, 12)
    await expect.poll(() => light(added).style.getPropertyValue('--cursor-reveal-x')).toBe('2px')
    added.remove()
    await expect.poll(() => light(added).style.getPropertyValue('--cursor-reveal-active')).toBe('')

    move(rect.left + 20, rect.top + 1)
    await expect.poll(() => host.style.getPropertyValue('--cursor-light-active')).toBe('1')
    move(12, 12, 'touch')
    expect(host.style.getPropertyValue('--cursor-light-active')).toBe('')
    expect(light(panel).style.getPropertyValue('--cursor-reveal-active')).toBe('')
    move(rect.left + 20, rect.top + 1)
    await expect.poll(() => host.style.getPropertyValue('--cursor-light-active')).toBe('1')
    window.dispatchEvent(new Event('blur'))
    expect(host.style.getPropertyValue('--cursor-light-active')).toBe('')
    expect(light(panel).style.getPropertyValue('--cursor-reveal-active')).toBe('')
  })

  it('очищает стили и обработчики при отключении контроллера', async () => {
    const panel = surface('Внешняя панель')
    const rect = panel.getBoundingClientRect()
    move(rect.left + 20, rect.top + 1)
    await expect.poll(() => light(panel).style.getPropertyValue('--cursor-reveal-active')).toBe('1')
    stop!()
    stop = undefined
    expect(host.style.getPropertyValue('--cursor-light-active')).toBe('')
    expect(light(panel).style.getPropertyValue('--cursor-reveal-active')).toBe('')

    const backgroundWrite = vi.spyOn(host.style, 'setProperty')
    move(rect.left + 30, rect.top + 2)
    document.dispatchEvent(new Event('scroll'))
    host.setAttribute('data-cursor-light-suspended', '')
    await nextFrame()
    expect(backgroundWrite).not.toHaveBeenCalled()
  })
})

describe.runIf(!enabled)('Доступность подсветки курсора', () => {
  it('отключает фон и обновление координат при reduced motion или forced colors', async () => {
    const panel = surface('Внешняя панель')
    const border = surface('Граница секции')
    const rect = panel.getBoundingClientRect()
    move(rect.left + 20, rect.top + 1)
    await nextFrame()
    expect(host.style.getPropertyValue('--cursor-light-active')).toBe('')
    expect(light(panel).style.getPropertyValue('--cursor-reveal-active')).toBe('')
    expect(getComputedStyle(host).backgroundImage.split(',').every(image => image.trim() === 'none')).toBe(true)
    expect(getComputedStyle(border).borderImageSource).toBe('none')
  })
})
