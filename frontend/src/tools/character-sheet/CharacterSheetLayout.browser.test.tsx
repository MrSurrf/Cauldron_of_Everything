import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { userEvent } from 'vitest/browser'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import '../../app/styles/global.css'
import '../../shared/styles/tokens.css'
import { CharacterSheetTool } from './CharacterSheetTool'
import { createMockCharacterSheet, createMockSpellcasterSheet } from './model'
import {
  CHARACTER_ENCYCLOPEDIA_DRAG_TYPE,
  writeCharacterEncyclopediaDrag,
} from './ui/encyclopedia'

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
  fitWidth = false,
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
        fitWidth={fitWidth}
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

async function clickSpellSheetTab(toggle: HTMLElement) {
  // Под листом скрыта подпись: нажимаем на видимую иконку язычка.
  await userEvent.click(toggle.querySelector<HTMLElement>('[data-spell-sheet-icon]')!)
}

async function settleSheetLayout(container: HTMLElement) {
  await act(async () => {
    await nextFrame()
    await nextFrame()
    const book = container.querySelector<HTMLElement>('[style*="--book-scale"]')!
    const drawer = container.querySelector<HTMLElement>('[data-spell-sheet-drawer]')!
    ;[book, drawer].flatMap((element) => element.getAnimations()).forEach((animation) => animation.finish())
    await nextFrame()
  })
}

async function selectEncyclopediaSection(container: HTMLElement, label: string) {
  const selector = container.querySelector<HTMLButtonElement>('[role="combobox"][aria-label="Раздел энциклопедии"]')!
  if (selector.textContent === label) return
  await act(async () => { await userEvent.click(selector) })
  const option = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'))
    .find((candidate) => candidate.textContent === label)!
  await act(async () => { await userEvent.click(option) })
}

async function dispatchEncyclopediaDrag(target: HTMLElement, type: string, transfer: DataTransfer) {
  const event = new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer })
  await act(async () => { target.dispatchEvent(event) })
  return event
}

async function startEncyclopediaDrag(container: HTMLElement, name: string) {
  await expect.poll(async () => {
    await act(async () => { await nextFrame() })
    return container.querySelector<HTMLButtonElement>(`[aria-label="Показать карточку: ${name}"]`)
  }).not.toBeNull()
  const source = container.querySelector<HTMLButtonElement>(`[aria-label="Показать карточку: ${name}"]`)!
  const transfer = new DataTransfer()
  await dispatchEncyclopediaDrag(source, 'dragstart', transfer)
  return { source, transfer }
}

function expectAvailableEncyclopediaZones(container: HTMLElement, expected: HTMLElement[]) {
  const available = Array.from(container.querySelectorAll<HTMLElement>('[data-encyclopedia-drop-available="true"]'))
  expect(available).toHaveLength(expected.length)
  expected.forEach((zone) => expect(available).toContain(zone))
}

const encyclopediaDragEntries = {
  class: { id: 201, entity_type: 'class', name: 'Чародей', name_en: 'Sorcerer', summary: {} },
  item: { id: 202, entity_type: 'item', name: 'Лунный кинжал', name_en: 'Moon Dagger', summary: {} },
  spell: { id: 203, entity_type: 'spell', name: 'Туманный шаг', name_en: 'Misty Step', summary: { level: 2 } },
  unknownSpell: { id: 204, entity_type: 'spell', name: 'Неизвестное заклинание', name_en: 'Unknown Spell', summary: {} },
}

function mockEncyclopediaDragEntries() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL(String(input))
    const entries = Object.values(encyclopediaDragEntries)
    const detailId = Number(url.pathname.match(/\/(\d+)\/$/)?.[1])
    const detail = entries.find((entry) => entry.id === detailId)
    const results = entries.filter((entry) => entry.entity_type === url.searchParams.get('type'))
    return new Response(JSON.stringify(detail ?? { count: results.length, results }), {
      headers: { 'Content-Type': 'application/json' },
    })
  })
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
  vi.restoreAllMocks()
})

