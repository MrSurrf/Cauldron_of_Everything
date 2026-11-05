import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import '../../app/styles/global.css'
import '../../shared/styles/tokens.css'
import { ArticleEditor } from './ArticleEditor'
import { createArticleDraft, listArticleDrafts, readActiveDraftId, saveActiveDraftId, saveArticleDraft } from './model'

let host: HTMLDivElement | undefined
let root: Root | undefined
let previousAccess: string | null
let previousRefresh: string | null

async function flush(milliseconds = 30) {
  await act(async () => { await new Promise(resolve => window.setTimeout(resolve, milliseconds)) })
}

function input(label: string): HTMLInputElement | HTMLTextAreaElement {
  const element = Array.from(host!.querySelectorAll('label')).find(item => item.textContent?.trim() === label)
  const control = element && host!.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[id="${element.htmlFor}"]`)
  if (!control) throw new Error(`Не найдено поле «${label}»`)
  return control
}

function source(): HTMLTextAreaElement {
  const element = host!.querySelector<HTMLTextAreaElement>('[data-article-source] textarea')
  if (!element) throw new Error('Markdown-редактор не открыт')
  return element
}

function button(label: string, scope: ParentNode = host!): HTMLButtonElement {
  const element = Array.from(scope.querySelectorAll<HTMLButtonElement>('button'))
    .find(item => item.textContent?.trim() === label || item.getAttribute('aria-label') === label
      || item.textContent?.replace(/^◷\s*/u, '').trim() === label)
  if (!element) throw new Error(`Не найдена кнопка «${label}»`)
  return element
}

async function click(element: Element) {
  await act(async () => { await userEvent.click(element) })
  await flush()
}

async function fill(control: HTMLInputElement | HTMLTextAreaElement, value: string) {
  await act(async () => { await userEvent.fill(control, value) })
  await flush()
}

async function mount() {
  host = document.createElement('div')
  host.style.setProperty('--app-viewport-height', '900px')
  document.body.append(host)
  root = createRoot(host)
  await document.fonts.ready
  await act(async () => { root!.render(<ArticleEditor />) })
  for (let attempt = 0; attempt < 100; attempt += 1) {
    await flush()
    if (host!.querySelector('[data-article-source] textarea')) return
  }
  expect(host!.querySelector('[data-article-source] textarea')).not.toBeNull()
}

async function unmount() {
  if (root) await act(async () => root!.unmount())
  host?.remove()
  root = undefined
  host = undefined
}

async function saved() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    await flush()
    if (host!.querySelector('[data-state="saved"]')) return
  }
  expect(host!.querySelector('[data-state="saved"]')?.textContent).toContain('Сохранено в этом браузере')
}

async function select(start: number, end: number) {
  await act(async () => {
    source().focus()
    source().setSelectionRange(start, end)
    source().dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  })
  await flush()
}

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  previousAccess = localStorage.getItem('surveyAuth.access')
  previousRefresh = localStorage.getItem('surveyAuth.refresh')
  localStorage.setItem('surveyAuth.access', `header.${btoa(JSON.stringify({ user_id: `article-workspace-${crypto.randomUUID()}` }))}.signature`)
  localStorage.removeItem('surveyAuth.refresh')
})

afterEach(async () => {
  await unmount()
  if (previousAccess === null) localStorage.removeItem('surveyAuth.access')
  else localStorage.setItem('surveyAuth.access', previousAccess)
  if (previousRefresh === null) localStorage.removeItem('surveyAuth.refresh')
  else localStorage.setItem('surveyAuth.refresh', previousRefresh)
})

describe('Редактор статьи: пользовательские сценарии', () => {
  it('сразу открывает Markdown, сохраняет метаданные и показывает настоящий предпросмотр', async () => {
    await mount()
    expect(source().closest('[data-article-source]')?.hasAttribute('hidden')).toBe(false)
    expect(host!.querySelector('[data-article-preview]')).toBeNull()
    expect(host!.querySelectorAll('[data-article-draft]')).toHaveLength(1)
    expect(button('На модерацию').disabled).toBe(true)
    expect(host!.textContent).toContain('Только в этом браузере')

    await fill(input('Заголовок статьи'), 'Как начать приключение')
    await fill(input('Краткое описание'), 'Первый вечер за игровым столом.')
    await fill(source(), '## Герои\n\n**Смелость** и *воображение*.\n\n- История\n- Кости')
    await click(button('Предпросмотр'))
    const preview = host!.querySelector('[data-article-preview]')!
    expect(preview.querySelector('h1')?.textContent).toBe('Как начать приключение')
    expect(preview.textContent).toContain('Первый вечер за игровым столом.')
    expect(preview.querySelector('h2')?.textContent).toBe('Герои')
    expect(preview.querySelector('strong')?.textContent).toBe('Смелость')
    expect(preview.querySelectorAll('li')).toHaveLength(2)
    expect(source().closest('[data-article-source]')?.hasAttribute('hidden')).toBe(true)
    await click(button('Markdown'))
    expect(source().value).toContain('**Смелость**')
    await saved()
    const drafts = await listArticleDrafts()
    expect(drafts[0].title).toBe('Как начать приключение')
    expect(drafts[0].description).toBe('Первый вечер за игровым столом.')
    expect(drafts[0].markdown).toBe(source().value)
  })

  it('toolbar форматирует выделенный фрагмент и возвращает каретку в исходный текст', async () => {
    await mount()
    await fill(source(), 'До героя после')
    await select(3, 8)
    await click(button('Полужирный (Ctrl+B)'))
    expect(source().value).toBe('До **героя** после')
    expect(document.activeElement).toBe(source())
    expect(source().selectionStart).toBe(5)
    expect(source().selectionEnd).toBe(10)
    await act(async () => { await userEvent.keyboard('мага') })
    await flush()
    expect(source().value).toBe('До **мага** после')
    expect(source().selectionStart).toBe(9)
    expect(source().selectionEnd).toBe(9)
    await saved()
  })

  it('Ctrl+B, Ctrl+I и Ctrl+U работают с выделением, а preview сохраняет форматирование', async () => {
    await mount()
    await fill(source(), 'Герой')
    await select(0, 5)
    await act(async () => { await userEvent.keyboard('{Control>}b{/Control}') })
    await flush()
    expect(source().value).toBe('**Герой**')
    expect(source().selectionStart).toBe(2)
    expect(source().selectionEnd).toBe(7)
    await act(async () => { await userEvent.keyboard('{Control>}i{/Control}') })
    await flush()
    expect(source().value).toBe('***Герой***')
    await act(async () => { await userEvent.keyboard('{Control>}u{/Control}') })
    await flush()
    expect(source().value).toBe('***<u>Герой</u>***')
    expect(source().value.slice(source().selectionStart, source().selectionEnd)).toBe('Герой')
    await click(button('Предпросмотр'))
    const preview = host!.querySelector('[data-article-preview]')!
    expect(preview.querySelector('u')?.textContent).toBe('Герой')
    expect(preview.querySelector('strong')?.textContent).toBe('Герой')
    expect(preview.querySelector('em')?.textContent).toBe('Герой')
    await saved()
  })

  it('новый черновик и быстрое переключение не теряют несохранённые изменения; выбранный черновик восстанавливается', async () => {
    await mount()
    const firstId = host!.querySelector<HTMLElement>('[data-article-draft]')!.dataset.articleDraft!
    await fill(input('Заголовок статьи'), 'Первый замысел')
    await fill(source(), 'Текст первой статьи')
    await click(button('＋ Новый черновик'))
    expect(source().value).toBe('')
    const secondId = host!.querySelector<HTMLElement>('[data-article-draft][aria-current="true"]')!.dataset.articleDraft!
    expect(secondId).not.toBe(firstId)
    await fill(input('Заголовок статьи'), 'Второй замысел')
    await fill(source(), 'Текст второй статьи')
    await click(host!.querySelector(`[data-article-draft="${firstId}"]`)!)
    expect(input('Заголовок статьи').value).toBe('Первый замысел')
    expect(source().value).toBe('Текст первой статьи')
    await saved()
    const stored = await listArticleDrafts()
    expect(stored).toHaveLength(2)
    expect(stored.find(draft => draft.id === secondId)?.markdown).toBe('Текст второй статьи')
    expect(await readActiveDraftId()).toBe(firstId)
    await unmount()
    await mount()
    expect(input('Заголовок статьи').value).toBe('Первый замысел')
    expect(source().value).toBe('Текст первой статьи')
    expect(host!.querySelectorAll('[data-article-draft]')).toHaveLength(2)
    await click(host!.querySelector(`[data-article-draft="${secondId}"]`)!)
    expect(source().value).toBe('Текст второй статьи')
    await saved()
  })

  it('сохраняет время отложенной отправки как ISO локального времени, честно предупреждает и позволяет отменить', async () => {
    await mount()
    await click(button('Отложенная отправка'))
    const dialog = document.querySelector<HTMLDialogElement>('dialog')!
    expect(dialog?.open).toBe(true)
    expect(dialog.textContent).toContain('Автоматическая отправка пока не подключена')
    const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    future.setHours(12, 34, 0, 0)
    const pad = (value: number) => String(value).padStart(2, '0')
    const date = `${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(future.getDate())}`
    await fill(dialog.querySelector<HTMLInputElement>('input[type="date"]')!, date)
    await fill(dialog.querySelector<HTMLInputElement>('input[type="time"]')!, '12:34')
    await click(button('Сохранить дату', dialog))
    expect(document.querySelector('dialog')).toBeNull()
    expect(host!.textContent).toContain('Дата сохранена локально · отправка не подключена')
    expect(button('На модерацию').disabled).toBe(true)
    await saved()
    expect((await listArticleDrafts())[0].scheduledFor).toBe(future.toISOString())
    await unmount()
    await mount()
    const trigger = Array.from(host!.querySelectorAll('button')).find(item => item.textContent?.includes('Дата отправки:'))!
    await click(trigger)
    expect(document.querySelector<HTMLInputElement>('dialog input[type="date"]')!.value).toBe(date)
    expect(document.querySelector<HTMLInputElement>('dialog input[type="time"]')!.value).toBe('12:34')
    await click(button('Убрать дату', document.querySelector('dialog')!))
    await saved()
    expect((await listArticleDrafts())[0].scheduledFor).toBeNull()
    expect(button('Отложенная отправка')).not.toBeNull()
  })

  it('удаляет только после подтверждения и оставляет новый пустой черновик вместо последнего удалённого', async () => {
    const first = { ...createArticleDraft(), title: 'Удаляемый черновик', markdown: 'Не удалять без подтверждения' }
    const second = { ...createArticleDraft(), title: 'Остающийся черновик', markdown: 'Другой текст' }
    await saveArticleDraft(first)
    await saveArticleDraft(second)
    await saveActiveDraftId(first.id)
    await mount()
    await click(button('Удалить текущий черновик'))
    let dialog = document.querySelector('dialog')!
    expect(dialog.textContent).toContain('Отменить удаление не получится')
    await click(button('Отмена', dialog))
    expect(host!.querySelectorAll('[data-article-draft]')).toHaveLength(2)
    expect(source().value).toBe(first.markdown)
    expect(await listArticleDrafts()).toHaveLength(2)
    await click(button('Удалить текущий черновик'))
    dialog = document.querySelector('dialog')!
    await click(button('Удалить черновик', dialog))
    await saved()
    expect(host!.querySelectorAll('[data-article-draft]')).toHaveLength(1)
    expect(input('Заголовок статьи').value).toBe(second.title)
    expect((await listArticleDrafts()).map(draft => draft.id)).toEqual([second.id])
    await click(button('Удалить текущий черновик'))
    await click(button('Удалить черновик', document.querySelector('dialog')!))
    await saved()
    expect(host!.querySelectorAll('[data-article-draft]')).toHaveLength(1)
    expect(input('Заголовок статьи').value).toBe('')
    expect(source().value).toBe('')
    const stored = await listArticleDrafts()
    expect(stored).toHaveLength(1)
    expect(stored[0].id).not.toBe(second.id)
  })
})
