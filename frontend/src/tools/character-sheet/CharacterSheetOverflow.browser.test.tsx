import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '../../app/styles/global.css'
import '../../shared/styles/tokens.css'
import { CharacterSheetTool } from './CharacterSheetTool'
import { createMockSpellcasterSheet } from './model'

let mountedRoot: Root | null = null
let mountedContainer: HTMLDivElement | null = null

function nextFrame() {
  return new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

function finiteAnimations(container: HTMLElement) {
  return container.getAnimations({ subtree: true }).filter(animation => {
    const end = animation.effect?.getComputedTiming().endTime
    return typeof end === 'number' && Number.isFinite(end) && end > 0
      && animation.playState !== 'idle' && animation.playState !== 'finished'
  })
}

async function settleSheetLayout(container: HTMLElement) {
  await act(async () => {
    await nextFrame()
    await nextFrame()
    finiteAnimations(container).forEach(animation => animation.finish())
    await nextFrame()
    // transitionend может убрать закрытую панель и запустить последний перерасчёт.
    finiteAnimations(container).forEach(animation => animation.finish())
    await nextFrame()
  })
}

async function mountCharacterSheet(width: number, fitWidth: boolean) {
  const container = document.createElement('div')
  container.style.width = `${width}px`
  container.style.height = '800px'
  document.body.append(container)
  mountedContainer = container
  mountedRoot = createRoot(container)
  await act(async () => {
    mountedRoot!.render(<CharacterSheetTool initialDocument={createMockSpellcasterSheet()} fitWidth={fitWidth} />)
    await nextFrame()
  })
  await act(async () => { await document.fonts.ready; await nextFrame() })
  await settleSheetLayout(container)
  return container
}

function workspaceOf(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[data-library-open][data-spells-open]')!
}

function expectNoHorizontalOverflow(container: HTMLElement, context: string) {
  const workspace = workspaceOf(container)
  expect(workspace.scrollWidth, context).toBeLessThanOrEqual(workspace.clientWidth + 1)
  expect(workspace.scrollLeft, context).toBeCloseTo(0, 0)
}

async function sampleTransitionOverflow(container: HTMLElement, context: string) {
  await act(async () => { await nextFrame() })
  const animations = finiteAnimations(container)
  if (!animations.length) {
    expectNoHorizontalOverflow(container, `${context}: без активной анимации`)
    return
  }
  for (const fraction of [0.25, 0.5, 0.75]) {
    await act(async () => {
      animations.forEach(animation => {
        if (animation.playState === 'idle' || animation.playState === 'finished') return
        const end = animation.effect?.getComputedTiming().endTime
        if (typeof end === 'number' && Number.isFinite(end)) {
          animation.pause()
          animation.currentTime = end * fraction
        }
      })
      await nextFrame()
    })
    expectNoHorizontalOverflow(container, `${context}: ${fraction * 100}% анимации`)
  }
}

async function setPanelState(container: HTMLElement, spellsOpen: boolean, encyclopediaOpen: boolean) {
  const workspace = workspaceOf(container)
  await act(async () => {
    if ((workspace.dataset.spellsOpen === 'true') !== spellsOpen) {
      container.querySelector<HTMLButtonElement>('[data-spell-sheet-toggle]')!.click()
    }
    if ((workspace.dataset.libraryOpen === 'true') !== encyclopediaOpen) {
      const toggle = encyclopediaOpen
        ? container.querySelector<HTMLButtonElement>('[data-encyclopedia-trigger]')
        : container.querySelector<HTMLButtonElement>('[aria-label="Закрыть энциклопедию"]')
      expect(toggle).not.toBeNull()
      toggle!.click()
    }
  })
}

function expectNotClipped(element: HTMLElement, workspace: HTMLElement, context: string) {
  const rect = element.getBoundingClientRect()
  const bounds = workspace.getBoundingClientRect()
  let left = bounds.left, right = bounds.right, top = bounds.top, bottom = bounds.bottom
  for (let parent = element.parentElement; parent && workspace.contains(parent); parent = parent.parentElement) {
    const style = getComputedStyle(parent)
    const clip = parent.getBoundingClientRect()
    if (style.overflowX !== 'visible') { left = Math.max(left, clip.left); right = Math.min(right, clip.right) }
    if (style.overflowY !== 'visible') { top = Math.max(top, clip.top); bottom = Math.min(bottom, clip.bottom) }
  }
  expect(rect.width, context).toBeGreaterThan(0)
  expect(rect.height, context).toBeGreaterThan(0)
  expect(rect.left, context).toBeGreaterThanOrEqual(left - 1)
  expect(rect.right, context).toBeLessThanOrEqual(right + 1)
  expect(rect.top, context).toBeGreaterThanOrEqual(top - 1)
  expect(rect.bottom, context).toBeLessThanOrEqual(bottom + 1)
  // На реально видимом участке проверяем не только clip, но и перекрытие листом/панелью.
  const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2
  if (x >= 0 && x < document.documentElement.clientWidth && y >= 0 && y < document.documentElement.clientHeight) {
    const hit = document.elementFromPoint(x, y)
    const toggle = element.closest('[data-spell-sheet-toggle]')!
    expect(hit === toggle || Boolean(hit && toggle.contains(hit)), context).toBe(true)
  }
}

async function checkSpellTabHover(container: HTMLElement, context: string) {
  const workspace = workspaceOf(container)
  const toggle = container.querySelector<HTMLButtonElement>('[data-spell-sheet-toggle]')!
  const icon = toggle.querySelector<HTMLElement>('[data-spell-sheet-icon]')!
  expectNotClipped(icon, workspace, `${context}: иконка закрытого язычка`)
  // Синтетический mouseover не прокручивает документ, если host шире viewport тестового браузера.
  await act(async () => { toggle.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })) })
  await settleSheetLayout(container)
  expect(toggle.dataset.expanded, context).toBe('true')
  const label = toggle.querySelector<HTMLElement>('[class*="pageTabLabel"]')!
  expect(Number(getComputedStyle(label).opacity), context).toBeGreaterThan(0.99)
  for (const element of [label, icon, toggle.querySelector<HTMLElement>('[data-spell-sheet-arrow]')!]) {
    expectNotClipped(element, workspace, `${context}: раскрытый язычок`)
  }
  expectNoHorizontalOverflow(container, `${context}: hover завершён`)
  await act(async () => { toggle.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: container })) })
  await settleSheetLayout(container)
}

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ count: 0, results: [] }), {
    headers: { 'Content-Type': 'application/json' },
  }))
})

