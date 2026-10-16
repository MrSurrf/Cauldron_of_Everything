import { act, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { userEvent } from 'vitest/browser'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import '../../../app/styles/global.css'
import '../../styles/tokens.css'
import { ContentEditor } from './ContentEditor'
import { parseContentSource } from './contentCodec'
import {
  emptyItem,
  itemFromBlock,
  itemToSource,
  type ContentItemValue,
} from './itemContent'

let root: Root | undefined
let host: HTMLElement

const frame = () => new Promise<void>((resolve) =>
  requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
)

const settleVisualTransition = () => new Promise<void>((resolve) =>
  setTimeout(resolve, 200),
)

function SingleEditorHarness({ source }: { source: string }) {
  const [value, setValue] = useState(source)

  return (
    <div style={{ width: 480, height: 560 }}>
      <ContentEditor
        accessibleLabel="Снаряжение"
        fill
        renderPreview
        showStructureActions
        value={value}
        onValueChange={setValue}
      />
      <output data-source hidden>{value}</output>
    </div>
  )
}

function DragHarness({ item, editing }: { item: ContentItemValue; editing: boolean }) {
  const [left, setLeft] = useState(`До\n\n${itemToSource(item)}\n\nПосле`)
  const [right, setRight] = useState('Приёмник')

  return (
    <div style={{ display: 'grid', gap: 24, width: 320 }}>
      <div data-editor="left" style={{ height: 220 }}>
        <ContentEditor
          accessibleLabel="Левое поле"
          autoFocus={editing}
          fill
          renderPreview
          value={left}
          onValueChange={setLeft}
        />
        <output data-source="left" hidden>{left}</output>
      </div>
      <div data-editor="right" style={{ height: 220 }}>
        <ContentEditor
          accessibleLabel="Правое поле"
          autoFocus={editing}
          fill
          renderPreview
          value={right}
          onValueChange={setRight}
        />
        <output data-source="right" hidden>{right}</output>
      </div>
    </div>
  )
}

async function mount(node: ReactNode) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => {
    root!.render(node)
    await frame()
  })
  await act(async () => { await frame() })
}

async function click(element: Element) {
  await act(async () => {
    await userEvent.click(element as HTMLElement)
    await frame()
  })
}

async function fill(element: Element, value: string) {
  await act(async () => {
    await userEvent.fill(element as HTMLElement, value)
    await frame()
  })
}

function control(label: string) {
  const element = Array.from(document.querySelectorAll('label'))
    .find((candidate) => candidate.textContent?.trim() === label) as HTMLLabelElement
  return (element.querySelector('input, textarea') ?? document.getElementById(element.htmlFor)) as HTMLInputElement | HTMLTextAreaElement
}

function saved(side?: 'left' | 'right') {
  const selector = side
    ? `[data-source="${side}"]`
    : '[data-source]'
  return host.querySelector(selector)!.textContent!
}

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
    .IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(async () => {
  await act(async () => root?.unmount())
  host?.remove()
  root = undefined
})

