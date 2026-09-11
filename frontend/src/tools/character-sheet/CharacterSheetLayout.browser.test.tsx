import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { userEvent } from 'vitest/browser'
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

async function mountCharacterSheet(
  initialDocument = createMockCharacterSheet(),
) {
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
        initialDocument={initialDocument}
      />,
    )
    await nextFrame()
  })

  await act(async () => {
    await document.fonts.ready
    await nextFrame()
  })

  return container
}

function roundedWidth(element: Element) {
  return Math.round(element.getBoundingClientRect().width)
}

function expectTextEditorSpacing(container: HTMLElement, count: number) {
  const sections = container.querySelectorAll<HTMLElement>(
    '[data-content-layout="editor"]:not([data-open="false"])',
  )
  expect(sections).toHaveLength(count)
  sections.forEach((section) => {
    const header = section.querySelector<HTMLElement>(':scope > header')!
    const frame = section.querySelector<HTMLElement>('[data-content-editor-frame]')!
    const sectionRect = section.getBoundingClientRect()
    const frameRect = frame.getBoundingClientRect()
    expect(section.querySelectorAll('[data-content-editor-frame]')).toHaveLength(1)
    expect(frameRect.top - header.getBoundingClientRect().bottom).toBeCloseTo(6, 1)
    expect(frameRect.left - sectionRect.left).toBeCloseTo(7, 1)
    expect(sectionRect.right - frameRect.right).toBeCloseTo(7, 1)
    expect(sectionRect.bottom - frameRect.bottom).toBeCloseTo(7, 1)
    expect(frameRect.height).toBeGreaterThan(0)
  })
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
  it('пересчитывает максимум виджета по характеристикам листа и сохраняет связанные ресурсы', async () => {
    const initialDocument = createMockCharacterSheet()
    initialDocument.equipmentContentText = ':::resource[Заряды]{current=1 maximum-formula="%5BPROF%5D*2" recovery=short}\n:::'
    const container = await mountCharacterSheet(initialDocument)
    const widget = container.querySelector<HTMLElement>('[data-character-sheet-slot="equipment"] [data-resource-widget]')!
    expect(widget.getAttribute('aria-label')).toBe('Заряды: 1 / 4')
    await act(async () => {
      const level = container.querySelector<HTMLInputElement>('input[aria-label="Уровень"]')!
      await userEvent.fill(level, '5')
      level.blur()
      await nextFrame()
    })
    expect(widget.getAttribute('aria-label')).toBe('Заряды: 1 / 6')

    const featureWidget = Array.from(container.querySelectorAll<HTMLElement>('[data-resource-widget]'))
      .find(element => element.getAttribute('aria-label')?.startsWith('Второе дыхание:'))!
    await act(async () => { featureWidget.click(); await nextFrame() })
    const getField = (name: string) => {
      const label = Array.from(document.querySelectorAll<HTMLLabelElement>('[role="dialog"] label')).find(element => element.textContent === name)!
      return document.getElementById(label.htmlFor) as HTMLInputElement
    }
    await act(async () => {
      await userEvent.fill(getField('Максимум'), '[PROF]*2')
      await nextFrame()
    })
    await act(async () => {
      Array.from(document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')).find(element => element.textContent === 'Восстановить')!.click()
      await nextFrame()
    })
    expect(getField('Текущее').value).toBe('6')
    expect(getField('Максимум').value).toBe('[PROF]*2')
    await act(async () => {
      document.querySelector<HTMLButtonElement>('[aria-label="Закрыть настройки ресурса"]')!.click()
      await nextFrame()
    })
    expect(Array.from(container.querySelectorAll('[data-resource-widget]')).some(element => element.getAttribute('aria-label') === 'Второе дыхание: 6 / 6')).toBe(true)
  })

  it('начинает текст на строке подсказки при первом и повторном входе в пустое поле', async () => {
    const initialDocument = createMockCharacterSheet()
    initialDocument.equipmentContentText = ''
    const container = await mountCharacterSheet(initialDocument)
    const equipment = container.querySelector<HTMLElement>('[data-character-sheet-slot="equipment"]')!
    const frame = equipment.querySelector<HTMLElement>('[data-content-editor-frame]')!
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await act(async () => {
        await userEvent.click(frame)
        await nextFrame()
      })
      const editor = equipment.querySelector<HTMLElement>('[contenteditable="true"]')!
      const placeholder = equipment.querySelector<HTMLElement>('[class*="placeholder"]')!
      const placeholderRange = document.createRange()
      placeholderRange.selectNodeContents(placeholder)
      const placeholderTop = placeholderRange.getBoundingClientRect().top
      await act(async () => {
        await userEvent.keyboard('А')
        await nextFrame()
      })
      const text = editor.querySelector('[data-lexical-text]')!
      expect(text.textContent).toBe('А')
      expect(text.getBoundingClientRect().top).toBeCloseTo(placeholderTop, 1)
      expect(text.getBoundingClientRect().top - frame.getBoundingClientRect().top).toBeLessThanOrEqual(6)
      await act(async () => {
        await userEvent.fill(editor, '')
        container.querySelector<HTMLInputElement>('[data-stat="speed"] input')!.focus()
        await nextFrame()
      })
    }
  })

  it('использует одинаковый редактор во всех текстовых разделах и сохраняет снаряжение', async () => {
    const container = await mountCharacterSheet()
    expectTextEditorSpacing(container, 4)
    await act(async () => {
      container.querySelectorAll<HTMLButtonElement>('[data-character-sheet-personality] button[aria-expanded="false"]')
        .forEach(button => button.click())
      await nextFrame()
    })
    expectTextEditorSpacing(container, 8)

    const equipment = container.querySelector<HTMLElement>('[data-character-sheet-slot="equipment"]')!
    await act(async () => {
      equipment.querySelector<HTMLElement>('[role="region"]')!.click()
      await nextFrame()
    })
    const editor = equipment.querySelector<HTMLElement>('[contenteditable="true"]')!
    expect(editor).not.toBeNull()
    expectTextEditorSpacing(container, 8)
    await act(async () => {
      await userEvent.fill(editor, 'Щит и верёвка')
      container.querySelector<HTMLInputElement>('input[aria-label="Сила: значение"]')!.focus()
      await nextFrame()
    })
    expect(equipment.querySelector('[role="region"]')!.textContent).toContain('Щит и верёвка')
    expectTextEditorSpacing(container, 8)
  })

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
    const personalitySections = container.querySelector<HTMLElement>(
      '[data-character-sheet-personality-sections]',
    )!
    const identity = page.firstElementChild as HTMLElement
    const identityInputs = Array.from(
      identity.querySelectorAll<HTMLElement>('input:not([type="file"])'),
    )

    expect(roundedWidth(page)).toBe(964)
    expect(roundedWidth(left)).toBe(288)
    expect(roundedWidth(center)).toBe(400)
    expect(roundedWidth(right)).toBe(264)
    expect(roundedWidth(personalitySections)).toBe(264)
    expect(
      container.querySelector(
        '[data-character-sheet-identity-traits]',
      ),
    ).toBeNull()
    expect(identity.getBoundingClientRect().height).toBeGreaterThanOrEqual(
      123,
    )
    identityInputs.forEach((input) => {
      const inputStyle = getComputedStyle(input)
      const verticalContentSize =
        parseFloat(inputStyle.paddingTop) +
        parseFloat(inputStyle.lineHeight) +
        parseFloat(inputStyle.paddingBottom)

      expect(input.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        identity.getBoundingClientRect().bottom,
      )
      expect(input.getBoundingClientRect().height).toBeGreaterThanOrEqual(
        verticalContentSize,
      )
    })
    expect(right.getBoundingClientRect().bottom).toBe(
      center.getBoundingClientRect().bottom,
    )
    expect(left.getBoundingClientRect().bottom).toBe(
      center.getBoundingClientRect().bottom,
    )
  })

  it('показывает русские названия и сокращения характеристик', async () => {
    const container = await mountCharacterSheet()
    const abilityHeadings = Array.from(
      container.querySelectorAll<HTMLElement>(
        '[aria-label="Характеристики"] article > header',
      ),
      (heading) => heading.textContent?.trim(),
    )
    const skillAbbreviations = Array.from(new Set(
      Array.from(
        container.querySelectorAll<HTMLElement>(
          '[data-character-sheet-column="left"] [data-presentation="list"] small',
        ),
        (abbreviation) => abbreviation.textContent?.trim(),
      ),
    )).sort()
    const savingThrowRows = Array.from(
      container.querySelectorAll<HTMLElement>(
        '[data-saving-throw-row]',
      ),
    )
    const skillRows = Array.from(
      container.querySelectorAll<HTMLElement>(
        '[data-skill-row]',
      ),
    )
    const skillNames = skillRows.map((row) =>
      row.querySelector<HTMLElement>(
        '[data-presentation="list"] > :first-child > span',
      )!,
    )

    expect(abilityHeadings).toEqual([
      'Сила',
      'Ловкость',
      'Телосложение',
      'Интеллект',
      'Мудрость',
      'Харизма',
    ])
    expect(abilityHeadings.join(' ')).not.toMatch(
      /\b(?:STR|DEX|CON|INT|WIS|CHA)\b/,
    )
    expect(skillAbbreviations).toEqual([
      'ИНТ',
      'ЛОВ',
      'МУД',
      'СИЛ',
      'ХАР',
    ])
    expect(skillNames.map(name => name.textContent)).toContain('Животные')
    skillNames.forEach((name) => {
      expect(getComputedStyle(name).whiteSpace).toBe('nowrap')
      expect(getComputedStyle(name).textOverflow).toBe('ellipsis')
      expect(getComputedStyle(name).overflow).toBe('hidden')
    })

    ;[savingThrowRows[0], skillRows[0]].forEach((row) => {
      const field = row.querySelector<HTMLElement>(
        '[data-presentation="list"]',
      )!
      const numberFrame = field.querySelector<HTMLElement>('[data-numeric-frame]')!
      const numberFrameStyle = getComputedStyle(numberFrame)

      expect(parseFloat(getComputedStyle(field).columnGap)).toBeGreaterThan(1)
      expect(numberFrame.dataset.framed).toBe('true')
      expect(numberFrameStyle.clipPath).toContain('polygon')
      expect(field.querySelectorAll('[data-numeric-frame]')).toHaveLength(1)
    })

    const firstSkillLabel = skillRows[0].querySelector<HTMLElement>(
      '[data-presentation="list"] > :first-child',
    )!
    const skillName = firstSkillLabel.querySelector<HTMLElement>('span')!
    const skillAbility = firstSkillLabel.querySelector<HTMLElement>('small')!

    expect(skillAbility.getBoundingClientRect().left).toBeGreaterThan(
      skillName.getBoundingClientRect().right,
    )
    expect(getComputedStyle(skillRows[0]).backgroundImage).not.toBe(
      getComputedStyle(skillRows[1]).backgroundImage,
    )

    skillRows.forEach((row) => {
      const abbreviation = row.querySelector('small')!
      const panel = row.closest('section')!
      expect(abbreviation.getBoundingClientRect().right).toBeLessThanOrEqual(
        panel.getBoundingClientRect().right - 8,
      )
    })

    const speedNumberFrame = container.querySelector<HTMLElement>(
      '[data-stat="speed"] [data-numeric-frame]',
    )!
    const skillNumberFrame = skillRows[0].querySelector<HTMLElement>(
      '[data-numeric-frame]',
    )!

    expect(getComputedStyle(skillNumberFrame).clipPath).toBe(
      getComputedStyle(speedNumberFrame).clipPath,
    )

    const scoreField = container.querySelector<HTMLElement>(
      '[aria-label="Сила: значение"]',
    )!.closest<HTMLElement>('[data-mode]')!
    const scoreFrame = scoreField.querySelector<HTMLElement>('[data-numeric-frame]')!
    expect(scoreField.querySelectorAll('[data-numeric-frame]')).toHaveLength(1)
    expect(getComputedStyle(scoreFrame).clipPath).toBe(getComputedStyle(speedNumberFrame).clipPath)
    expect(getComputedStyle(scoreField).clipPath).toBe('none')
    expect(getComputedStyle(scoreField).borderTopWidth).toBe('0px')

    ;[skillNumberFrame, speedNumberFrame, scoreFrame].forEach((frame) => {
      const control = frame.querySelector<HTMLElement>('input, output')!
      expect(getComputedStyle(control).color).toBe(
        getComputedStyle(scoreFrame.querySelector('input')!).color,
      )
      expect(getComputedStyle(control).opacity).toBe('1')
      const formulaControl = frame.parentElement!
      expect(getComputedStyle(formulaControl).borderBottomWidth).toBe('0px')
      expect(getComputedStyle(formulaControl).backgroundImage).toBe('none')
    })

    ;['proficiency', 'initiative', 'speed'].forEach((stat) => {
      const card = container.querySelector(`[data-stat="${stat}"]`)!
      expect(getComputedStyle(card, '::before').content).toBe('none')
      expect(getComputedStyle(card, '::after').content).toBe('none')
    })
  })

  it('раскрывает личностные разделы вверх внутри статичных границ листа', async () => {
    const document = createMockCharacterSheet()
    document.appearance = {
      ...document.appearance,
      bodyFontSize: 16,
      density: 'spacious',
      headingFontSize: 16,
    }
    const container = await mountCharacterSheet(document)
    const page = container.querySelector<HTMLElement>(
      '[data-character-sheet-page]',
    )!
    const center = container.querySelector<HTMLElement>(
      '[data-character-sheet-column="center"]',
    )!
    const right = container.querySelector<HTMLElement>(
      '[data-character-sheet-column="right"]',
    )!
    const features = right.firstElementChild as HTMLElement
    const personalitySections = right.lastElementChild as HTMLElement
    const toggles = Array.from(
      personalitySections.querySelectorAll<HTMLButtonElement>(
        'button[aria-expanded]',
      ),
    )

    expect(toggles).toHaveLength(4)
    toggles.forEach((toggle) => {
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
    })
    expect(
      Array.from(
        personalitySections.querySelectorAll<HTMLElement>(
          '[data-character-sheet-personality]',
        ),
      ).map((section) =>
        section.dataset.characterSheetPersonality,
      ),
    ).toEqual(['traits', 'ideals', 'bonds', 'flaws'])

    const pageBottomBefore = page.getBoundingClientRect().bottom
    const rightBottomBefore = right.getBoundingClientRect().bottom
    const featuresBefore = features.getBoundingClientRect()
    const personalityTopBefore =
      personalitySections.getBoundingClientRect().top
    const traitsToggle = toggles[0]

    await act(async () => {
      traitsToggle.click()
      await nextFrame()
    })

    const featuresAfter = features.getBoundingClientRect()
    const personalityTopAfter =
      personalitySections.getBoundingClientRect().top

    expect(traitsToggle).toHaveAttribute('aria-expanded', 'true')
    expect(
      personalitySections.querySelector(
        '[data-character-sheet-personality="traits"] [role="region"]',
      ),
    ).not.toBeNull()
    expect(featuresAfter.height).toBeLessThan(featuresBefore.height)
    expect(featuresAfter.bottom).toBeLessThan(featuresBefore.bottom)
    expect(personalityTopAfter).toBeLessThan(personalityTopBefore)
    expect(page.getBoundingClientRect().bottom).toBe(pageBottomBefore)
    expect(right.getBoundingClientRect().bottom).toBe(rightBottomBefore)
    expect(right.getBoundingClientRect().bottom).toBe(
      center.getBoundingClientRect().bottom,
    )
    expect(right.scrollHeight).toBeLessThanOrEqual(right.clientHeight)

    await act(async () => {
      toggles.slice(1).forEach((toggle) => toggle.click())
      await nextFrame()
    })

    toggles.forEach((toggle) => {
      expect(toggle).toHaveAttribute('aria-expanded', 'true')
    })
    expect(features.getBoundingClientRect().height).toBeLessThan(
      featuresAfter.height,
    )
    expect(page.getBoundingClientRect().bottom).toBe(pageBottomBefore)
    expect(right.getBoundingClientRect().bottom).toBe(rightBottomBefore)
    expect(right.scrollHeight).toBeLessThanOrEqual(right.clientHeight)
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
    const hitDiceSlot = container.querySelector<HTMLElement>(
      '[data-character-sheet-slot="hit-dice"]',
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
    const equipmentEditor = equipmentSlot.querySelector<HTMLElement>(
      '[role="region"][aria-label="Снаряжение"]',
    )!
    const currencySlot = container.querySelector<HTMLElement>(
      '[data-character-sheet-slot="currency"]',
    )!
    const hitDiceValue = container.querySelector<HTMLElement>(
      '[data-character-sheet-column="center"] [data-mode] input, '
        + '[data-character-sheet-column="center"] [data-mode] output',
    )!
    const currencyValue = currencySlot.querySelector<HTMLElement>('input')!

    expect(statCards).toHaveLength(2)
    const movement = container.querySelector<HTMLElement>('[data-stat="initiative"]')!.parentElement!
    const saves = container.querySelector<HTMLElement>('[data-saving-throw-row]')!.closest('section')!
    expect(roundedWidth(statStack)).toBe(168)
    expect(roundedWidth(movement)).toBe(117)
    expect(movement.getBoundingClientRect().right).toBe(saves.getBoundingClientRect().right)
    ;['proficiency', 'initiative', 'speed'].forEach(stat => {
      const label = container.querySelector<HTMLElement>(`[data-stat="${stat}"] [data-formula-label] > span`)!
      expect(label.scrollWidth, stat).toBeLessThanOrEqual(label.clientWidth)
      const card = label.closest('[data-stat]')!
      const frame = card.querySelector('[data-numeric-frame]')!
      const value = frame.querySelector('input, output')!
      expect(roundedWidth(frame), stat).toBe(40)
      expect(label.getBoundingClientRect().left - frame.getBoundingClientRect().right, stat).toBe(3)
      expect(getComputedStyle(value).paddingInlineStart, stat).toBe('2px')
      expect(getComputedStyle(value).paddingInlineEnd, stat).toBe('2px')
    })
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
    expect(roundedWidth(armorClass)).toBeGreaterThan(72)
    expect(hitPointsSlot.getBoundingClientRect().width).toBeCloseTo(
      184,
      1,
    )
    expect(hitPointsSlot.getBoundingClientRect().height).toBe(72)

    const hitPointFields = Array.from(
      hitPointsSlot.querySelectorAll<HTMLElement>(
        '[data-presentation]',
      ),
    )
    const hitPointFieldFrames = Array.from(
      hitPointsSlot.querySelectorAll<HTMLElement>(
        '[data-hit-points-field]',
      ),
    )
    expect(hitPointFields).toHaveLength(3)
    expect(
      hitPointFieldFrames.map((field) =>
        field.dataset.hitPointsField,
      ),
    ).toEqual(['current', 'maximum', 'temporary'])
    expect(hitPointFieldFrames[1].getBoundingClientRect().left).toBeGreaterThanOrEqual(
      hitPointFieldFrames[0].getBoundingClientRect().right,
    )
    expect(hitPointFieldFrames[2].getBoundingClientRect().left).toBeGreaterThanOrEqual(
      hitPointFieldFrames[1].getBoundingClientRect().right,
    )
    hitPointFields.forEach((field) => {
      const label = field.firstElementChild as HTMLElement
      const labelText = label.firstElementChild as HTMLElement
      const control = field.children[1] as HTMLElement

      expect(labelText.scrollWidth).toBeLessThanOrEqual(
        labelText.clientWidth,
      )
      expect(control.getBoundingClientRect().width).toBeLessThanOrEqual(
        44,
      )
    })
    const temporaryHitPointsControl =
      hitPointFields[2].children[1] as HTMLElement
    expect(
      getComputedStyle(
        temporaryHitPointsControl,
        '::before',
      ).maskImage,
    ).not.toBe('none')
    expect(temporaryHitPointsControl.getBoundingClientRect().width).toBeLessThanOrEqual(
      36,
    )
    expect(
      deathSavesSlot.getBoundingClientRect().height,
    ).toBeLessThanOrEqual(72)
    expect(deathSavesSlot.getBoundingClientRect().top).toBe(
      hitPointsSlot.getBoundingClientRect().top,
    )
    expect(deathSavesSlot.getBoundingClientRect().left).toBe(
      hitPointsSlot.getBoundingClientRect().right,
    )
    expect(deathSavesSlot.parentElement).toBe(
      hitPointsSlot.parentElement,
    )
    const deathSaveMarks = Array.from(
      deathSavesSlot.querySelectorAll<HTMLButtonElement>(
        'button[aria-pressed]',
      ),
    )
    expect(deathSaveMarks).toHaveLength(6)
    deathSaveMarks.forEach((mark) => {
      const markRect = mark.getBoundingClientRect()
      const deathSavesRect = deathSavesSlot.getBoundingClientRect()

      expect(mark.querySelector('svg')).toBeNull()
      expect(getComputedStyle(mark).borderRadius).toBe('50%')
      expect(markRect.right).toBeLessThan(deathSavesRect.right)
      expect(markRect.bottom).toBeLessThan(deathSavesRect.bottom)
    })
    expect(roundedWidth(hitDiceSlot)).toBe(roundedWidth(attacks))
    const abilityValues = Array.from(
      strength.querySelectorAll<HTMLElement>('[data-mode]'),
    )
    expect(abilityValues).toHaveLength(2)
    const armorClassValue = armorClass.querySelector<HTMLElement>(
      'input, output',
    )!
    const currentHitPointsValue = hitPointFieldFrames[0]
      .querySelector<HTMLElement>('input, output')!
    const heart = hitPointFieldFrames[0].querySelector<HTMLElement>('[aria-hidden="true"]')!
    const heartRect = heart.getBoundingClientRect()
    const currentRect = currentHitPointsValue.getBoundingClientRect()
    expect(heartRect.top + heartRect.height / 2).toBeCloseTo(currentRect.top + currentRect.height / 2, 0)
    expect(getComputedStyle(currentHitPointsValue).textShadow).toMatch(/0px 0px 4px,.*0px 0px 12px/)
    const maximumHitPointsValue = hitPointFieldFrames[1]
      .querySelector<HTMLElement>('input, output')!
    const temporaryHitPointsValue = hitPointFieldFrames[2]
      .querySelector<HTMLElement>('input, output')!
    const abilityModifierValue = abilityValues[0]
      .querySelector<HTMLElement>('input, output')!
    const abilityScoreValue = abilityValues[1]
      .querySelector<HTMLElement>('input, output')!

    expect(getComputedStyle(currentHitPointsValue).fontSize).toBe(
      getComputedStyle(armorClassValue).fontSize,
    )
    expect(getComputedStyle(currentHitPointsValue).fontSize).toBe(
      getComputedStyle(abilityModifierValue).fontSize,
    )
    expect(getComputedStyle(maximumHitPointsValue).fontSize).toBe(
      getComputedStyle(abilityScoreValue).fontSize,
    )
    expect(getComputedStyle(temporaryHitPointsValue).fontSize).toBe(
      getComputedStyle(abilityScoreValue).fontSize,
    )
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
    expect(equipmentSlot.querySelector('table')).toBeNull()
    expect(equipmentSlot.querySelector('textarea')).toBeNull()
    expect(equipmentEditor.textContent).toContain('Кольчуга')
    expect(roundedWidth(equipmentEditor)).toBeLessThanOrEqual(
      roundedWidth(equipmentSlot),
    )
    expect(equipmentEditor.getBoundingClientRect().height).toBeGreaterThan(
      100,
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

  it('раскладывает пулы костей хитов по два в строке', async () => {
    const container = await mountCharacterSheet()
    const list = container.querySelector<HTMLElement>(
      '[data-hit-dice-list]',
    )!
    const addButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Добавить пул костей хитов"]',
    )!
    const getPools = () => Array.from(
      list.querySelectorAll<HTMLElement>(
        '[data-hit-dice-pool]',
      ),
    )

    const header = addButton.closest('header')!
    const heading = header.querySelector('h3')!
    const buttonRect = addButton.getBoundingClientRect()
    const headingRect = heading.getBoundingClientRect()
    const headerRect = header.getBoundingClientRect()
    expect(buttonRect.left - headingRect.right).toBeCloseTo(6, 1)
    expect((headingRect.left + buttonRect.right) / 2).toBeCloseTo(headerRect.left + headerRect.width / 2, 1)
    expect(buttonRect.top + buttonRect.height / 2).toBeCloseTo(headingRect.top + headingRect.height / 2, 1)

    expect(getPools()).toHaveLength(1)
    expect(roundedWidth(getPools()[0])).toBe(roundedWidth(list))

    await act(async () => {
      addButton.click()
      await nextFrame()
    })

    let pools = getPools()
    expect(pools).toHaveLength(2)
    expect(pools[0].getBoundingClientRect().top).toBe(
      pools[1].getBoundingClientRect().top,
    )
    expect(roundedWidth(pools[0])).toBe(roundedWidth(pools[1]))
    expect(roundedWidth(pools[0])).toBeLessThan(roundedWidth(list))

    await act(async () => {
      addButton.click()
      await nextFrame()
    })

    pools = getPools()
    expect(pools).toHaveLength(3)
    expect(pools[2].getBoundingClientRect().top).toBeGreaterThanOrEqual(
      pools[0].getBoundingClientRect().bottom,
    )
    expect(roundedWidth(pools[2])).toBe(roundedWidth(list))

    await act(async () => {
      addButton.click()
      await nextFrame()
    })

    pools = getPools()
    expect(pools).toHaveLength(4)
    expect(pools[2].getBoundingClientRect().top).toBe(
      pools[3].getBoundingClientRect().top,
    )
    expect(roundedWidth(pools[2])).toBe(roundedWidth(pools[0]))
  })
})
