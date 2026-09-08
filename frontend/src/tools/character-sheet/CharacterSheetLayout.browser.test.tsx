import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'

import '../../app/styles/global.css'
import '../../shared/styles/tokens.css'
import { CharacterSheetTool } from './CharacterSheetTool'
import { createMockCharacterSheet } from './model'

let mountedRoot: Root | null = null
let mountedContainer: HTMLDivElement | null = null

function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

async function mountCharacterSheet() {
  const container = document.createElement('div')
  container.style.width = '75rem'
  container.style.height = '70rem'
  document.body.append(container)

  const root = createRoot(container)
  mountedContainer = container
  mountedRoot = root

  await act(async () => {
    root.render(
      <CharacterSheetTool
        initialDocument={createMockCharacterSheet()}
      />,
    )
    await nextFrame()
  })

  return container
}

function roundedWidth(element: Element) {
  return Math.round(element.getBoundingClientRect().width)
}

beforeEach(() => {
  ;(
    globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT: boolean
    }
  ).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(async () => {
  if (mountedRoot) {
    await act(async () => mountedRoot?.unmount())
  }

  mountedContainer?.remove()
  mountedRoot = null
  mountedContainer = null
})

describe('Character Sheet fixed desktop composition', () => {
  it('расширяет правую колонку и сохраняет фиксированную геометрию листа', async () => {
    const container = await mountCharacterSheet()
    const page = container.querySelector<HTMLElement>(
      '[data-character-sheet-page]',
    )!
    const left = container.querySelector<HTMLElement>(
      '[data-character-sheet-column="left"]',
    )!
    const center = container.querySelector<HTMLElement>(
      '[data-character-sheet-column="center"]',
    )!
    const right = container.querySelector<HTMLElement>(
      '[data-character-sheet-column="right"]',
    )!
    const traits = container.querySelector<HTMLElement>(
      '[data-character-sheet-identity-traits]',
    )!
    const identity = page.firstElementChild as HTMLElement
    const identityInputs = Array.from(
      identity.querySelectorAll<HTMLElement>('input'),
    )

    expect(roundedWidth(page)).toBe(964)
    expect(roundedWidth(left)).toBe(288)
    expect(roundedWidth(center)).toBe(400)
    expect(roundedWidth(right)).toBe(264)
    expect(roundedWidth(traits)).toBe(264)
    expect(identity.getBoundingClientRect().height).toBeGreaterThanOrEqual(
      123,
    )
    identityInputs.forEach((input) => {
      expect(input.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        identity.getBoundingClientRect().bottom,
      )
    })
    expect(right.getBoundingClientRect().bottom).toBe(
      center.getBoundingClientRect().bottom,
    )
    expect(left.getBoundingClientRect().bottom).toBe(
      center.getBoundingClientRect().bottom,
    )
  })

  it('группирует вдохновение с мастерством и упрощает запрошенные блоки', async () => {
    const container = await mountCharacterSheet()
    const statStack = container.querySelector<HTMLElement>(
      '[data-character-sheet-stat-stack="mastery"]',
    )!
    const statCards = Array.from(
      statStack.children,
    ) as HTMLElement[]
    const armorClass = container.querySelector<HTMLElement>(
      '[data-stat="armorClass"]',
    )!
    const hitPointsSlot = container.querySelector<HTMLElement>(
      '[data-character-sheet-slot="hit-points"]',
    )!
    const deathSavesSlot = container.querySelector<HTMLElement>(
      '[data-character-sheet-slot="death-saves"]',
    )!
    const strength = container.querySelector<HTMLElement>(
      'article[aria-label="Сила"]',
    )!
    const attacksEditor = container.querySelector<HTMLElement>(
      '[data-character-sheet-slot="attacks"] [role="region"]',
    )!
    const attacksScaleControls = Array.from(
      attacksEditor.children,
    ).find((child) => child.getAttribute('role') === 'group') as HTMLElement
    const attacks = attacksEditor.closest('section')!
    const equipmentSlot = container.querySelector<HTMLElement>(
      '[data-character-sheet-slot="equipment"]',
    )!
    const equipmentTable = equipmentSlot.querySelector('table')!
    const currencySlot = container.querySelector<HTMLElement>(
      '[data-character-sheet-slot="currency"]',
    )!
    const hitDiceValue = container.querySelector<HTMLElement>(
      '[data-character-sheet-column="center"] [data-mode] input, '
        + '[data-character-sheet-column="center"] [data-mode] output',
    )!
    const currencyValue = currencySlot.querySelector<HTMLElement>('input')!

    expect(statCards).toHaveLength(2)
    expect(roundedWidth(statCards[0])).toBe(roundedWidth(statCards[1]))
    expect(statCards[0].getBoundingClientRect().height).toBe(
      statCards[1].getBoundingClientRect().height,
    )
    expect(statCards[1].getBoundingClientRect().top).toBeGreaterThan(
      statCards[0].getBoundingClientRect().bottom,
    )
    expect(
      armorClass.querySelector('[data-presentation="stat"]'),
    ).not.toBeNull()
    expect(
      armorClass.querySelector('[data-presentation="shield"]'),
    ).toBeNull()
    const armorClassShieldStyle = getComputedStyle(
      armorClass,
      '::before',
    )
    expect(
      `${armorClassShieldStyle.maskImage} ${armorClassShieldStyle.getPropertyValue('-webkit-mask-image')}`,
    ).toContain('data:image/svg+xml')
    expect(getComputedStyle(armorClass).borderTopWidth).toBe('0px')
    expect(roundedWidth(armorClass)).toBeLessThanOrEqual(72)
    expect(hitPointsSlot.getBoundingClientRect().width).toBeCloseTo(
      166.5,
      1,
    )
    expect(hitPointsSlot.getBoundingClientRect().height).toBe(72)

    const hitPointFields = Array.from(
      hitPointsSlot.querySelectorAll<HTMLElement>(
        '[data-presentation]',
      ),
    )
    expect(hitPointFields).toHaveLength(3)
    const hitPointFieldRects = hitPointFields.map((field) =>
      field.getBoundingClientRect(),
    )
    expect(hitPointFieldRects[1].top).toBe(
      hitPointFieldRects[0].top,
    )
    expect(hitPointFieldRects[2].top).toBe(
      hitPointFieldRects[0].top,
    )
    expect(hitPointFieldRects[1].left).toBeGreaterThanOrEqual(
      hitPointFieldRects[0].right,
    )
    expect(hitPointFieldRects[2].left).toBeGreaterThanOrEqual(
      hitPointFieldRects[1].right,
    )
    hitPointFields.forEach((field) => {
      const label = field.firstElementChild as HTMLElement
      const labelText = label.firstElementChild as HTMLElement
      const control = field.children[1] as HTMLElement

      expect(labelText.scrollWidth).toBeLessThanOrEqual(
        labelText.clientWidth,
      )
      expect(control.getBoundingClientRect().width).toBeLessThanOrEqual(
        36,
      )
    })
    expect(
      deathSavesSlot.getBoundingClientRect().height,
    ).toBeLessThanOrEqual(72)
    const abilityValues = Array.from(
      strength.querySelectorAll<HTMLElement>('[data-mode]'),
    )
    expect(abilityValues).toHaveLength(2)
    expect(
      abilityValues[1].getBoundingClientRect().top,
    ).toBeGreaterThanOrEqual(
      abilityValues[0].getBoundingClientRect().bottom,
    )
    expect(roundedWidth(abilityValues[1])).toBeLessThanOrEqual(40)
    expect(attacks.querySelector('table')).toBeNull()
    const attacksTitle = attacks.querySelector<HTMLElement>(
      ':scope > header h2',
    )!
    const attacksContentHeading = attacksEditor.querySelector<HTMLElement>(
      'h3, h4, h5, h6',
    )!
    expect(getComputedStyle(attacksTitle).fontSize).toBe('14px')
    expect(getComputedStyle(attacksEditor).fontSize).toBe('14px')
    expect(getComputedStyle(attacksContentHeading).fontSize).toBe(
      '14px',
    )
    expect(
      attacks.getBoundingClientRect().height,
    ).toBe(304)
    expect(
      attacksEditor.getBoundingClientRect().bottom
        - attacksScaleControls.getBoundingClientRect().bottom,
    ).toBeLessThanOrEqual(12)
    expect(
      equipmentSlot.getBoundingClientRect().height,
    ).toBeLessThanOrEqual(400)
    expect(roundedWidth(equipmentTable)).toBeLessThanOrEqual(
      roundedWidth(equipmentSlot),
    )
    expect(
      currencySlot.getBoundingClientRect().height,
    ).toBeLessThanOrEqual(56)
    expect(currencySlot.querySelector('[data-mode]')).toBeNull()
    expect(getComputedStyle(currencyValue).fontSize).toBe(
      getComputedStyle(hitDiceValue).fontSize,
    )
    expect(currencySlot.scrollWidth).toBeLessThanOrEqual(
      currencySlot.clientWidth,
    )
  })
})