describe('Виджет предмета', () => {
  it('сохраняет свойства, свободный ввод и выбор из подсказок', async () => {
    await mount(<SingleEditorHarness source={itemToSource(emptyItem)} />)
    await click(host.querySelector('[data-item-widget]')!)

    await fill(control('Название предмета'), 'Жезл искр')
    await fill(control('Количество'), '2')
    await fill(control('Вид'), 'Самодельный фокус')
    await click(control('Редкость'))
    await click(Array.from(document.querySelectorAll('[role="option"]'))
      .find((option) => option.textContent?.trim() === 'Очень редкий')!)
    await fill(control('Стоимость'), 'Цена по договорённости')
    await fill(control('Описание предмета'), 'Светится рядом с порталами.\nНе ломать.')
    await click(Array.from(document.querySelectorAll('dialog button'))
      .find((button) => button.textContent?.trim() === 'Готово')!)

    const block = parseContentSource(saved())[0]
    expect(block.kind).toBe('item')
    if (block.kind !== 'item') throw new Error('Предмет не сохранился')
    expect(itemFromBlock(block)).toEqual({
      ...emptyItem,
      title: 'Жезл искр',
      quantity: '2',
      itemType: 'Самодельный фокус',
      rarity: 'Очень редкий',
      cost: 'Цена по договорённости',
      description: 'Светится рядом с порталами.\nНе ломать.',
    })
  })

  it('меняет настройку и экипировку прямо в строке и показывает подсказки', async () => {
    await mount(<SingleEditorHarness source={itemToSource({ ...emptyItem, title: 'Кольцо' })} />)
    const actions = host.querySelector<HTMLElement>('[aria-label="Состояние предмета"]')!
    const attuned = host.querySelector<HTMLInputElement>('[aria-label="Настройка"]')!
    const equipped = host.querySelector<HTMLInputElement>('[aria-label="Надето"]')!
    const attunedRoot = attuned.closest<HTMLElement>('[data-checkbox-root]')!
    const attunementIcon = host.querySelector<HTMLElement>('[data-icon="attunement"]')!
    const equippedIcon = host.querySelector<HTMLElement>('[data-icon="equipped"]')!

    expect(attuned).not.toBeChecked()
    expect(attunedRoot.dataset.state).toBe('unchecked')
    expect(actions.querySelector('[data-selection-marker]')).toBeNull()
    expect(actions.querySelectorAll('[data-checkbox-indicator]')).toHaveLength(2)
    expect(attunementIcon).not.toBeNull()
    expect(equippedIcon).not.toBeNull()
    expect(getComputedStyle(attunementIcon).maskImage).not.toBe('none')
    expect(getComputedStyle(equippedIcon).maskImage).not.toBe('none')
    expect(attunementIcon.getBoundingClientRect().width).toBeGreaterThan(0)
    expect(equippedIcon.getBoundingClientRect().height).toBeGreaterThan(0)
    expect(attunedRoot.getBoundingClientRect().width).toBeGreaterThanOrEqual(24)
    expect(attunedRoot.getBoundingClientRect().height).toBeGreaterThanOrEqual(24)
    expect(getComputedStyle(attunementIcon).filter).toBe('none')
    expect(getComputedStyle(equippedIcon).filter).toBe('none')

    await click(attuned.closest('label')!)
    expect(attuned).toBeChecked()
    expect(attunedRoot.dataset.state).toBe('checked')
    expect(getComputedStyle(attunementIcon).filter).not.toBe('none')
    expect(document.querySelector('dialog')).toBeNull()

    await click(attuned.closest('label')!)
    expect(attuned).not.toBeChecked()
    await act(async () => { await settleVisualTransition() })
    expect(getComputedStyle(attunementIcon).filter).toBe('none')

    await click(attuned.closest('label')!)
    await click(equipped.closest('label')!)
    expect(attuned).toBeChecked()
    expect(equipped).toBeChecked()
    expect(getComputedStyle(equippedIcon).filter).not.toBe('none')

    const block = parseContentSource(saved())[0]
    if (block.kind !== 'item') throw new Error('Предмет не сохранился')
    expect(itemFromBlock(block)).toMatchObject({ attuned: true, equipped: true })

    await act(async () => {
      await userEvent.hover(attuned.closest('label')!)
      await frame()
    })
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe('Настройка')
  })

  it.each([
    ['просмотре', false],
    ['редактировании', true],
  ])('перетаскивает предмет между текстовыми полями в %s без потери данных', async (_mode, editing) => {
    const item: ContentItemValue = {
      title: 'Плащ ночи',
      quantity: '1',
      description: 'Даёт преимущество в сумраке.',
      rarity: 'Редкий',
      cost: '750 зм',
      itemType: 'Чудесный предмет',
      attuned: true,
      equipped: true,
    }
    await mount(<DragHarness item={item} editing={editing} />)

    const left = host.querySelector<HTMLElement>('[data-editor="left"]')!
    const right = host.querySelector<HTMLElement>('[data-editor="right"]')!
    const handle = left.querySelector<HTMLElement>('[data-widget-drag-handle]')!
    const target = right.querySelector<HTMLElement>('[data-content-editor-frame]')!

    await act(async () => {
      await userEvent.dragAndDrop(handle, target)
      await frame()
    })

    expect(left.querySelector('[data-item-widget]')).toBeNull()
    expect(right.querySelectorAll('[data-item-widget]')).toHaveLength(1)
    expect(saved('left')).toContain('До')
    expect(saved('left')).toContain('После')
    expect(saved('left')).not.toContain(':::item')
    expect(saved('right')).toContain('Приёмник')

    const moved = parseContentSource(saved('right'))
      .find((block) => block.kind === 'item')
    if (!moved || moved.kind !== 'item') throw new Error('Предмет не перенесён')
    expect(itemFromBlock(moved)).toEqual(item)
    expect(document.querySelector('[data-content-drop-target]')).toBeNull()
  })

  it('читает старую карточку предмета без новых атрибутов', () => {
    const block = parseContentSource(
      ':::item[Верёвка]{quantity="2" description="15%20метров"}\n:::',
    )[0]
    if (block.kind !== 'item') throw new Error('Предмет не разобран')
    expect(itemFromBlock(block)).toEqual({
      ...emptyItem,
      title: 'Верёвка',
      quantity: '2',
      description: '15 метров',
    })
  })
})
