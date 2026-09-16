import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { userEvent } from 'vitest/browser'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '../../../app/styles/global.css'
import '../../styles/tokens.css'
import { ContentEditor } from './ContentEditor'
import { parseContentSource } from './contentCodec'
import { emptyResource, resourceFromBlock, resourceToSource } from './resourceContent'

let root: Root | undefined
let host: HTMLElement
const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
function Harness({ source, editing }: { source: string; editing: boolean }) {
  const [value, setValue] = useState(source)
  return <div style={{ width: 360, height: 380 }}>
    <ContentEditor accessibleLabel="Текст с виджетами" value={value} onValueChange={setValue}
      renderPreview showStructureActions fill autoFocus={editing}
      evaluateResourceMaximum={expression => expression === '[PROF]*2' ? { value: 4 } : { value: null, error: 'Неизвестная формула' }} />
    <output data-source hidden>{value}</output><button data-outside>Снаружи</button>
  </div>
}
async function mount(source = resourceToSource(emptyResource), editing = false) {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  await act(async () => { root!.render(<Harness source={source} editing={editing} />); await frame() })
  await act(async () => { await frame() })
}
async function click(element: Element) {
  await act(async () => { await userEvent.click(element as HTMLElement); await frame() })
}
function field(label: string) {
  const element = Array.from(document.querySelectorAll('label')).find(e => e.textContent === label)!
  return (element.querySelector('input') ?? document.getElementById(element.htmlFor)) as HTMLInputElement
}
async function fill(label: string, value: string) {
  await act(async () => { await userEvent.fill(field(label), value); await frame() })
}
const button = (text: string) => Array.from(document.querySelectorAll('button')).find(e => e.textContent?.trim() === text)!