describe('Character Sheet fixed desktop composition', () => {
  it('занимает всю высоту обоими листами после смены размеров окна и состояния энциклопедии', async () => {
    const container = await mountCharacterSheet(createMockSpellcasterSheet())
    const characterViewport = container.querySelector<HTMLElement>('[aria-label="Лист персонажа"][tabindex]')!
    for (const [width, height] of [[1885, 800], [1440, 796], [2560, 1336], [1100, 640]]) {
      await act(async () => {
        container.style.width = `${width}px`
        container.style.height = `${height}px`
      })
      for (const open of [false, true]) {
        const toggle = container.querySelector<HTMLElement>('[data-spell-sheet-toggle]')!
        await settleSheetLayout(container)
        if ((toggle.getAttribute('aria-expanded') === 'true') !== open) {
          await act(async () => { await clickSpellSheetTab(toggle) })
        }
        await settleSheetLayout(container)
        expect(characterViewport.getBoundingClientRect().height).toBeCloseTo(container.clientHeight, 0)
        expect(characterViewport.getBoundingClientRect().bottom).toBeCloseTo(container.getBoundingClientRect().bottom, 0)
        const spellPanel = container.querySelector<HTMLElement>('[data-spell-sheet-panel]')
        if (open) {
          expect(spellPanel!.getBoundingClientRect().height).toBeCloseTo(container.clientHeight, 0)
          expect(spellPanel!.getBoundingClientRect().bottom).toBeCloseTo(characterViewport.getBoundingClientRect().bottom, 0)
        }
      }
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ count: 0, results: [] })))
    await act(async () => { await userEvent.click(container.querySelector<HTMLElement>('[data-encyclopedia-trigger]')!) })
    await settleSheetLayout(container)
    expect(characterViewport.getBoundingClientRect().height).toBeCloseTo(container.clientHeight, 0)
    // Низ обоих листов доступен и после изменения высоты scrollport.
    for (const scroller of [characterViewport, container.querySelector<HTMLElement>('[data-spell-sheet-panel] [class*="scroller"]')!]) {
      await act(async () => { scroller.scrollTop = scroller.scrollHeight; await nextFrame() })
      expect(scroller.scrollTop + scroller.clientHeight).toBeGreaterThanOrEqual(scroller.scrollHeight - 1)
    }
  })

  it('не меняет масштаб и положение листов только из-за смены DPR монитора', async () => {
    const container = await mountCharacterSheet(createMockSpellcasterSheet())
    await act(async () => { await clickSpellSheetTab(container.querySelector<HTMLElement>('[data-spell-sheet-toggle]')!) })
    await settleSheetLayout(container)
    const book = container.querySelector<HTMLElement>('[style*="--book-scale"]')!
    const before = book.getBoundingClientRect()
    const scale = book.style.getPropertyValue('--book-scale')
    vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(window.devicePixelRatio * 2)
    await act(async () => { window.dispatchEvent(new Event('resize')) })
    await settleSheetLayout(container)
    expect(book.style.getPropertyValue('--book-scale')).toBe(scale)
    expect(book.getBoundingClientRect().left).toBeCloseTo(before.left, 0)
    expect(book.getBoundingClientRect().height).toBeCloseTo(before.height, 0)
  })

  it('сохраняет приближение и отдаление браузера, не теряя края листов при zoom', async () => {
    let cssWindowWidth = 1200
    vi.spyOn(window, 'outerWidth', 'get').mockReturnValue(1200)
    vi.spyOn(window, 'innerWidth', 'get').mockImplementation(() => cssWindowWidth)
    const container = await mountCharacterSheet(createMockSpellcasterSheet())
    await act(async () => { await clickSpellSheetTab(container.querySelector<HTMLElement>('[data-spell-sheet-toggle]')!) })
    await settleSheetLayout(container)
    const book = container.querySelector<HTMLElement>('[style*="--book-scale"]')!
    const workspace = container.querySelector<HTMLElement>('[data-library-open][data-spells-open]')!
    const scale = Number(book.style.getPropertyValue('--book-scale'))
    const width = book.getBoundingClientRect().width
    // При zoom 200% внешнее окно прежнее, а его CSS-ширина вдвое меньше.
    await act(async () => {
      cssWindowWidth = 600
      container.style.width = '600px'
      window.dispatchEvent(new Event('resize'))
    })
    await settleSheetLayout(container)
    expect(Number(book.style.getPropertyValue('--book-scale'))).toBeCloseTo(scale, 3)
    // Автоподгонка не уменьшает лист обратно: CSS-ширина сохраняется,
    // значит при browser zoom 200% его физическая ширина удваивается.
    expect(book.getBoundingClientRect().width).toBeCloseTo(width, 0)
    expect(workspace.scrollWidth).toBeGreaterThan(workspace.clientWidth)
    expect(book.getBoundingClientRect().left).toBeGreaterThanOrEqual(workspace.getBoundingClientRect().left)
    await act(async () => { workspace.scrollLeft = workspace.scrollWidth; await nextFrame() })
    const spells = container.querySelector<HTMLElement>('[data-spell-sheet-panel]')!
    expect(spells.getBoundingClientRect().right).toBeLessThanOrEqual(workspace.getBoundingClientRect().right)
    await act(async () => {
      cssWindowWidth = 1600
      container.style.width = '1600px'
      window.dispatchEvent(new Event('resize'))
    })
    await settleSheetLayout(container)
    expect(Number(book.style.getPropertyValue('--book-scale'))).toBeCloseTo(scale, 3)
    expect(workspace.scrollWidth).toBeLessThanOrEqual(workspace.clientWidth + 1)
  })

  it('переносит классы, расы и предыстории из API энциклопедии в соответствующие поля', async () => {
    const entries = {
      class: { id: 101, entity_type: 'class', name: 'Волшебник', name_en: 'Wizard' },
      race: { id: 102, entity_type: 'race', name: 'Эльф', name_en: 'Elf' },
      background: { id: 103, entity_type: 'background', name: 'Мудрец', name_en: 'Sage' },
    }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input))
      const mode = url.searchParams.get('type') as keyof typeof entries
      return new Response(JSON.stringify({ count: entries[mode] ? 1 : 0, results: entries[mode] ? [entries[mode]] : [] }), {
        headers: { 'Content-Type': 'application/json' },
      })
    })
    const container = await mountCharacterSheet()
    function field(labelText: string) {
      const label = Array.from(container.querySelectorAll('label')).find((label) => label.textContent === labelText)!
      return document.getElementById(label.htmlFor) as HTMLInputElement
    }
    expect(field('Класс').getAttribute('role')).not.toBe('combobox')
    await act(async () => {
      await userEvent.click(container.querySelector<HTMLElement>('[data-encyclopedia-trigger]')!)
    })
    for (const [mode, sectionName, fieldName] of [
      ['class', 'Классы', 'Класс'], ['race', 'Расы', 'Раса'], ['background', 'Предыстории', 'Предыстория'],
    ] as const) {
      const entry = entries[mode]
      await selectEncyclopediaSection(container, sectionName)
      await expect.poll(async () => {
        await act(async () => { await nextFrame() })
        return container.querySelector(`[aria-label="Показать карточку: ${entry.name}"]`)
      }).not.toBeNull()
      const input = field(fieldName)
      const transfer = new DataTransfer()
      await act(async () => {
        container.querySelector(`[aria-label="Показать карточку: ${entry.name}"]`)!.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: transfer }))
      })
      expect(JSON.parse(transfer.getData(CHARACTER_ENCYCLOPEDIA_DRAG_TYPE)).entityType).toBe(mode)
      const dragOver = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: transfer })
      await act(async () => { input.dispatchEvent(dragOver) })
      expect(dragOver.defaultPrevented).toBe(true)
      expect(input.closest('[data-drop-active="true"]')).not.toBeNull()
      await act(async () => {
        input.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }))
      })
      expect(input.value).toBe(entry.name)
      expect(input.closest('[data-drop-active="true"]')).toBeNull()
      expect(input.closest('[data-drop-received="true"]')).not.toBeNull()
      // Кнопка добавления использует тот же путь обновления данных листа.
      await act(async () => {
        await userEvent.fill(input, 'Свой вариант')
        await userEvent.click(container.querySelector<HTMLElement>(`[aria-label="Добавить: ${entry.name}"]`)!)
      })
      expect(input.value).toBe(entry.name)
    }
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('type=background'))).toBe(true)
    expect(container.querySelector('[data-spell-sheet-panel]')).toBeNull()
  })

  it('не вставляет запись чужого типа в поле класса и оставляет ручной ввод в обоих листах', async () => {
    const container = await mountCharacterSheet(createMockSpellcasterSheet())
    const label = Array.from(container.querySelectorAll('label')).find((label) => label.textContent === 'Класс')!
    const input = document.getElementById(label.htmlFor) as HTMLInputElement
    const originalValue = input.value
    const transfer = new DataTransfer()
    writeCharacterEncyclopediaDrag(transfer, { id: 102, entityType: 'race', name: 'Эльф', nameEn: 'Elf', level: null, summary: {} })
    await act(async () => {
      input.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: transfer }))
    })
    expect(transfer.dropEffect).toBe('none')
    const drop = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer })
    await act(async () => { input.dispatchEvent(drop) })
    expect(drop.defaultPrevented).toBe(true)
    expect(input.value).toBe(originalValue)
    await act(async () => {
      await userEvent.fill(input, 'Домашний класс')
      await clickSpellSheetTab(container.querySelector<HTMLElement>('[data-spell-sheet-toggle]')!)
    })
    const casterInput = container.querySelector<HTMLInputElement>('[aria-label="Класс заклинателя"]')!
    expect(casterInput.tagName).toBe('INPUT')
    expect(casterInput.getAttribute('role')).not.toBe('combobox')
    await act(async () => { await userEvent.fill(casterInput, 'Свой заклинатель') })
    expect(casterInput.value).toBe('Свой заклинатель')
    expect(input.value).toBe('Домашний класс')
    writeCharacterEncyclopediaDrag(transfer, { id: 101, entityType: 'class', name: 'Друид', nameEn: 'Druid', level: null, summary: {} })
    await act(async () => {
      casterInput.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }))
    })
    expect(casterInput.value).toBe('Друид')
    expect(input.value).toBe('Домашний класс')
  })

  it('подсвечивает оба поля класса с начала переноса и очищает подсказки при отмене', async () => {
    mockEncyclopediaDragEntries()
    const container = await mountCharacterSheet(createMockSpellcasterSheet())
    await act(async () => {
      await clickSpellSheetTab(container.querySelector<HTMLElement>('[data-spell-sheet-toggle]')!)
    })
    await settleSheetLayout(container)
    await act(async () => { await userEvent.click(container.querySelector<HTMLElement>('[data-encyclopedia-trigger]')!) })
    await selectEncyclopediaSection(container, 'Классы')
    const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('[data-encyclopedia-drop-zone="class"]'))
    expect(inputs).toHaveLength(2)
    const originalValues = inputs.map((input) => input.value)

    for (const cancel of ['dragend', 'Escape', 'blur'] as const) {
      const { source, transfer } = await startEncyclopediaDrag(container, encyclopediaDragEntries.class.name)
      // Все подходящие поля видны ещё до первого dragover.
      expectAvailableEncyclopediaZones(container, inputs)
      expect(source).toHaveAttribute('data-encyclopedia-dragging', 'true')
      expect(container.querySelector('[data-drop-active="true"]')).toBeNull()
      const over = await dispatchEncyclopediaDrag(inputs[0], 'dragover', transfer)
      expect(over.defaultPrevented).toBe(true)
      expect(inputs[0]).toHaveAttribute('data-drop-active', 'true')
      expect(inputs[1]).not.toHaveAttribute('data-drop-active', 'true')

      if (cancel === 'dragend') {
        await dispatchEncyclopediaDrag(source, 'dragend', transfer)
      } else {
        await act(async () => {
          window.dispatchEvent(cancel === 'Escape'
            ? new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' })
            : new Event('blur'))
        })
      }
      expectAvailableEncyclopediaZones(container, [])
      expect(container.querySelector('[data-drop-active="true"]')).toBeNull()
      expect(source).not.toHaveAttribute('data-encyclopedia-dragging', 'true')
      expect(inputs.map((input) => input.value)).toEqual(originalValues)
    }

    const { source, transfer } = await startEncyclopediaDrag(container, encyclopediaDragEntries.class.name)
    await dispatchEncyclopediaDrag(inputs[1], 'drop', transfer)
    expect(inputs[1].value).toBe(encyclopediaDragEntries.class.name)
    expect(inputs[0].value).toBe(originalValues[0])
    expect(inputs[1]).toHaveAttribute('data-drop-received', 'true')
    expect(getComputedStyle(inputs[1].parentElement!).animationName).not.toBe('none')
    expectAvailableEncyclopediaZones(container, [])
    expect(source).not.toHaveAttribute('data-encyclopedia-dragging', 'true')
  })

  it('подсвечивает для предмета только снаряжение и добавляет его после переноса в редактор', async () => {
    mockEncyclopediaDragEntries()
    const container = await mountCharacterSheet(createMockSpellcasterSheet())
    await act(async () => {
      await clickSpellSheetTab(container.querySelector<HTMLElement>('[data-spell-sheet-toggle]')!)
    })
    await settleSheetLayout(container)
    await act(async () => { await userEvent.click(container.querySelector<HTMLElement>('[data-encyclopedia-trigger]')!) })
    await selectEncyclopediaSection(container, 'Предметы')
    const equipment = container.querySelector<HTMLElement>('[data-encyclopedia-drop-zone="item"]')!
    const editorFrame = equipment.querySelector<HTMLElement>('[data-content-editor-frame]')!
    const classInput = container.querySelector<HTMLInputElement>('[data-encyclopedia-drop-zone="class"]')!
    const originalClass = classInput.value
    const originalEquipment = editorFrame.textContent
    const spellCount = container.querySelectorAll('[data-spell-entry]').length
    let drag = await startEncyclopediaDrag(container, encyclopediaDragEntries.item.name)
    expectAvailableEncyclopediaZones(container, [equipment])

    await dispatchEncyclopediaDrag(classInput, 'dragover', drag.transfer)
    expect(drag.transfer.dropEffect).toBe('none')
    expect(classInput).not.toHaveAttribute('data-drop-active', 'true')
    await dispatchEncyclopediaDrag(classInput, 'drop', drag.transfer)
    expect(classInput.value).toBe(originalClass)
    expect(editorFrame.textContent).toBe(originalEquipment)
    expect(container.querySelectorAll('[data-spell-entry]')).toHaveLength(spellCount)
    expectAvailableEncyclopediaZones(container, [])
    expect(container.querySelector('[data-drop-received="true"]')).toBeNull()

    drag = await startEncyclopediaDrag(container, encyclopediaDragEntries.item.name)
    const over = await dispatchEncyclopediaDrag(editorFrame, 'dragover', drag.transfer)
    expect(over.defaultPrevented).toBe(true)
    expect(equipment).toHaveAttribute('data-drop-active', 'true')
    await dispatchEncyclopediaDrag(equipment.querySelector<HTMLElement>('h2')!, 'dragover', drag.transfer)
    expect(equipment).not.toHaveAttribute('data-drop-active', 'true')
    expect(drag.transfer.dropEffect).toBe('none')
    expectAvailableEncyclopediaZones(container, [equipment])
    const reentered = await dispatchEncyclopediaDrag(editorFrame, 'dragover', drag.transfer)
    expect(equipment).toHaveAttribute('data-drop-active', 'true')
    expect(reentered.defaultPrevented).toBe(true)
    await dispatchEncyclopediaDrag(editorFrame, 'drop', drag.transfer)
    expect(equipment.textContent).toContain(encyclopediaDragEntries.item.name)
    expect(equipment).toHaveAttribute('data-drop-received', 'true')
    expect(getComputedStyle(equipment).animationName).not.toBe('none')
    expect(equipment).not.toHaveAttribute('data-drop-active', 'true')
    expectAvailableEncyclopediaZones(container, [])
    expect(drag.source).not.toHaveAttribute('data-encyclopedia-dragging', 'true')
    expect(classInput.value).toBe(originalClass)
    expect(container.querySelectorAll('[data-spell-entry]')).toHaveLength(spellCount)
  })

  it('подсвечивает уровень заклинания, отклоняет чужой уровень и предлагает все уровни для неизвестного', async () => {
    mockEncyclopediaDragEntries()
    const container = await mountCharacterSheet(createMockSpellcasterSheet())
    await act(async () => {
      await clickSpellSheetTab(container.querySelector<HTMLElement>('[data-spell-sheet-toggle]')!)
    })
    await settleSheetLayout(container)
    await act(async () => { await userEvent.click(container.querySelector<HTMLElement>('[data-encyclopedia-trigger]')!) })
    await selectEncyclopediaSection(container, 'Заклинания')
    const levels = Array.from(container.querySelectorAll<HTMLElement>('[data-encyclopedia-drop-zone="spell"]'))
    expect(levels).toHaveLength(10)
    const targetLevel = levels.find((level) => level.dataset.spellDropLevel === '2')!
    const wrongLevel = levels.find((level) => level.dataset.spellDropLevel === '1')!
    const spellCount = container.querySelectorAll('[data-spell-entry]').length
    const originalNames = Array.from(container.querySelectorAll('[data-spell-entry]')).map((spell) => spell.textContent)
    let drag = await startEncyclopediaDrag(container, encyclopediaDragEntries.spell.name)
    expectAvailableEncyclopediaZones(container, [targetLevel])

    await dispatchEncyclopediaDrag(wrongLevel, 'dragover', drag.transfer)
    expect(wrongLevel).not.toHaveAttribute('data-drop-active', 'true')
    await dispatchEncyclopediaDrag(wrongLevel, 'drop', drag.transfer)
    expect(Array.from(container.querySelectorAll('[data-spell-entry]')).map((spell) => spell.textContent)).toEqual(originalNames)
    expect(wrongLevel).not.toHaveAttribute('data-drop-received', 'true')
    expectAvailableEncyclopediaZones(container, [])

    drag = await startEncyclopediaDrag(container, encyclopediaDragEntries.spell.name)
    const over = await dispatchEncyclopediaDrag(targetLevel.querySelector<HTMLElement>('h2')!, 'dragover', drag.transfer)
    expect(over.defaultPrevented).toBe(true)
    expect(targetLevel).toHaveAttribute('data-drop-active', 'true')
    await dispatchEncyclopediaDrag(targetLevel, 'drop', drag.transfer)
    expect(container.querySelectorAll('[data-spell-entry]')).toHaveLength(spellCount + 1)
    expect(targetLevel.textContent).toContain(encyclopediaDragEntries.spell.name)
    expect(targetLevel).toHaveAttribute('data-drop-received', 'true')
    expect(getComputedStyle(targetLevel).animationName).not.toBe('none')
    expect(targetLevel).not.toHaveAttribute('data-drop-active', 'true')
    expectAvailableEncyclopediaZones(container, [])
    expect(drag.source).not.toHaveAttribute('data-encyclopedia-dragging', 'true')

    drag = await startEncyclopediaDrag(container, encyclopediaDragEntries.unknownSpell.name)
    expectAvailableEncyclopediaZones(container, levels)
    await dispatchEncyclopediaDrag(drag.source, 'dragend', drag.transfer)
    expectAvailableEncyclopediaZones(container, [])
    expect(container.querySelectorAll('[data-spell-entry]')).toHaveLength(spellCount + 1)
  })

  it('масштабирует весь лист под панель, сохраняя геометрию и доступность полей', async () => {
    const container = await mountCharacterSheet(createMockCharacterSheet(), true)
    const viewport = container.querySelector<HTMLElement>('[aria-label="Лист персонажа"][tabindex]')!
    const sheetPage = container.querySelector<HTMLElement>('[data-character-sheet-page]')!
    const body = container.querySelector<HTMLElement>('[data-character-sheet-layout="body"]')!
    const baseline = Array.from(body.children).map(element => {
      const rect = element.getBoundingClientRect(), origin = body.getBoundingClientRect()
      return { x: rect.left - origin.left, y: rect.top - origin.top, width: rect.width, height: rect.height }
    })
    for (const width of [320, 520, 700, 800, 1100]) {
      await act(async () => {
        container.style.width = `${width}px`
        container.style.height = '640px'
        await nextFrame()
        await nextFrame()
      })
      // Масштаб всего разворота меняется после измерения контейнера.
      for (let frame = 0; frame < 4; frame += 1) {
        await act(async () => { await nextFrame() })
      }
      const scale = sheetPage.getBoundingClientRect().width / sheetPage.offsetWidth
      expect(scale).toBeGreaterThan(0)
      expect(scale).toBeLessThanOrEqual(1)
      expect(sheetPage.offsetWidth).toBe(964)
      expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1)
      expect(sheetPage.getBoundingClientRect().right).toBeLessThanOrEqual(viewport.getBoundingClientRect().right + 1)
      expect(container.querySelector('[aria-label="Горизонтальная прокрутка: Лист персонажа"]')).toBeNull()
      Array.from(body.children).forEach((element, index) => {
        const rect = element.getBoundingClientRect(), origin = body.getBoundingClientRect()
        expect((rect.left - origin.left) / scale).toBeCloseTo(baseline[index].x, 0)
        expect((rect.top - origin.top) / scale).toBeCloseTo(baseline[index].y, 0)
        expect(rect.width / scale).toBeCloseTo(baseline[index].width, 0)
        expect(rect.height / scale).toBeCloseTo(baseline[index].height, 0)
      })
    }
    expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight)
    await act(async () => {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'instant' })
      await nextFrame()
    })
    const lastSection = container.querySelector<HTMLElement>('[data-character-sheet-personality="flaws"]')!
    expect(lastSection.getBoundingClientRect().bottom).toBeLessThanOrEqual(viewport.getBoundingClientRect().bottom + 1)
  })

  it('показывает лист сразу без верхней панели и настроек оформления', async () => {
    const container = await mountCharacterSheet()
    expect(container.querySelector('[aria-label="Открыть настройки листа"]')).toBeNull()
    expect(Array.from(container.querySelectorAll('h1, h2')).some(heading => heading.textContent === 'Лист персонажа')).toBe(false)
    const viewport = container.querySelector<HTMLElement>('[aria-label="Лист персонажа"][tabindex]')!
    expect(viewport.getBoundingClientRect().top - container.getBoundingClientRect().top).toBeLessThanOrEqual(8)
    expect(roundedWidth(container.querySelector('[data-character-sheet-page]')!)).toBe(964)
  })

  it('сохраняет раскладку в узкой панели без горизонтальной прокрутки', async () => {
    const container = await mountCharacterSheet()
    await act(async () => {
      container.style.height = '640px'
      await nextFrame()
    })
    const viewport = container.querySelector<HTMLElement>('[aria-label="Лист персонажа"][tabindex]')!
    const sheetPage = container.querySelector<HTMLElement>('[data-character-sheet-page]')!
    const body = container.querySelector<HTMLElement>('[data-character-sheet-layout="body"]')!
    const columns = Array.from(body.children).map(element => {
      const rect = element.getBoundingClientRect()
      const origin = body.getBoundingClientRect()
      return { x: rect.left - origin.left, y: rect.top - origin.top, width: rect.width, height: rect.height }
    })
    for (const width of [320, 520, 700, 800, 1100]) {
      await act(async () => {
        container.style.width = `${width}px`
        await nextFrame()
        await nextFrame()
      })
      await settleSheetLayout(container)
      expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1)
      expect(viewport.clientHeight).toBeGreaterThan(0)
      expect(viewport.getBoundingClientRect().bottom).toBeLessThanOrEqual(container.getBoundingClientRect().bottom + 1)
      expect(getComputedStyle(viewport).scrollbarWidth).toBe('none')
      expect(sheetPage.offsetWidth).toBe(964)
      const scale = sheetPage.getBoundingClientRect().width / sheetPage.offsetWidth
      Array.from(body.children).forEach((element, index) => {
        const rect = element.getBoundingClientRect()
        const origin = body.getBoundingClientRect()
        expect((rect.left - origin.left) / scale).toBeCloseTo(columns[index].x, 0)
        expect((rect.top - origin.top) / scale).toBeCloseTo(columns[index].y, 0)
        expect(rect.width / scale).toBeCloseTo(columns[index].width, 0)
        expect(rect.height / scale).toBeCloseTo(columns[index].height, 0)
      })
    }
    await act(async () => {
      container.style.width = '520px'
      await nextFrame()
      await nextFrame()
    })
    await act(async () => {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'instant' })
      await nextFrame()
    })
    const lastSection = container.querySelector<HTMLElement>('[data-character-sheet-personality="flaws"]')!
    expect(viewport.scrollLeft).toBe(0)
    expect(lastSection.getBoundingClientRect().right).toBeLessThanOrEqual(viewport.getBoundingClientRect().right + 1)
    expect(lastSection.getBoundingClientRect().bottom).toBeLessThanOrEqual(viewport.getBoundingClientRect().bottom + 1)
  })

  it('оформляет нативную прокрутку вложенных полей общими токенами', async () => {
    const container = await mountCharacterSheet()
    const field = document.createElement('textarea')
    container.append(field)
    expect(getComputedStyle(field).scrollbarWidth).toBe('thin')
    expect(getComputedStyle(field).scrollbarColor).not.toBe('auto')
    expect(getComputedStyle(document.documentElement).scrollbarColor).toBe(getComputedStyle(field).scrollbarColor)
  })
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
      container.querySelectorAll<HTMLElement>(
        '[data-character-sheet-personality] [data-animated-disclosure]',
      ).forEach((section) => {
        section.getAnimations().forEach((animation) => animation.finish())
      })
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
      personalitySections.querySelectorAll<HTMLElement>(
        '[data-animated-disclosure]',
      ).forEach((section) => {
        section.getAnimations().forEach((animation) => animation.finish())
      })
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
      personalitySections.querySelectorAll<HTMLElement>(
        '[data-animated-disclosure]',
      ).forEach((section) => {
        section.getAnimations().forEach((animation) => animation.finish())
      })
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

  it('использует единый маркер навыков для бинарных чекбоксов и меняет его одним кликом', async () => {
    const container = await mountCharacterSheet()
    const savingThrow = container.querySelector<HTMLInputElement>(
      '[aria-label="Владение спасброском: Сила"]',
    )!
    const savingThrowMarker = savingThrow.nextElementSibling as HTMLElement
    const skillMarker = container.querySelector<HTMLElement>(
      '[data-skill-row="athletics"] [data-selection-marker]',
    )!

    expect(savingThrow).toBeChecked()
    expect(savingThrowMarker.dataset.state).toBe('checked')
    expect(skillMarker.dataset.state).toBe('checked')

    const savingThrowStyle = getComputedStyle(
      savingThrowMarker,
      '::before',
    )
    const skillStyle = getComputedStyle(skillMarker, '::before')

    ;[
      'width',
      'height',
      'border-radius',
      'background-color',
      'box-shadow',
      'clip-path',
    ].forEach((property) => {
      expect(
        savingThrowStyle.getPropertyValue(property),
        property,
      ).toBe(skillStyle.getPropertyValue(property))
    })
    expect(savingThrowStyle.borderRadius).not.toBe('0px')

    await act(async () => {
      await userEvent.click(savingThrow.closest('label')!)
      await nextFrame()
    })

    expect(savingThrow).not.toBeChecked()
    expect(savingThrowMarker.dataset.state).toBe('unchecked')
    expect(
      savingThrow.closest('[data-saving-throw-row]')?.getAttribute('data-rank'),
    ).toBe('none')
  })

  it('анимирует оба листа и размонтирует лист заклинаний только после закрытия', async () => {
    const container = await mountCharacterSheet(createMockSpellcasterSheet())
    const toggle = container.querySelector<HTMLButtonElement>(
      '[data-spell-sheet-toggle]',
    )!
    const book = toggle.closest<HTMLElement>('[data-spells-open]')!

    await act(async () => {
      await clickSpellSheetTab(toggle)
      await nextFrame()
    })

    const panel = container.querySelector<HTMLElement>(
      '[data-spell-sheet-panel]',
    )!
    const drawer = container.querySelector<HTMLElement>('[data-spell-sheet-drawer]')!
    expect(book.dataset.spellsOpen).toBe('true')
    expect(panel.dataset.state).toBe('open')
    expect(getComputedStyle(book).transitionProperty).toBe('transform')
    expect(book.style.zoom).toBe('')
    expect(book.style.getPropertyValue('--book-scale')).not.toBe('')
    expect(getComputedStyle(panel).filter).toBe('none')
    expect(getComputedStyle(panel).opacity).toBe('1')

    // Во всём ходе движения язычок остаётся прикреплён к краю листа.
    const openingAnimations = [book, drawer].flatMap(element => element.getAnimations())
    expect(openingAnimations).toHaveLength(2)
    for (const time of [100, 280, 480]) {
      await act(async () => {
        openingAnimations.forEach(animation => {
          animation.pause()
          animation.currentTime = time
        })
        await nextFrame()
      })
      const panelRect = panel.getBoundingClientRect()
      const tabRect = toggle.getBoundingClientRect()
      const scale = panelRect.width / panel.offsetWidth
      const hoverOffset = new DOMMatrixReadOnly(getComputedStyle(toggle).transform).m41
      expect((tabRect.right - panelRect.right) / scale - hoverOffset).toBeCloseTo(30, 1)
      expect(getComputedStyle(panel).opacity).toBe('1')
    }
    await act(async () => {
      openingAnimations.forEach(animation => animation.finish())
      await nextFrame()
    })

    const initiallyExpandedSpell = panel.querySelector<HTMLElement>(
      '[data-spell-entry][data-expanded="true"] [data-animated-disclosure]',
    )!
    expect(initiallyExpandedSpell.dataset.state).toBe('open')
    expect(getComputedStyle(initiallyExpandedSpell).animationName).toBe('none')

    await act(async () => {
      await clickSpellSheetTab(toggle)
      await nextFrame()
    })

    expect(book.dataset.spellsOpen).toBe('false')
    expect(panel.dataset.state).toBe('closing')
    expect(container.querySelector('[data-spell-sheet-panel]')).toBe(panel)
    expect(panel).toHaveAttribute('inert')

    await act(async () => {
      ;[book, drawer].forEach(element => {
        element.getAnimations().forEach(animation => animation.finish())
      })
      await nextFrame()
    })

    expect(container.querySelector('[data-spell-sheet-panel]')).toBeNull()
  })

  it('выдвигает язычок вправо и показывает подпись перед иконкой при наведении', async () => {
    const container = await mountCharacterSheet(createMockSpellcasterSheet())
    const toggle = container.querySelector<HTMLButtonElement>(
      '[data-spell-sheet-toggle]',
    )!
    const icon = toggle.querySelector<HTMLElement>('[data-spell-sheet-icon]')!
    const arrow = toggle.querySelector<HTMLElement>('[data-spell-sheet-arrow]')!
    const book = toggle.closest<HTMLElement>('[data-spells-open]')!
    const characterPanel = book.firstElementChild as HTMLElement
    const sheetPage = container.querySelector<HTMLElement>(
      '[data-character-sheet-page]',
    )!
    const toggleRect = toggle.getBoundingClientRect()
    const sheetRect = sheetPage.getBoundingClientRect()

    expect(toggleRect.height).toBeCloseTo(48, 0)
    expect(sheetRect.right - toggleRect.left).toBeGreaterThan(4)
    expect(toggleRect.right).toBeGreaterThan(sheetRect.right)
    expect(icon.firstElementChild).not.toBeNull()
    expect(getComputedStyle(icon.firstElementChild!).maskImage).not.toBe('none')
    expect(arrow.textContent).toBe('›')
    expect(icon.getBoundingClientRect().width).toBeGreaterThan(
      arrow.getBoundingClientRect().width,
    )

    const label = toggle.querySelector<HTMLElement>('br')!.parentElement!
    expect(getComputedStyle(label).opacity).toBe('0')
    await act(async () => {
      await userEvent.hover(icon)
      await nextFrame()
    })
    await act(async () => {
      await nextFrame()
      toggle.getAnimations({ subtree: true }).forEach(animation => animation.finish())
      await nextFrame()
    })
    const hoverRect = toggle.getBoundingClientRect()
    const scale = characterPanel.getBoundingClientRect().width / characterPanel.offsetWidth
    expect(hoverRect.width).toBeCloseTo(toggleRect.width, 1)
    expect(hoverRect.left - toggleRect.left).toBeCloseTo(87.2 * scale, 1)
    expect(label.getBoundingClientRect().left).toBeGreaterThanOrEqual(sheetRect.right)
    expect(label.getBoundingClientRect().right).toBeLessThan(icon.getBoundingClientRect().left)
    expect(getComputedStyle(label).fontFamily).toContain('Gilroy')
    expect(getComputedStyle(label).fontWeight).toBe('400')
    expect(getComputedStyle(label).opacity).toBe('1')

    await act(async () => {
      await clickSpellSheetTab(toggle)
      await nextFrame()
    })

    expect(arrow.textContent).toBe('‹')
    const spellPanel = container.querySelector<HTMLElement>(
      '[data-spell-sheet-panel]',
    )!
    const drawer = container.querySelector<HTMLElement>('[data-spell-sheet-drawer]')!

    await act(async () => {
      ;[book, toggle, drawer].forEach((element) => {
        element.getAnimations().forEach((animation) => animation.finish())
      })
      await nextFrame()
    })

    const openToggleRect = toggle.getBoundingClientRect()
    const spellPanelRect = spellPanel.getBoundingClientRect()
    expect(
      openToggleRect.left - characterPanel.getBoundingClientRect().right,
    ).toBeGreaterThan(300)
    expect(openToggleRect.left).toBeLessThan(spellPanelRect.right)
    expect(openToggleRect.right).toBeGreaterThan(spellPanelRect.right)

    await act(async () => {
      await clickSpellSheetTab(toggle)
      await nextFrame()
      ;[book, toggle, drawer].forEach((element) => {
        element.getAnimations().forEach((animation) => animation.finish())
      })
      await nextFrame()
    })

    expect(arrow.textContent).toBe('›')
    const returnedScale = characterPanel.getBoundingClientRect().width / characterPanel.offsetWidth
    const hoverOffset = new DOMMatrixReadOnly(getComputedStyle(toggle).transform).m41
    expect(toggle.getBoundingClientRect().left - hoverOffset * returnedScale).toBeCloseTo(toggleRect.left, 0)
  })

  it('скрывает верхнюю кнопку энциклопедии после открытия боковой панели', async () => {
    const container = await mountCharacterSheet()
    const trigger = container.querySelector<HTMLButtonElement>(
      '[data-encyclopedia-trigger]',
    )!
    const sheet = container.querySelector<HTMLElement>(
      '[data-character-sheet-page]',
    )!

    expect(trigger.textContent).toContain('Энциклопедия')
    expect(trigger.querySelector('svg')).not.toBeNull()
    expect(getComputedStyle(trigger).writingMode).not.toBe('vertical-rl')
    expect(trigger.getBoundingClientRect().top).toBeCloseTo(
      sheet.getBoundingClientRect().top,
      0,
    )

    await act(async () => {
      await userEvent.click(trigger)
      await nextFrame()
    })

    expect(container.querySelector('[data-encyclopedia-trigger]')).toBeNull()
    expect(container.querySelector('[aria-label="Энциклопедия для листа персонажа"]')).not.toBeNull()

    const close = container.querySelector<HTMLButtonElement>(
      '[aria-label="Закрыть энциклопедию"]',
    )!
    await act(async () => {
      await userEvent.click(close)
      await nextFrame()
    })

    expect(container.querySelector('[data-encyclopedia-trigger]')).not.toBeNull()
  })

  it('анимирует раскрытие и закрытие личностных разделов и карточек заклинаний', async () => {
    const container = await mountCharacterSheet(createMockSpellcasterSheet())
    const traits = container.querySelector<HTMLElement>(
      '[data-character-sheet-personality="traits"]',
    )!
    const traitsToggle = traits.querySelector<HTMLButtonElement>(
      'button[aria-expanded]',
    )!

    expect(traits.querySelector('[data-animated-disclosure]')).toBeNull()

    await act(async () => {
      await userEvent.click(traitsToggle)
      await nextFrame()
    })

    const openedTraits = traits.querySelector<HTMLElement>(
      '[data-animated-disclosure]',
    )!
    expect(traitsToggle).toHaveAttribute('aria-expanded', 'true')
    expect(openedTraits.dataset.state).toBe('opening')
    expect(getComputedStyle(openedTraits).animationName).not.toBe('none')

    await act(async () => {
      await userEvent.click(traitsToggle)
      await nextFrame()
    })

    const closingTraits = traits.querySelector<HTMLElement>(
      '[data-animated-disclosure]',
    )!
    expect(closingTraits).toBe(openedTraits)
    expect(closingTraits.dataset.state).toBe('closing')
    expect(closingTraits).toHaveAttribute('inert')

    await act(async () => {
      closingTraits.dispatchEvent(
        new AnimationEvent('animationend', { bubbles: true }),
      )
      await nextFrame()
    })

    expect(traits.querySelector('[data-animated-disclosure]')).toBeNull()

    const spellSheetToggle = container.querySelector<HTMLButtonElement>(
      '[data-spell-sheet-toggle]',
    )!
    await act(async () => {
      await clickSpellSheetTab(spellSheetToggle)
      await nextFrame()
    })

    const spellPanel = container.querySelector<HTMLElement>(
      '[data-spell-sheet-panel]',
    )!
    const spellToggle = spellPanel.querySelector<HTMLButtonElement>(
      '[data-spell-entry] button[aria-expanded="true"]',
    )!
    const spell = spellToggle.closest<HTMLElement>('article')!
    const openedDetails = spell.querySelector<HTMLElement>(
      '[data-animated-disclosure]',
    )!

    expect(openedDetails.dataset.state).toBe('open')

    await act(async () => {
      await userEvent.click(spellToggle)
      await nextFrame()
    })

    const closingDetails = spell.querySelector<HTMLElement>(
      '[data-animated-disclosure]',
    )!
    expect(spellToggle).toHaveAttribute('aria-expanded', 'false')
    expect(closingDetails).toBe(openedDetails)
    expect(closingDetails.dataset.state).toBe('closing')

    await act(async () => {
      closingDetails.dispatchEvent(
        new AnimationEvent('animationend', { bubbles: true }),
      )
      await nextFrame()
    })

    expect(spell.querySelector('[data-animated-disclosure]')).toBeNull()
  })
})
