import {
  act,
  useState,
  type ReactNode,
} from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'

import '../../styles/tokens.css'
import '../../../app/styles/global.css'
import { ContentEditor } from './ContentEditor'

type MountedEditor = {
  container: HTMLDivElement
  root: Root
}

let mounted: MountedEditor | null = null

function Harness({
  children,
  initialValue,
}: {
  children?: ReactNode
  initialValue: string
}) {
  const [value, setValue] = useState(initialValue)

  return (
    <div style={{ width: '28rem', height: '18rem' }}>
      <ContentEditor
        accessibleLabel="Тестовый редактор"
        autoFocus={true}
        fill={true}
        showStructureActions={true}
        value={value}
        onValueChange={setValue}
      />
      {children}
    </div>
  )
}

async function mountEditor(initialValue: string) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  mounted = { container, root }

  await act(async () => {
    root.render(<Harness initialValue={initialValue} />)
  })

  await act(async () => {
    await nextFrame()
  })

  return container.querySelector<HTMLElement>(
    '[contenteditable="true"]',
  )!
}

function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

function setNativeSelection(
  startNode: Node,
  startOffset: number,
  endNode = startNode,
  endOffset = startOffset,
) {
  const selection = document.getSelection()!
  const range = document.createRange()
  range.setStart(startNode, startOffset)
  range.setEnd(endNode, endOffset)
  selection.removeAllRanges()
  selection.addRange(range)
  document.dispatchEvent(
    new Event('selectionchange', { bubbles: true }),
  )
}

function expectCompactToolbar(
  toolbar: HTMLElement,
  decoration: 'bare' | 'minimal',
) {
  const toolbarStyle = getComputedStyle(toolbar)
  const buttons = Array.from(
    toolbar.querySelectorAll<HTMLButtonElement>('button'),
  )

  expect(toolbarStyle.boxShadow).toBe('none')
  expect(toolbarStyle.filter).toBe('none')
  expect(toolbar.getBoundingClientRect().height).toBeLessThanOrEqual(32)
  expect(parseFloat(toolbarStyle.rowGap)).toBeLessThanOrEqual(4)
  expect(buttons.length).toBeGreaterThan(0)

  buttons.forEach((button) => {
    const buttonStyle = getComputedStyle(button)

    expect(button.dataset.decoration).toBe(decoration)
    expect(button.querySelector('[data-button-inner-frame]')).toBeNull()
    expect(button.querySelector('[data-button-corner-shapes]')).toBeNull()
    expect(buttonStyle.boxShadow).toBe('none')
    expect(buttonStyle.filter).toBe('none')
    expect(button.getBoundingClientRect().height).toBeLessThanOrEqual(24)
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
  await act(async () => {
    document.getSelection()?.removeAllRanges()
    document.dispatchEvent(
      new Event('selectionchange', { bubbles: true }),
    )
    await nextFrame()
  })

  if (mounted) {
    await act(async () => mounted?.root.unmount())
    mounted.container.remove()
    mounted = null
  }

  document
    .querySelectorAll('[aria-label="Форматирование выделенного текста"], [aria-label="Вставка содержимого"]')
    .forEach((node) => node.remove())
})

describe('ContentEditor browser behavior', () => {
  it('показывает оформленный текст без Markdown-маркеров', async () => {
    const editor = await mountEditor(
      'Обычный **важный** и *наклонный* текст.',
    )

    expect(editor.textContent).toContain(
      'Обычный важный и наклонный текст.',
    )
    expect(editor.textContent).not.toContain('**')
    expect(editor.querySelector('strong')).not.toBeNull()
    expect(editor.querySelector('em')).not.toBeNull()
  })

  it('позиционирует форматирование от выделения без изменения высоты поля', async () => {
    const editor = await mountEditor('Выделяемый текст')
    const frame = editor.closest<HTMLElement>('[class*="frame"]')!
    const heightBefore = frame.getBoundingClientRect().height
    const textNode = document
      .createTreeWalker(editor, NodeFilter.SHOW_TEXT)
      .nextNode()
    expect(textNode).toBeTruthy()

    await act(async () => {
      editor.focus()
      setNativeSelection(textNode!, 0, textNode!, 10)
      await nextFrame()
    })

    const toolbar = document.querySelector<HTMLElement>(
      '[aria-label="Форматирование выделенного текста"]',
    )
    expect(toolbar).not.toBeNull()
    expectCompactToolbar(toolbar!, 'bare')
    expect(getComputedStyle(toolbar!).clipPath).not.toBe('none')
    expect(toolbar?.getBoundingClientRect().top).toBeLessThan(
      editor.getBoundingClientRect().bottom,
    )
    expect(frame.getBoundingClientRect().height).toBe(heightBefore)
    expect(
      document.querySelector('[aria-label="Вставка содержимого"]'),
    ).toBeNull()

    const boldButton = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Полужирный"]',
    )
    expect(boldButton).not.toBeNull()

    await act(async () => {
      boldButton?.click()
      await nextFrame()
    })

    expect(editor.querySelector('strong')).not.toBeNull()
  })

  it('показывает меню блоков только у пустой каретки', async () => {
    const editor = await mountEditor('')
    const paragraph = editor.querySelector('p')
    expect(paragraph).not.toBeNull()

    await act(async () => {
      editor.focus()
      setNativeSelection(paragraph!, 0)
      await nextFrame()
    })

    const insertToolbar = document.querySelector<HTMLElement>(
      '[aria-label="Вставка содержимого"]',
    )
    expect(insertToolbar).not.toBeNull()
    expectCompactToolbar(insertToolbar!, 'minimal')
    expect(getComputedStyle(insertToolbar!).borderTopWidth).toBe('0px')
    insertToolbar
      ?.querySelectorAll<HTMLButtonElement>('button')
      .forEach((button) => {
        expect(getComputedStyle(button).clipPath).not.toBe('none')
      })
    expect(
      document.querySelector(
        '[aria-label="Форматирование выделенного текста"]',
      ),
    ).toBeNull()

    const resourceButton = document.querySelector<HTMLButtonElement>(
      '[aria-label="Вставка содержимого"] button:first-of-type',
    )

    await act(async () => {
      resourceButton?.click()
      await nextFrame()
    })

    expect(editor.textContent).toContain('Новый ресурс')
    expect(editor.textContent).not.toContain(':::')
  })
})
