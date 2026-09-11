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
  vi,
} from 'vitest'

import '../../styles/tokens.css'
import '../../../app/styles/global.css'
import { ContentEditor } from './ContentEditor'
import type { ContentEditorProps } from './ContentEditor.types'

type MountedEditor = {
  container: HTMLDivElement
  root: Root
}

let mounted: MountedEditor | null = null

it('начинает ввод у верхней границы и использует компактный интервал строк', async () => {
  const editor = await mountEditor('', { placeholder: 'Начните ввод' })
  const paragraph = editor.querySelector('p')!
  const frame = editor.closest('[data-content-editor-frame]')!
  expect(paragraph.getBoundingClientRect().top - frame.getBoundingClientRect().top).toBeLessThanOrEqual(5)
  const placeholder = mounted!.container.querySelector<HTMLElement>('[class*="placeholder"]')!
  expect(placeholder.getBoundingClientRect().top).toBe(paragraph.getBoundingClientRect().top)
  const style = getComputedStyle(editor)
  expect(parseFloat(style.lineHeight) / parseFloat(style.fontSize)).toBeCloseTo(1.3, 1)
  const controls = frame.querySelector('[role="group"]')!
  expect(frame.getBoundingClientRect().right - controls.getBoundingClientRect().right).toBe(5)
})

it('сохраняет компактные абзацы и отделяет кнопки масштаба от прокрутки', async () => {
  const editor = await mountEditor(Array.from({ length: 30 }, (_, index) => `Строка ${index + 1}`).join('\n\n'))
  const paragraphs = editor.querySelectorAll('p')
  const fontSize = parseFloat(getComputedStyle(editor).fontSize)
  expect(paragraphs[1].getBoundingClientRect().top - paragraphs[0].getBoundingClientRect().top)
    .toBeLessThanOrEqual(fontSize * 1.5)
  const frame = editor.closest('[data-content-editor-frame]')!
  const controls = frame.querySelector('[role="group"]')!
  const scrollbar = frame.querySelector('[data-visible]')!
  expect(scrollbar).not.toBeNull()
  expect(scrollbar.getBoundingClientRect().bottom).toBeLessThanOrEqual(controls.getBoundingClientRect().top)
  expect(frame.getBoundingClientRect().right - controls.getBoundingClientRect().right).toBe(5)
})

function Harness({
  children,
  initialValue,
  editorProps = {},
}: {
  children?: ReactNode
  initialValue: string
  editorProps?: Partial<ContentEditorProps>
}) {
  const [value, setValue] = useState(initialValue)

  return (
    <div style={{ width: '28rem', height: '18rem' }}>
      <ContentEditor
        accessibleLabel="Тестовый редактор"
        autoFocus={true}
        fill={true}
        showStructureActions={true}
        {...editorProps}
        value={value}
        onValueChange={setValue}
        onStructuredResourceChange={(source, current, nextValue) => {
          editorProps.onStructuredResourceChange?.(source, current, nextValue)
          setValue(nextValue)
        }}
      />
      <output data-saved-content hidden>{value}</output>
      <button type="button" data-outside>Вне редактора</button>
      {children}
    </div>
  )
}