beforeEach(() => { (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true })
afterEach(async () => { await act(async () => root?.unmount()); host?.remove(); root = undefined })

describe('Resource widget', () => {
  it('сохраняет настройки пустого ресурса, формулу, отдых и заметку в обоих режимах', async () => {
    await mount('', true)
    await click(document.querySelector('[data-content-editor-toolbar="insert"] button')!)
    const widget = host.querySelector<HTMLElement>('[data-resource-widget]')!
    expect(widget.textContent?.trim()).toBe('/')
    await click(widget)
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    await fill('Название', 'Ресурс 2')
    await fill('Максимум', '[PROF]*2')
    await click(button('Восстановить'))
    await click(field('Долгий отдых'))
    await fill('Заметки', 'Заметка для примера ] "\n:::')
    await click(field('Отображать заметки'))
    expect(host.querySelector('[contenteditable="true"]')).not.toBeNull()
    expect(field('Максимум').value).toBe('[PROF]*2')
    await click(document.querySelector('[aria-label="Закрыть настройки ресурса"]')!)
    expect(widget.textContent).toContain('4/4')
    expect(widget.querySelector('[aria-label="Заметки ресурса"]')).not.toBeNull()
    expect(widget.querySelector('[aria-label="Долгий отдых"]')).not.toBeNull()
    await click(host.querySelector('[data-outside]')!)
    const previewWidget = host.querySelector('[data-resource-widget]')!
    expect(previewWidget.textContent).toContain('Ресурс 2')
    await click(previewWidget)
    expect(field('Заметки').value).toBe('Заметка для примера ] "\n:::')
    expect(field('Максимум').value).toBe('[PROF]*2')
    await click(button('Удалить ресурс'))
    expect(host.querySelector('[data-resource-widget]')).toBeNull()
    expect(host.querySelector('[data-source]')!.textContent?.trim()).toBe('')
  })

  it('показывает ошибку формулы без потери настроек', async () => {
    await mount()
    await click(host.querySelector('[data-resource-widget]')!)
    await fill('Максимум', '[UNKNOWN]')
    expect(button('Восстановить')).toBeDisabled()
    expect(document.querySelector('[role="dialog"]')!.textContent).toContain('Неизвестная формула')
    expect(host.querySelector('[data-source]')!.textContent).toContain('UNKNOWN')
  })

  it('затемняет и блокирует лист, удерживает фокус, закрывается снаружи без нажатия на лист', async () => {
    await mount()
    const outside = host.querySelector<HTMLButtonElement>('[data-outside]')!
    outside.style.cssText = 'position:fixed;right:0;bottom:0'
    let clicks = 0
    outside.addEventListener('click', () => { clicks += 1 })
    const widget = host.querySelector<HTMLElement>('[data-resource-widget]')!
    await click(widget)
    const dialog = document.querySelector<HTMLDialogElement>('dialog')!
    expect(dialog.matches(':modal')).toBe(true)
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(getComputedStyle(dialog, '::backdrop').backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    outside.focus()
    expect(dialog.contains(document.activeElement)).toBe(true)
    await act(async () => {
      button('Удалить ресурс').focus()
      await userEvent.keyboard('{Tab}')
      await frame()
    })
    expect(dialog.contains(document.activeElement)).toBe(true)
    await act(async () => {
      await userEvent.click(outside, { force: true })
      await frame()
    })
    expect(document.querySelector('dialog')).toBeNull()
    expect(clicks).toBe(0)
    await click(outside)
    expect(clicks).toBe(1)
    await click(widget)
    await act(async () => { await userEvent.keyboard('{Escape}'); await frame() })
    expect(document.querySelector('dialog')).toBeNull()
  })

  it('сохраняет одинаковый срез внутренней рамки у узких и многострочных полей', async () => {
    await mount()
    await click(host.querySelector('[data-resource-widget]')!)
    const clips: string[] = []
    for (const label of ['Название', 'Текущее', 'Максимум', 'Заметки']) {
      const control = field(label)
      const fieldFrame = control.closest<HTMLElement>('[class*="root"]')!
      const innerFrame = fieldFrame.firstElementChild!
      const outerClip = getComputedStyle(fieldFrame).clipPath
      const innerClip = getComputedStyle(innerFrame).clipPath
      const outerCut = Number(outerClip.match(/polygon\(([\d.]+)px/)![1])
      const inset = parseFloat(getComputedStyle(innerFrame).top)
      const innerCut = outerCut - inset
      expect(innerClip).toContain(`polygon(${innerCut}px`)
      expect(getComputedStyle(innerFrame, '::before').clipPath).toContain(`polygon(${innerCut - 1}px`)
      expect(innerFrame.getBoundingClientRect().height).toBeGreaterThan(innerCut * 2)
      const guard = fieldFrame.querySelector('[data-text-field-content-guard] > span')
      if (guard) expect(getComputedStyle(guard).clipPath).toBe(innerClip)
      clips.push(innerClip)
    }
    expect(new Set(clips).size).toBe(1)
  })

  it('удаляет ресурс Backspace рядом с текстом и возвращает через Ctrl+Z', async () => {
    await mount(`${resourceToSource(emptyResource)}\n\nПосле`, true)
    const editor = host.querySelector<HTMLElement>('[contenteditable]')!
    const paragraph = editor.querySelector('p')!
    await act(async () => {
      editor.focus()
      const selection = document.getSelection()!
      selection.collapse(paragraph.firstChild!.firstChild, 0)
      document.dispatchEvent(new Event('selectionchange'))
      await frame()
      await userEvent.keyboard('{Backspace}')
      await frame()
    })
    expect(host.querySelector('[data-resource-widget]')).toBeNull()
    expect(editor.textContent).toBe('После')
    await act(async () => { await userEvent.keyboard('{Control>}z{/Control}'); await frame() })
    expect(host.querySelector('[data-resource-widget]')).not.toBeNull()
  })

  it('стирает все виды виджетов вместе с выделенным текстом', async () => {
    await mount(`До\n\n${resourceToSource(emptyResource)}\n\n:::collapsible[Вкладка]\nТекст\n:::\n\n[[roll:1d6]]\n\n---\n\nПосле`, true)
    const editor = host.querySelector<HTMLElement>('[contenteditable]')!
    expect(editor.querySelectorAll('[data-content-widget]')).toHaveLength(4)
    await act(async () => {
      editor.focus()
      await userEvent.keyboard('{Control>}a{/Control}{Backspace}')
      await frame()
    })
    expect(editor.querySelector('[data-content-widget]')).toBeNull()
    expect(host.querySelector('[data-source]')!.textContent).toBe('')
  })

  it('стирает ресурс клавишей Delete перед ним и удаляет остальные кнопкой', async () => {
    await mount(`До\n\n${resourceToSource(emptyResource)}\n\n:::collapsible[Вкладка]\nТекст\n:::\n\n[[roll:1d6]]\n\n---\n\nПосле`, true)
    const editor = host.querySelector<HTMLElement>('[contenteditable]')!
    await act(async () => {
      editor.focus()
      const text = editor.querySelector('p')!.firstChild!.firstChild!
      document.getSelection()!.collapse(text, text.textContent!.length)
      document.dispatchEvent(new Event('selectionchange'))
      await frame()
      await userEvent.keyboard('{Delete}')
      await frame()
    })
    expect(editor.querySelector('[data-resource-widget]')).toBeNull()
    for (const label of ['вкладку', 'бросок', 'разделитель']) {
      await click(editor.querySelector(`[aria-label="Удалить ${label}"]`)!)
    }
    expect(editor.querySelector('[data-content-widget]')).toBeNull()
    expect(editor.textContent).toContain('До')
    expect(editor.textContent).toContain('После')
  })

  it('сохраняет любые символы заметки и формулы при сериализации', () => {
    const value = { ...emptyResource, title: 'Ресурс ] "', maximum: '[PROF]*2', notes: 'строка\n:::\n<em>текст</em> "', showNotes: true }
    const block = parseContentSource(resourceToSource(value))[0]
    expect(block.kind).toBe('resource')
    if (block.kind === 'resource') expect(resourceFromBlock(block)).toEqual(value)
  })
})