afterEach(async () => {
  if (mountedRoot) await act(async () => mountedRoot?.unmount())
  mountedContainer?.remove()
  mountedRoot = null
  mountedContainer = null
  vi.restoreAllMocks()
})

const widthsAndFit = [1885, 1440, 1200, 1100, 800].flatMap(width => [false, true].map(fitWidth => ({ width, fitWidth })))

describe('Горизонтальные границы workspace листа персонажа', () => {
  it.each(widthsAndFit)('не создаёт нижний скролл при ширине $width и fitWidth=$fitWidth во всех состояниях панелей', async ({ width, fitWidth }) => {
    vi.spyOn(window, 'outerWidth', 'get').mockReturnValue(1920)
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1920)
    const container = await mountCharacterSheet(width, fitWidth)
    for (const [spellsOpen, encyclopediaOpen] of [[false, false], [true, false], [true, true], [false, true], [false, false]]) {
      const context = `host=${width}, fitWidth=${fitWidth}, spells=${spellsOpen}, encyclopedia=${encyclopediaOpen}`
      await setPanelState(container, spellsOpen, encyclopediaOpen)
      // Промежуточные transform достаточно проверить в одной репрезентативной ширине.
      if (width === 1440 && !fitWidth) await sampleTransitionOverflow(container, context)
      await settleSheetLayout(container)
      expectNoHorizontalOverflow(container, `${context}: переход завершён`)
      if (spellsOpen && encyclopediaOpen) await checkSpellTabHover(container, context)
    }
  }, 30_000)

  it.each([false, true])('сохраняет настоящий zoom-overflow, доступность правого края и сбрасывает scrollLeft после расширения, fitWidth=%s', async fitWidth => {
    let cssWindowWidth = 1200
    vi.spyOn(window, 'outerWidth', 'get').mockReturnValue(1200)
    vi.spyOn(window, 'innerWidth', 'get').mockImplementation(() => cssWindowWidth)
    // Сначала фиксируем 100% масштаб: zoom определяется относительно первого измерения host.
    const container = await mountCharacterSheet(1200, fitWidth)
    await setPanelState(container, true, false)
    await settleSheetLayout(container)
    expectNoHorizontalOverflow(container, 'до browser zoom')
    const workspace = workspaceOf(container)
    await act(async () => {
      cssWindowWidth = 600
      container.style.width = '600px'
      window.dispatchEvent(new Event('resize'))
      await nextFrame()
    })
    await settleSheetLayout(container)
    expect(workspace.scrollWidth).toBeGreaterThan(workspace.clientWidth + 1)
    await act(async () => { workspace.scrollLeft = workspace.scrollWidth; await nextFrame() })
    expect(workspace.scrollLeft).toBeGreaterThan(0)
    const spells = container.querySelector<HTMLElement>('[data-spell-sheet-panel]')!
    expect(spells.getBoundingClientRect().right).toBeLessThanOrEqual(workspace.getBoundingClientRect().right + 1)
    expect(spells.getBoundingClientRect().right).toBeGreaterThan(workspace.getBoundingClientRect().left)
    await act(async () => { workspace.scrollLeft = 0; await nextFrame() })
    expect(workspace.scrollLeft).toBe(0)
    const character = container.querySelector<HTMLElement>('[data-character-sheet-page]')!
    expect(character.getBoundingClientRect().left).toBeGreaterThanOrEqual(workspace.getBoundingClientRect().left - 1)
    // Оставляем ненулевую прокрутку перед расширением: сброс должен сделать браузер, не тест.
    await act(async () => { workspace.scrollLeft = workspace.scrollWidth; await nextFrame() })
    expect(workspace.scrollLeft).toBeGreaterThan(0)
    await act(async () => {
      cssWindowWidth = 1600
      container.style.width = '1600px'
      window.dispatchEvent(new Event('resize'))
      await nextFrame()
    })
    await settleSheetLayout(container)
    expectNoHorizontalOverflow(container, 'после расширения host до 1600px')
    expect(workspace.scrollLeft).toBe(0)
  })
})
