import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import '../../app/styles/global.css'
import '../../shared/styles/tokens.css'
import { toClassEntity } from './model/classRepository'
import type { ClassEntity, ClassSection, EncyclopediaClassDetail } from './model/classEntity'
import { ClassFullView } from './ui/ClassFullView'
import { borderKeeperClassDetail, fallbackClassDetail, seekerClassDetail, unsafeClassDetail } from './testing/classFixtures'

let host: HTMLDivElement
let root: Root | undefined
let previousUrl: string
let previousHistoryState: unknown
let previousUnsafeFlag: boolean | undefined
const unsafeState = globalThis as typeof globalThis & { __classUnsafeExecuted?: boolean }

function nextFrame() {
  return new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

async function settle() {
  await act(async () => { await nextFrame(); await nextFrame() })
}

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  previousUrl = window.location.href
  previousHistoryState = window.history.state
  previousUnsafeFlag = unsafeState.__classUnsafeExecuted
  unsafeState.__classUnsafeExecuted = false
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
  host = document.createElement('div')
  host.style.width = '1100px'
  host.style.maxWidth = '100%'
  document.body.append(host)
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  host.remove()
  window.history.replaceState(previousHistoryState, '', previousUrl)
  if (previousUnsafeFlag === undefined) delete unsafeState.__classUnsafeExecuted
  else unsafeState.__classUnsafeExecuted = previousUnsafeFlag
})