async function mountEditor(initialValue: string, editorProps: Partial<ContentEditorProps> = {}) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  mounted = { container, root }

  await act(async () => {
    root.render(<Harness initialValue={initialValue} editorProps={editorProps} />)
  })

  await act(async () => {
    await nextFrame()
  })

  return (container.querySelector<HTMLElement>(
    '[contenteditable="true"]',
  ) ?? container.querySelector<HTMLElement>('[role="region"]'))!
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
  it('сохраняет одну рамку, масштаб и форматирование при переходах между просмотром и вводом', async () => {
    const preview = await mountEditor('Выделяемый текст', { renderPreview: true, autoFocus: false })
    const frame = preview.closest<HTMLElement>('[data-content-editor-frame]')!
    const editorRoot = frame.closest<HTMLElement>('[data-content-editor]')!
    const frameHeight = frame.getBoundingClientRect().height

    await act(async () => {
      editorRoot.querySelector<HTMLButtonElement>('button[aria-label^="Увеличить текст"]')!.click()
      preview.click()
      await nextFrame()
    })
    const editor = editorRoot.querySelector<HTMLElement>('[contenteditable="true"]')!
    expect(editor).not.toBeNull()
    expect(editorRoot.querySelector('[data-content-editor-frame]')).toBe(frame)
    expect(frame.getBoundingClientRect().height).toBe(frameHeight)
    expect(editorRoot.style.getPropertyValue('--content-editor-scale')).toBe('1.125em')
    const textNode = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT).nextNode()!

    await act(async () => {
      editor.focus()
      setNativeSelection(textNode, 0, textNode, 10)
      await nextFrame()
    })
    await act(async () => {
      const button = document.querySelector<HTMLButtonElement>('button[aria-label="Полужирный"]')!
      button.focus()
      button.click()
      await nextFrame()
    })
    expect(editorRoot.querySelector('[contenteditable="true"]')).not.toBeNull()
    expect(editor.querySelector('strong')).not.toBeNull()

    await act(async () => {
      mounted!.container.querySelector<HTMLButtonElement>('[data-outside]')!.focus()
      await nextFrame()
    })
    expect(editorRoot.querySelector('[role="region"]')).toBe(frame)
    expect(frame.querySelector('strong')).not.toBeNull()
    expect(mounted!.container.querySelector('[data-saved-content]')!.textContent).toContain('<strong>Выделяемый</strong>')
    expect(editorRoot.style.getPropertyValue('--content-editor-scale')).toBe('1.125em')
    expect(frame.getBoundingClientRect().height).toBe(frameHeight)
  })

  it('сохраняет связанные ресурсы и раскрываемые карточки в общем режиме просмотра', async () => {
    const onStructuredResourceChange = vi.fn()
    const preview = await mountEditor([
      ':::resource[Заряды]{current=0 maximum=2 source=resource:test}',
      'Описание ресурса',
      ':::',
      ':::collapsible[Тактика]',
      'Держаться рядом',
      ':::',
    ].join('\n'), { renderPreview: true, autoFocus: false, onStructuredResourceChange })
    await act(async () => {
      preview.querySelector<HTMLButtonElement>('[data-resource-widget]')!.click()
      await nextFrame()
    })
    await act(async () => {
      Array.from(document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')).find(button => button.textContent === 'Восстановить')!.click()
      await nextFrame()
    })
    expect(preview.querySelector('[data-resource-widget]')!.textContent).toContain('2/2')
    expect(onStructuredResourceChange).toHaveBeenCalledWith('resource:test', 2, expect.stringContaining('current="2"'))
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Закрыть настройки ресурса"]')!.click())
    const details = preview.querySelector('details')!
    await act(async () => details.querySelector('summary')!.click())
    expect(details.open).toBe(true)
    expect(preview.getAttribute('role')).toBe('region')
  })

  it('выполняет броски и показывает ошибку некорректной формулы без перехода к вводу', async () => {
    const preview = await mountEditor('[[roll:1d6+2]] [[roll:2d20 + alert(1)]]', { renderPreview: true, autoFocus: false })
    await act(async () => {
      preview.querySelector<HTMLButtonElement>('button[aria-label="Бросить 1d6+2"]')!.click()
    })
    expect(preview.querySelector('output[aria-live]')!.textContent).toContain('=')
    await act(async () => {
      preview.querySelector<HTMLButtonElement>('button[aria-label="Бросить 2d20 + alert(1)"]')!.click()
    })
    expect(preview.querySelector('output[aria-live]')!.textContent).toContain('Ошибка:')
    expect(preview.getAttribute('role')).toBe('region')
  })

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
    const insertButtons = Array.from(insertToolbar!.querySelectorAll('button'))
    expect(insertButtons.map(button => button.textContent?.trim())).toEqual(['Ресурс', 'Вкладка', 'Предмет'])
    expect(insertButtons[2]).toBeDisabled()
    insertButtons.forEach(button => expect(getComputedStyle(button).fontSize).toBe('10px'))
    expect(insertToolbar!.getBoundingClientRect().left).toBeGreaterThanOrEqual(paragraph!.getBoundingClientRect().left)
    expect(insertToolbar!.getBoundingClientRect().right).toBeLessThanOrEqual(editor.getBoundingClientRect().right)
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

    expect(editor.querySelector('[data-resource-widget]')!.textContent?.trim()).toBe('/')
    expect(editor.textContent).not.toContain(':::')
  })

  it('удерживает меню вставки в узком поле и вставляет вкладку', async () => {
    const editor = await mountEditor('')
    await act(async () => {
      editor.closest<HTMLElement>('[data-content-editor]')!.parentElement!.style.width = '150px'
      editor.focus()
      setNativeSelection(editor.querySelector('p')!, 0)
      window.dispatchEvent(new Event('resize'))
      await nextFrame()
    })
    const toolbar = document.querySelector<HTMLElement>('[aria-label="Вставка содержимого"]')!
    const frame = editor.closest('[data-content-editor-frame]')!.getBoundingClientRect()
    const rect = toolbar.getBoundingClientRect()
    expect(rect.left).toBeGreaterThanOrEqual(frame.left)
    expect(rect.right).toBeLessThanOrEqual(frame.right)
    expect(rect.top).toBeGreaterThanOrEqual(frame.top)
    expect(rect.bottom).toBeLessThanOrEqual(frame.bottom)
    toolbar.querySelectorAll('button').forEach(button => {
      expect(button.getBoundingClientRect().right).toBeLessThanOrEqual(frame.right)
    })
    await act(async () => {
      toolbar.querySelectorAll<HTMLButtonElement>('button')[1].click()
      await nextFrame()
    })
    expect(editor.textContent).toContain('Новая вкладка')
    expect(mounted!.container.querySelector('[data-saved-content]')!.textContent).toContain(':::collapsible[Новая вкладка]')
  })
})
