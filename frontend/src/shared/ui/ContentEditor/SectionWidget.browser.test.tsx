import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { userEvent } from 'vitest/browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../../app/styles/global.css'
import '../../styles/tokens.css'
import { ContentEditor } from './ContentEditor'
import { parseContentSource } from './contentCodec'
import { emptySection, sectionFromBlock, sectionToSource } from './sectionContent'
import { emptyResource, resourceToSource } from './resourceContent'
import { emptyItem, itemToSource } from './itemContent'

let root: Root | undefined
let host: HTMLElement
const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
const structuredChange = vi.fn()
function Harness({ source, editing, readOnly }: { source: string; editing: boolean; readOnly: boolean }) {
  const [value, setValue] = useState(source)
  return <div style={{ width: 400, height: 600 }}>
    <ContentEditor accessibleLabel="Документ" value={value} onValueChange={setValue} renderPreview autoFocus={editing} readOnly={readOnly}
      showStructureActions fill evaluateResourceMaximum={expression => ({ value: expression === '[PROF]*2' ? 4 : Number(expression) })}
      onStructuredResourceChange={(...args) => { structuredChange(...args); setValue(args[2]) }} />
    <output data-source hidden>{value}</output><button data-outside>Снаружи</button>
  </div>
}
async function mount(source = sectionToSource(emptySection), editing = false, readOnly = false) {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  await act(async () => { root!.render(<Harness source={source} editing={editing} readOnly={readOnly} />); await frame() })
  await act(async () => { await frame() })
}
async function click(element: Element) { await act(async () => { await userEvent.click(element as HTMLElement); await frame() }) }
async function fill(element: Element, value: string) { await act(async () => { await userEvent.fill(element as HTMLElement, value); await frame() }) }
const saved = () => host.querySelector('[data-source]')!.textContent!
const section = () => host.querySelector('[data-section-widget]')!
const toggle = (element = section()) => element.querySelector('[aria-controls][aria-expanded]')!
beforeEach(() => { (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; structuredChange.mockReset() })
afterEach(async () => { await act(async () => root?.unmount()); host?.remove(); root = undefined })

describe('Раздел с вложенным редактором', () => {
  it('после вставки оставляет меню в пустой строке и не перекрывает предыдущий виджет', async () => {
    await mount()
    await click(toggle())
    const editorRoot = section().querySelector<HTMLElement>('[data-content-editor]')!
    await click(editorRoot.querySelector('[data-content-editor-frame]')!)
    for (let index = 0; index < 3; index += 1) {
      const toolbar = document.querySelector('[data-content-editor-toolbar="insert"]')!
      await click(Array.from(toolbar.querySelectorAll('button')).find(button => button.textContent === 'Ресурс')!)
      const menu = document.querySelector('[data-content-editor-toolbar="insert"]')!
      const widgets = editorRoot.querySelectorAll('[data-resource-widget]')
      expect(widgets).toHaveLength(index + 1)
      const last = widgets[widgets.length - 1]
      expect(menu.getBoundingClientRect().top).toBeGreaterThanOrEqual(last.getBoundingClientRect().bottom)
      expect(menu.getBoundingClientRect().bottom).toBeLessThanOrEqual(editorRoot.getBoundingClientRect().bottom + 1)
    }
    const widgets = editorRoot.querySelectorAll('[data-resource-widget]')
    await click(widgets[widgets.length - 1])
    expect(document.querySelector('dialog')).not.toBeNull()
  })

  it('читает вложенные разделы и ресурсы, сохраняя соседний текст и специальные символы', () => {
    const inner = sectionToSource({ ...emptySection, title: 'Внутри ] "', body: resourceToSource(emptyResource) })
    const source = sectionToSource({ ...emptySection, title: 'Снаружи', body: `До\n\n${inner}\n\nПосле` })
    const blocks = parseContentSource(`${source}\n\nСоседний текст`)
    expect(blocks).toHaveLength(2)
    const outer = blocks[0]
    expect(outer.kind).toBe('collapsible')
    if (outer.kind !== 'collapsible') throw new Error('Нет раздела')
    expect(outer.body.map(block => block.kind)).toEqual(['paragraph', 'collapsible', 'paragraph'])
    const nested = outer.body[1]
    if (nested.kind !== 'collapsible') throw new Error('Нет вложенного раздела')
    expect(sectionFromBlock(nested).title).toBe('Внутри ] "')
    expect(nested.body[0].kind).toBe('resource')
    expect(sectionFromBlock(outer).body).toBe(`До\n\n${inner}\n\nПосле`)
  })

  it('редактирует название в строке, цвет и тег в настройках; сохраняет их при повторном открытии', async () => {
    await mount()
    const title = section().querySelector<HTMLInputElement>('[aria-label="Название раздела"]')!
    const settingsButton = section().querySelector('[aria-label="Настройки раздела"]')!
    const removeButton = section().querySelector('[aria-label="Удалить вкладку"]')!
    expect(settingsButton.querySelector('[data-icon="edit"]')).not.toBeNull()
    expect(removeButton.querySelector('[data-icon="trash"]')).not.toBeNull()
    await fill(title, 'Способности ]')
    await click(settingsButton)
    await fill(document.querySelector('[aria-label="Тег раздела"]')!, 'бой')
    expect(document.querySelector('[aria-label="Удалить раздел"] [data-icon="trash"]')).not.toBeNull()
    await click(document.querySelector('[aria-label="Зелёный"]')!)
    await click(Array.from(document.querySelectorAll('[role="dialog"] button')).find(e => e.textContent === 'Готово')!)
    expect(title.value).toBe('Способности ]')
    expect(section().textContent).toContain('бой')
    await click(toggle())
    expect(section().querySelector('[data-content-editor]')).not.toBeNull()
    await click(toggle())
    await click(section().querySelector('[aria-label="Настройки раздела"]')!)
    expect(document.querySelector('[aria-label="Зелёный"]')!.getAttribute('aria-pressed')).toBe('true')
    expect(saved()).toContain('color="green"')
  })

  it('вставляет ресурс и предмет без возможности добавить вложенную вкладку', async () => {
    await mount(sectionToSource({ ...emptySection, title: 'Внешний' }), true)
    await click(toggle())
    const editorRoot = section().querySelector<HTMLElement>('[data-content-editor]')!
    await click(editorRoot.querySelector('[data-content-editor-frame]')!)
    const editor = editorRoot.querySelector<HTMLElement>('[contenteditable="true"]')!
    expect(editor).not.toBeNull()
    await fill(editor, 'Текст внутри')
    await act(async () => {
      await userEvent.click(editor.lastElementChild as HTMLElement)
      await userEvent.keyboard('{End}{Enter}')
      await frame()
    })
    for (const label of ['Ресурс', 'Предмет']) {
      const toolbar = Array.from(document.querySelectorAll('[data-content-editor-toolbar="insert"]'))
        .find(toolbar => toolbar.getAttribute('data-sections-allowed') !== 'true')!
      expect(toolbar).not.toBeNull()
      expect(Array.from(toolbar.querySelectorAll('button')).map(button => button.textContent?.trim())).toEqual(['Ресурс', 'Предмет'])
      await click(Array.from(toolbar.querySelectorAll('button')).find(button => button.textContent?.trim() === label)!)
    }
    expect(editor.querySelector('[data-section-widget]')).toBeNull()
    expect(editor.querySelector('[data-resource-widget]')).not.toBeNull()
    expect(editor.querySelector('[data-item-widget]')).not.toBeNull()
    await click(host.querySelector('[data-outside]')!)
    expect(saved()).toContain('Текст внутри')
    if (toggle().getAttribute('aria-expanded') !== 'true') await click(toggle())
    expect(section().textContent).toContain('Текст внутри')
    expect(section().querySelector('[data-resource-widget]')).not.toBeNull()
    expect(section().querySelector('[data-item-widget]')).not.toBeNull()
    expect(parseContentSource(saved())).toHaveLength(1)
  })

  it('после повторного раскрытия сразу пишет после ресурса без дополнительного Enter', async () => {
    await mount(sectionToSource({
      ...emptySection,
      title: 'Умения',
      body: resourceToSource({ ...emptyResource, title: 'Заряды', current: 1, maximum: '3' }),
    }))
    await click(toggle())
    const innerRoot = section().querySelector<HTMLElement>('[data-content-editor]')!
    await click(innerRoot.querySelector('[data-content-editor-frame]')!)
    let editor = innerRoot.querySelector<HTMLElement>('[contenteditable="true"]')!
    expect(editor.lastElementChild?.tagName).toBe('P')
    expect(editor.lastElementChild?.textContent).toBe('')
    await act(async () => {
      await userEvent.click(editor.lastElementChild as HTMLElement)
      await userEvent.keyboard('Первая заметка')
      await frame()
    })
    await click(toggle())
    await click(toggle())
    const reopenedRoot = section().querySelector<HTMLElement>('[data-content-editor]')!
    await click(reopenedRoot.querySelector('[data-content-editor-frame]')!)
    editor = reopenedRoot.querySelector<HTMLElement>('[contenteditable="true"]')!
    expect(editor.lastElementChild?.tagName).toBe('P')
    await act(async () => {
      await userEvent.click(editor.lastElementChild as HTMLElement)
      await userEvent.keyboard(' продолжение')
      await frame()
    })
    expect(saved()).toContain('Первая заметка продолжение')
  })

  it('удаляет последовательные виджеты обычным Backspace из строки после них', async () => {
    await mount([
      resourceToSource(emptyResource),
      itemToSource(emptyItem),
      sectionToSource({ ...emptySection, title: 'Последний раздел' }),
    ].join('\n\n'), true)
    const editor = host.querySelector<HTMLElement>('[contenteditable="true"]')!
    const paragraph = editor.lastElementChild!
    expect(paragraph.tagName).toBe('P')
    for (const expectedCount of [2, 1, 0]) {
      await act(async () => {
        editor.focus()
        document.getSelection()!.collapse(paragraph, 0)
        document.dispatchEvent(new Event('selectionchange'))
        await frame()
        await userEvent.keyboard('{Backspace}')
        await frame()
      })
      expect(editor.querySelectorAll('[data-content-widget]')).toHaveLength(expectedCount)
    }
    await act(async () => { await userEvent.keyboard('{Control>}z{/Control}'); await frame() })
    expect(editor.querySelectorAll('[data-content-widget]')).toHaveLength(1)
  })

  it('удаляет блочные и строчный виджеты клавишей Delete перед ними', async () => {
    await mount([
      'До',
      resourceToSource(emptyResource),
      itemToSource(emptyItem),
      sectionToSource({ ...emptySection, title: 'Раздел' }),
    ].join('\n\n'), true)
    const editor = host.querySelector<HTMLElement>('[contenteditable="true"]')!
    const paragraph = editor.querySelector('p')!
    for (const expectedCount of [2, 1, 0]) {
      await act(async () => {
        editor.focus()
        const text = paragraph.firstChild!.firstChild!
        document.getSelection()!.collapse(text, text.textContent!.length)
        document.dispatchEvent(new Event('selectionchange'))
        await frame()
        await userEvent.keyboard('{Delete}')
        await frame()
      })
      expect(editor.querySelectorAll('[data-content-widget]')).toHaveLength(expectedCount)
    }

    await act(async () => {
      const source = 'До [[roll:1d6]] После'
      root!.render(<Harness key="inline-roll" source={source} editing={true} readOnly={false} />)
      await frame()
    })
    const inlineEditor = host.querySelector<HTMLElement>('[contenteditable="true"]')!
    const text = inlineEditor.querySelector('p')!.firstChild!.firstChild!
    await act(async () => {
      inlineEditor.focus()
      document.getSelection()!.collapse(text, text.textContent!.length)
      document.dispatchEvent(new Event('selectionchange'))
      await frame()
      await userEvent.keyboard('{Delete}')
      await frame()
    })
    expect(inlineEditor.querySelector('[data-content-widget]')).toBeNull()
  })

  it('увеличивает высоту внутреннего поля вместе с текстом и виджетами', async () => {
    await mount(sectionToSource({ ...emptySection, title: 'Растущий раздел', body: 'Строка' }))
    await click(toggle())
    const innerRoot = section().querySelector<HTMLElement>('[data-content-editor]')!
    const initialHeight = innerRoot.getBoundingClientRect().height
    await click(innerRoot.querySelector('[data-content-editor-frame]')!)
    const editor = innerRoot.querySelector<HTMLElement>('[contenteditable="true"]')!
    await fill(editor, Array.from({ length: 12 }, (_, index) => `Строка ${index + 1}`).join('\n'))
    expect(innerRoot.getBoundingClientRect().height).toBeGreaterThan(initialHeight)
    expect(innerRoot.getBoundingClientRect().height).toBeGreaterThanOrEqual(editor.scrollHeight)
  })

  it('сохраняет формулу связанного ресурса внутри двух разделов в полном документе', async () => {
    const resource = resourceToSource({ ...emptyResource, title: 'Заряды', maximum: '[PROF]*2', current: 0 }, { source: 'resource:test' })
    const nested = sectionToSource({ ...emptySection, title: 'Внутри', body: resource })
    await mount(`До\n\n${sectionToSource({ ...emptySection, title: 'Снаружи', body: nested })}\n\nПосле`, true)
    await click(toggle())
    const inner = section().querySelector('[data-section-widget]')!
    await click(toggle(inner))
    await click(inner.querySelector('[data-resource-widget]')!)
    await click(Array.from(document.querySelectorAll('dialog button')).find(button => button.textContent === 'Восстановить')!)
    expect(structuredChange).toHaveBeenCalledWith('resource:test', 4, expect.stringMatching(/^До[\s\S]+После$/), expect.objectContaining({ maximum: '[PROF]*2' }))
    await click(document.querySelector('[aria-label="Закрыть настройки ресурса"]')!)
    expect(inner.querySelector('[data-resource-widget]')!.textContent).toContain('4/4')
  })

  it('удаляет раздел со всем содержимым и восстанавливает через отмену', async () => {
    await mount(`${sectionToSource({ ...emptySection, body: itemToSource(emptyItem) })}\n\nПосле`, true)
    await click(section().querySelector('[aria-label="Удалить вкладку"]')!)
    expect(host.querySelector('[data-section-widget]')).toBeNull()
    expect(saved()).toBe('После')
    await act(async () => { await userEvent.keyboard('{Control>}z{/Control}'); await frame() })
    expect(host.querySelector('[data-section-widget]')).not.toBeNull()
    await click(toggle())
    expect(section().querySelector('[data-item-widget]')).not.toBeNull()
  })

  it('редактирует карточку предмета внутри раздела и удаляет её без удаления раздела', async () => {
    await mount(sectionToSource({ ...emptySection, body: itemToSource(emptyItem) }))
    await click(toggle())
    await click(section().querySelector('[data-item-widget]')!)
    const input = (name: string) => {
      const label = Array.from(document.querySelectorAll('dialog label')).find(label => label.textContent === name) as HTMLLabelElement
      return document.getElementById(label.htmlFor)!
    }
    await fill(input('Название предмета'), 'Верёвка')
    await fill(input('Количество'), '2')
    await fill(input('Описание предмета'), 'Длина 15 метров')
    await click(Array.from(document.querySelectorAll('dialog button')).find(button => button.textContent === 'Готово')!)
    expect(section().querySelector('[data-item-widget]')!.textContent).toContain('Верёвка× 2')
    await click(section().querySelector('[data-item-widget]')!)
    expect((input('Описание предмета') as HTMLTextAreaElement).value).toBe('Длина 15 метров')
    await click(Array.from(document.querySelectorAll('dialog button')).find(button => button.textContent === 'Удалить предмет')!)
    expect(section().querySelector('[data-item-widget]')).toBeNull()
    expect(parseContentSource(saved())[0].kind).toBe('collapsible')
  })

  it('в режиме чтения разрешает раскрытие, но запрещает редактирование содержимого', async () => {
    await mount(sectionToSource({ ...emptySection, title: 'Только чтение', body: 'Текст' }), false, true)
    expect(section().querySelector<HTMLInputElement>('[aria-label="Название раздела"]')!.readOnly).toBe(true)
    expect(section().querySelector('[aria-label="Настройки раздела"]')).toBeNull()
    await click(toggle())
    await click(section().querySelector('[data-content-editor-frame]')!)
    expect(section().querySelector('[contenteditable="true"]')).toBeNull()
  })
})