async function mount(detail: EncyclopediaClassDetail = seekerClassDetail, width = 1100, hash = '') {
  const entity = toClassEntity(detail)
  host.style.width = `${width}px`
  if (hash) window.history.replaceState(null, '', window.location.pathname + window.location.search + `#${hash}`)
  root = createRoot(host)
  await act(async () => {
    root!.render(<MemoryRouter initialEntries={[`/encyclopedia/class/${entity.slug}${hash ? `#${hash}` : ''}`]}><ClassFullView entity={entity} /></MemoryRouter>)
    await document.fonts.ready
    await nextFrame()
  })
  await settle()
  return entity
}

function sectionByTitle(entity: ClassEntity, title: string): ClassSection {
  function find(sections: ClassSection[]): ClassSection | undefined {
    for (const section of sections) {
      if (section.title === title) return section
      const child = find(section.children)
      if (child) return child
    }
  }
  const section = find(entity.sections)
  expect(section, `Раздел «${title}» должен сохраниться при разборе HTML`).toBeDefined()
  return section!
}

function disclosure(section: ClassSection) {
  const target = document.getElementById(section.id)
  expect(target, section.title).not.toBeNull()
  const details = target instanceof HTMLDetailsElement ? target : target!.closest('details') ?? target!.querySelector('details')
  expect(details, section.title).not.toBeNull()
  return details!
}

function expectDisclosurePathOpen(section: ClassSection) {
  for (let element: HTMLElement | null = disclosure(section); element && host.contains(element); element = element.parentElement) {
    if (element instanceof HTMLDetailsElement) expect(element.open, section.title).toBe(true)
  }
}

function allDisclosures() {
  return Array.from(host.querySelectorAll<HTMLDetailsElement>('details[data-class-disclosure]'))
}

function button(label: string) {
  const match = Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find(element => element.textContent?.trim() === label)
  expect(match, `Кнопка «${label}»`).toBeDefined()
  return match!
}

async function click(element: HTMLElement) {
  await act(async () => element.click())
  await settle()
}

function progressionTable() {
  const table = host.querySelector<HTMLTableElement>('table[data-progression="true"]')
  expect(table).not.toBeNull()
  return table!
}

function expectTargetHash(section: ClassSection) {
  const hash = decodeURIComponent(window.location.hash.slice(1))
  expect([section.id, ...section.aliases]).toContain(hash)
}

describe('Страница класса: синтетическая прогрессия и навигация', () => {
  it('разбирает двадцать уровней, составную шапку и дерево с исходными alias-якорями', () => {
    const entity = toClassEntity(seekerClassDetail)
    expect(entity.progression?.rows).toHaveLength(20)
    expect(entity.progression?.headers).toHaveLength(2)
    expect(entity.progression!.headers[0].some(cell => cell.rowSpan === 2)).toBe(true)
    expect(entity.progression!.headers[0].some(cell => cell.colSpan === 3)).toBe(true)
    const traditions = sectionByTitle(entity, 'Пути искателей')
    const horizon = sectionByTitle(entity, 'Путь горизонта')
    const step = sectionByTitle(entity, 'Шаг горизонта')
    expect(traditions.children).toContain(horizon)
    expect(horizon.children).toContain(step)
    expect(step.aliases).toContain('horizon-step')
  })

  it('сохраняет семантическую таблицу с rowspan/colspan, двадцатым уровнем и ссылками в ячейках', async () => {
    const entity = await mount()
    const table = progressionTable()
    expect(table.tHead?.rows).toHaveLength(2)
    expect(table.tBodies[0].rows).toHaveLength(20)
    expect(table.querySelector<HTMLTableCellElement>('thead th[rowspan="2"]')?.rowSpan).toBe(2)
    expect(table.querySelector<HTMLTableCellElement>('thead th[colspan="3"]')?.colSpan).toBe(3)
    expect(table.tBodies[0].rows[19].cells[0].textContent?.trim()).toBe('20')
    const featureLink = Array.from(table.querySelectorAll<HTMLAnchorElement>('tbody a')).find(link => link.textContent?.includes('Шаг горизонта'))
    expect(featureLink).toBeDefined()
    const step = sectionByTitle(entity, 'Шаг горизонта')
    expect([step.id, ...step.aliases]).toContain(decodeURIComponent(featureLink!.hash.slice(1)))
    expect(host.querySelector('h1')?.textContent).toBe('Искатель')
    expect(host.textContent).toContain('Синтетический тестовый набор')
  })

  it('переход из оглавления раскрывает все родительские details вложенной особенности и обновляет hash', async () => {
    const entity = await mount()
    await click(button('Свернуть всё'))
    const step = sectionByTitle(entity, 'Шаг горизонта')
    expect(disclosure(step).open).toBe(false)
    const nav = host.querySelector<HTMLElement>('nav[aria-label="Оглавление класса"]')!
    const link = Array.from(nav.querySelectorAll<HTMLAnchorElement>('a')).find(anchor => anchor.textContent?.trim() === 'Шаг горизонта')
    expect(link).toBeDefined()
    await click(link!)
    expectDisclosurePathOpen(step)
    expectTargetHash(step)
  })

  it('ссылка из ячейки прогрессии раскрывает ту же вложенную особенность', async () => {
    const entity = await mount()
    await click(button('Свернуть всё'))
    const step = sectionByTitle(entity, 'Шаг горизонта')
    const link = Array.from(progressionTable().querySelectorAll<HTMLAnchorElement>('a')).find(anchor => anchor.textContent?.includes('Шаг горизонта'))
    expect(link).toBeDefined()
    await click(link!)
    expectDisclosurePathOpen(step)
    expectTargetHash(step)
  })

  it('при открытии по исходному hash раскрывает родительскую цепочку', async () => {
    const entity = await mount(seekerClassDetail, 1100, 'horizon-step')
    expectDisclosurePathOpen(sectionByTitle(entity, 'Шаг горизонта'))
  })

  it('summary доступен с клавиатуры: Enter открывает и закрывает раздел', async () => {
    const entity = await mount()
    await click(button('Свернуть всё'))
    const details = disclosure(sectionByTitle(entity, 'Умения класса'))
    const summary = details.querySelector<HTMLElement>(':scope > summary')!
    await act(async () => summary.focus())
    expect(document.activeElement).toBe(summary)
    await act(async () => userEvent.keyboard('{Enter}'))
    expect(details.open).toBe(true)
    await act(async () => userEvent.keyboard('{Enter}'))
    expect(details.open).toBe(false)
  })

  it('раскрывает и сворачивает всё дерево, включая вложенные разделы', async () => {
    await mount()
    expect(allDisclosures().length).toBeGreaterThan(3)
    await click(button('Раскрыть всё'))
    expect(allDisclosures().every(details => details.open)).toBe(true)
    await click(button('Свернуть всё'))
    expect(allDisclosures().every(details => !details.open)).toBe(true)
  })

  it('не исполняет небезопасный HTML, обработчики и javascript-ссылки', async () => {
    await mount(unsafeClassDetail)
    await click(button('Раскрыть всё'))
    expect(host.textContent).toContain('Безопасный тестовый текст')
    expect(host.querySelector('script, iframe, object, embed, img[onerror]')).toBeNull()
    for (const element of host.querySelectorAll('*')) {
      expect(Array.from(element.attributes).some(attribute => /^on/i.test(attribute.name))).toBe(false)
    }
    const link = Array.from(host.querySelectorAll<HTMLAnchorElement>('a')).find(anchor => anchor.textContent?.includes('Опасная ссылка'))
    if (link) {
      expect(link.getAttribute('href') ?? '').not.toMatch(/^\s*javascript:/i)
      await click(link)
    }
    expect(unsafeState.__classUnsafeExecuted).toBe(false)
  })

  it('показывает content_text, если HTML и таблица отсутствуют', async () => {
    await mount(fallbackClassDetail)
    expect(host.textContent).toContain('Синтетическое текстовое описание класса без HTML.')
    expect(host.textContent).toContain('Проверка запасного представления.')
    expect(host.querySelector('table[data-progression="true"]')).toBeNull()
  })

  it('на узкой странице прокручивает только таблицу, сохраняя глобальную ширину страницы', async () => {
    await mount(seekerClassDetail, 360)
    const table = progressionTable()
    const scroller = table.closest<HTMLElement>('[role="region"]')
    expect(scroller).not.toBeNull()
    expect(getComputedStyle(scroller!).overflowX).toMatch(/auto|scroll/)
    expect(scroller!.scrollWidth).toBeGreaterThan(scroller!.clientWidth)
    expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth + 1)
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth + 1)
    // Здесь проверяем геометрию, а не длительность общего smooth-scroll перехода.
    await act(async () => { scroller!.scrollTo({ left: scroller!.scrollWidth, behavior: 'instant' }); await nextFrame() })
    expect(scroller!.scrollLeft).toBeGreaterThan(0)
    expect(table.getBoundingClientRect().right).toBeLessThanOrEqual(scroller!.getBoundingClientRect().right + 2)
    expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth + 1)
  })

  it('поддерживает другой класс без заклинаний и не добавляет магические колонки от первого класса', async () => {
    await mount(borderKeeperClassDetail)
    const table = progressionTable()
    expect(host.querySelector('h1')?.textContent).toBe('Страж рубежа')
    expect(table.tBodies[0].rows).toHaveLength(20)
    expect(table.tHead?.rows).toHaveLength(1)
    expect(table.textContent).toContain('Запас стойкости')
    expect(table.textContent).not.toContain('Ячейки заклинаний')
    expect(table.tBodies[0].rows[0].cells).toHaveLength(4)
    expect(host.textContent).toContain('Дозор рубежа')
  })

  it('не вкладывает соседние исходные details друг в друга и сохраняет настоящее вложение', () => {
    const entity = toClassEntity({ ...fallbackClassDetail, content_html: `
      <details id="native-first"><summary>Первый нативный раздел</summary><p>Первое синтетическое описание.</p></details>
      <details id="native-second"><summary>Второй нативный раздел</summary><p>Второе синтетическое описание.</p>
        <details id="native-child"><summary>Настоящий дочерний раздел</summary><p>Дочернее описание.</p></details>
      </details>` })
    expect(entity.sections.map(section => section.title)).toEqual(['Первый нативный раздел', 'Второй нативный раздел'])
    expect(entity.sections[0].children).toHaveLength(0)
    expect(entity.sections[1].children.map(section => section.title)).toEqual(['Настоящий дочерний раздел'])
  })

  it('не оставляет пустой accordion для заголовка извлечённой прогрессии', () => {
    const entity = toClassEntity(seekerClassDetail)
    expect(entity.progression?.rows).toHaveLength(20)
    expect(entity.progression?.title?.toLocaleLowerCase('ru-RU')).toContain('развити')
    const flatten = (sections: ClassSection[]): ClassSection[] => sections.flatMap(section => [section, ...flatten(section.children)])
    expect(flatten(entity.sections).some(section => section.title === 'Развитие Искателя')).toBe(false)
    expect(flatten(entity.sections).some(section => section.blocks.length === 0 && section.children.length === 0)).toBe(false)
  })

  it('дополняет HTML структурированными sections/tables, не дублируя уже показанные описания и таблицы', () => {
    const entity = toClassEntity({ ...fallbackClassDetail, content_html: `
      <p>Основное синтетическое описание.</p><h2 id="existing-feature">Существующее умение</h2><p>Описание без повторов.</p>
      <table><thead><tr><th>Ключ</th><th>Значение</th></tr></thead><tbody><tr><td>A</td><td>1</td></tr></tbody></table>`,
    data: {
      sections: [
        { title: 'Существующее умение', html: '<p>Описание без повторов.</p>' },
        { title: 'Структурированное умение', html: '<p>Только в data.sections.</p>', children: [{ title: 'Дочернее структурированное умение', html: '<p>Тестовый дочерний блок.</p>' }] },
      ],
      tables: [
        { title: 'Дубликат таблицы', headers: ['Ключ', 'Значение'], rows: [['A', '1']] },
        { title: 'Таблица из структуры', headers: ['Свойство', 'Число'], rows: [['Резерв', '2']] },
      ],
    } })
    const flatten = (sections: ClassSection[]): ClassSection[] => sections.flatMap(section => [section, ...flatten(section.children)])
    const sections = flatten(entity.sections)
    const blocks = [...entity.intro, ...sections.flatMap(section => section.blocks)]
    expect(sections.filter(section => section.title === 'Существующее умение')).toHaveLength(1)
    expect(blocks.filter(block => block.type === 'html').map(block => block.html).join(' ')).toContain('Только в data.sections.')
    expect(sections.some(section => section.title === 'Дочернее структурированное умение')).toBe(true)
    expect(blocks.filter(block => block.type === 'table')).toHaveLength(2)
    expect(blocks.filter(block => block.type === 'html').map(block => block.html).join(' ').match(/Описание без повторов\./g)).toHaveLength(1)
  })

  it('понимает исходные tableTitle/class_table/table_header и убирает short-дубли со служебным меню', () => {
    const rows = Array.from({ length: 20 }, (_, index) => `<tr><td>${index + 1}</td><td><a href="#source-feature">Синтетическая способность</a></td><td>1</td><td>2</td></tr>`).join('')
    const entity = toClassEntity({ ...fallbackClassDetail, content_html: `
      <h4 class="tableTitle"><span id="source-table"></span>Тестовая исходная таблица</h4>
      <table class="class_table"><tbody>
        <tr class="table_header"><td rowspan="2"><span class="long">Уровень</span><span class="short">Ур.</span></td><td rowspan="2">Умения</td><td colspan="2">Тестовые значения</td></tr>
        <tr class="table_header"><td>А</td><td>Б</td></tr>${rows}
      </tbody></table>
      <div class="spoiler_head_body"><h3 class="underlined"><span id="source-feature">Синтетическая способность</span></h3><p>Короткое тестовое описание.</p></div>
      <div class="new-article-menu"><a href="#source-feature">Служебное меню источника</a></div>` })
    expect(entity.progression?.rows).toHaveLength(20)
    expect(entity.progression?.headers).toHaveLength(2)
    expect(entity.progression?.title).toBe('Тестовая исходная таблица')
    expect(entity.progression!.headers[0][0].rowSpan).toBe(2)
    expect(entity.progression!.headers[0][2].colSpan).toBe(2)
    expect(entity.progression!.headers[0][0].html).toContain('Уровень')
    expect(entity.progression!.headers[0][0].html).not.toContain('Ур.')
    const feature = sectionByTitle(entity, 'Синтетическая способность')
    expect(feature.aliases).toContain('source-feature')
    expect(entity.progression!.rows[0][1].html).toContain(`#${feature.id}`)
    const content = [...entity.intro, ...entity.sections.flatMap(section => section.blocks)].filter(block => block.type === 'html').map(block => block.html).join(' ')
    expect(content).not.toContain('Служебное меню источника')
  })
})
