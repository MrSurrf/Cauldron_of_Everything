import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import '../../../app/styles/global.css'
import '../../../shared/styles/tokens.css'
import type { CreatureFeature, CreatureSection } from '../../../entities/creature'
import { CreatureFeatureSections } from '../../../entities/creature/ui/CreatureFeatureSections'
import { parseFeatureHtml } from '../../../entities/creature/model/creatureDataParsers'
import { StatBlockField } from './StatBlockFields'

let host: HTMLDivElement
let root: Root | undefined

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  host.remove()
})

function FeatureEditor({ initial }: { initial: CreatureFeature }) {
  const [feature, setFeature] = useState(initial)
  return <>
    <StatBlockField field="1" path="Умения и действия" value={feature} onChange={next => setFeature(next as CreatureFeature)} />
    <CreatureFeatureSections entityId="test-creature" sections={[{ id: 'actions', type: 'actions', title: 'Действия', html: '', entries: [feature] }]} />
  </>
}

async function mount(initial: CreatureFeature) {
  root = createRoot(host)
  await act(async () => root!.render(<FeatureEditor initial={initial} />))
}

function richEditor(label = 'Умения и действия: 1: Описание') {
  const editor = host.querySelector<HTMLDivElement>(`[role="textbox"][contenteditable="true"][aria-label="${label}"]`)
  expect(editor, 'Исходная разметка должна редактироваться без преобразования в Markdown').not.toBeNull()
  return editor!
}

async function editHtml(editor: HTMLDivElement, html: string) {
  await act(async () => {
    editor.focus()
    editor.innerHTML = html
    editor.blur()
  })
}

function fieldValue(label: string) {
  const term = Array.from(host.querySelectorAll('article dt')).find(term => term.textContent === label)
  return term?.nextElementSibling?.textContent
}

describe('Стол кампании: сохранность импортированных правил', () => {
  it('пересчитывает атаку и фиксированный урон из изменённого полного текста', async () => {
    const parsed = parseFeatureHtml('<p><strong>Удар.</strong> +5 к попаданию, досягаемость 5 фт., одна цель. Попадание: дробящий урон 4.</p>', 'actions')!
    await mount(parsed.entries[0])

    expect(host.querySelector('input[aria-label$="Бонус атаки"]')).toBeNull()
    const hintId = richEditor().getAttribute('aria-describedby')!
    expect(document.getElementById(hintId)?.textContent).toBe('Урон и параметры атаки изменяются в этом тексте.')
    await editHtml(richEditor(), '<p>+7 к попаданию, досягаемость 10 фт., одна цель. Попадание: дробящий урон 9.</p>')

    expect(fieldValue('Бросок атаки')).toContain('+7')
    expect(fieldValue('Урон')).toContain('9')
    expect(fieldValue('Дальность / область')).toBe('10 фт.')
    expect(host.querySelector('article')?.textContent).not.toContain('+5')
    expect(host.querySelector('article')?.textContent).not.toContain('урон 4')
  })

  it('убирает устаревшие показатели, если они удалены из источника', async () => {
    const parsed = parseFeatureHtml('<p><strong>Удар.</strong> +5 к попаданию, досягаемость 5 фт., одна цель. Попадание: дробящий урон 4.</p>', 'actions')!
    await mount(parsed.entries[0])
    await editHtml(richEditor(), '<p>Цель теряет возможность совершать реакции.</p>')

    expect(fieldValue('Бросок атаки')).toBeUndefined()
    expect(fieldValue('Урон')).toBeUndefined()
    expect(fieldValue('Дальность / область')).toBeUndefined()
    expect(fieldValue('Цель')).toBeUndefined()
    expect(host.querySelector('article')?.textContent).toContain('Цель теряет возможность совершать реакции.')
  })

  it('сохраняет ссылки, списки и таблицы при изменении врождённого колдовства', async () => {
    const parsed = parseFeatureHtml('<p><strong>Врождённое колдовство.</strong> Базовая характеристика — Харизма.</p>' +
      '<p><strong>Неограниченно:</strong> <a href="/encyclopedia/spell/light/" data-entity-id="42">свет</a>.</p>' +
      '<ul><li>Только на себя.</li></ul><table><tbody><tr><th>Уровень</th><td>3</td></tr></tbody></table>', 'traits')!
    await mount(parsed.entries[0])
    const editor = richEditor()
    await editHtml(editor, editor.innerHTML.replace('Харизма', 'Мудрость'))

    const article = host.querySelector('article')!
    const link = article.querySelector('a')!
    expect(link.getAttribute('href')).toBe('/encyclopedia/spell/light/')
    expect(link.dataset.entityId).toBe('42')
    expect(article.querySelector('li')?.textContent).toBe('Только на себя.')
    expect(article.querySelector('th')?.textContent).toBe('Уровень')
    expect(article.querySelector('td')?.textContent).toBe('3')
    expect(article.textContent).toContain('Мудрость')
  })

  it('оставляет независимые показатели редактируемыми у собственной способности', async () => {
    await mount({ id: 'manual', name: 'Собственная атака', description: 'Описание.', attackBonus: 3, damage: [{ formula: '1к6 + 2', type: 'slashing' }] })
    const input = host.querySelector<HTMLInputElement>('input[aria-label$="Бонус атаки"]')!
    expect(input).not.toBeNull()
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '8')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(fieldValue('Бросок атаки')).toContain('+8')
    expect(fieldValue('Урон')).toContain('1к6 + 2')
  })

  it('сохраняет разметку вступления секции при редактировании', async () => {
    const initial: CreatureSection = { id: 'legendary', type: 'legendary-actions', title: 'Легендарные действия', html: '',
      introduction: 'Существо совершает 3 действия.', introductionHtml: '<p>Существо совершает <strong>3</strong> действия.</p>', entries: [] }
    function SectionEditor() {
      const [section, setSection] = useState(initial)
      return <><StatBlockField field="Раздел" value={section} onChange={next => setSection(next as CreatureSection)} />
        <CreatureFeatureSections entityId="test" sections={[section]} /></>
    }
    root = createRoot(host)
    await act(async () => root!.render(<SectionEditor />))
    const editor = richEditor('Раздел: Вступление')
    await editHtml(editor, editor.innerHTML.replace('3', '4'))
    expect(host.querySelector('section strong')?.textContent).toBe('4')
  })

  it('не возвращает исходный HTML после удаления последнего импортированного действия', async () => {
    const html = '<p><strong>Последний удар.</strong> Попадание: дробящий урон 4.</p>'
    const initial: CreatureSection = { id: 'actions', type: 'actions', title: 'Действия', html, ...parseFeatureHtml(html, 'actions')! }
    function SectionEditor() {
      const [section, setSection] = useState(initial)
      return <><StatBlockField field="Раздел" value={section} onChange={next => setSection(next as CreatureSection)} />
        <CreatureFeatureSections entityId="test" sections={[section]} /></>
    }
    root = createRoot(host)
    await act(async () => root!.render(<SectionEditor />))
    expect(host.querySelector('article')?.textContent).toContain('Последний удар')
    const remove = host.querySelector<HTMLButtonElement>('button[aria-label="Удалить: Раздел: Умения и действия 1"]')!
    expect(remove).not.toBeNull()
    await act(async () => remove.click())

    expect(host.querySelector('article')).toBeNull()
    expect(host.querySelector('[role="textbox"][aria-label="Раздел: Содержимое"]')).toBeNull()
    expect(host.textContent).not.toContain('Последний удар')
    expect(host.textContent).not.toContain('дробящий урон 4')
  })
})
