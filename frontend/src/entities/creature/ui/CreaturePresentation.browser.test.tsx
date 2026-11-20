import { act } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '../../../app/styles/global.css'
import '../../../shared/styles/tokens.css'
import type { CreatureFeature, CreatureSection, CreatureSectionType } from '../model/creature'
import { parseFeatureHtml } from '../model/creatureDataParsers'
import { mockTarrasque } from '../model/mockTarrasque'
import { CreatureFeatureSections } from './CreatureFeatureSections'
import { CreatureFullView } from './CreatureFullView'

let host: HTMLDivElement
let root: Root | undefined
let previousTheme: string | null

const action: CreatureFeature = {
  id: 'test-tail',
  name: 'Хвост.',
  subtitle: 'Рукопашная атака оружием',
  usage: 'перезаряжается после короткого или продолжительного отдыха',
  attackBonus: 5,
  save: { ability: 'strength', dc: 13 },
  damage: [{ type: 'bludgeoning', formula: '2к6 + 3', average: 10 }],
  range: '10 фт.',
  target: 'Одно существо Большого или меньшего размера',
  description: 'При попадании цель должна совершить спасбросок, иначе она сбита с ног.',
  effect: 'Существо может повторить спасбросок в конце своего хода.',
  conditions: ['Сбит с ног'],
}

const spellcasting: CreatureSection = {
  id: 'test-spellcasting',
  type: 'traits',
  title: 'Особенности',
  html: '',
  entries: [{
    id: 'test-innate',
    name: 'Врождённое колдовство.',
    description: 'Базовая характеристика заклинаний — Харизма.',
    descriptionHtml: '<p>Базовая характеристика заклинаний — Харизма.</p>' +
      '<p><strong>Неограниченно:</strong> <a href="/encyclopedia/spell/light/" data-entity-id="42">свет</a>.</p>' +
      '<p><em>1/день каждое:</em> <a href="/encyclopedia/spell/fly/" data-entity-id="43">полёт</a>, ' +
      '<a href="/encyclopedia/spell/invisibility/" data-entity-id="44">невидимость</a>.</p>' +
      '<ul><li>Полёт действует только на самого заклинателя.</li></ul>',
  }],
}

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  previousTheme = document.documentElement.getAttribute('data-theme')
  document.documentElement.setAttribute('data-theme', 'dark')
  host = document.createElement('div')
  host.style.maxWidth = '100%'
  document.body.append(host)
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  host.remove()
  if (previousTheme === null) document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', previousTheme)
  vi.restoreAllMocks()
})

async function mount(children: ReactNode, width = 960) {
  host.style.width = `${width}px`
  root = createRoot(host)
  await act(async () => {
    root!.render(children)
    await document.fonts.ready
    await nextFrame()
  })
}

function features(sections: readonly CreatureSection[]) {
  return <CreatureFeatureSections entityId="test-creature" sections={sections} />
}

function featureArticle(name: string) {
  const article = Array.from(host.querySelectorAll<HTMLElement>('article[aria-label]'))
    .find((element) => element.getAttribute('aria-label') === name)
  expect(article, `Особенность «${name}» должна быть доступна по имени`).toBeDefined()
  return article!
}

function field(article: HTMLElement, label: string) {
  const term = Array.from(article.querySelectorAll('dt')).find((element) => element.textContent === label)
  expect(term, `Поле «${label}» должно отображаться`).toBeDefined()
  return term!.nextElementSibling as HTMLElement
}

describe('Бестиарий: особенности, действия и врождённые заклинания', () => {
  it('показывает фиксированный урон исходной атаки без выдуманного броска', async () => {
    const parsed = parseFeatureHtml('<p><strong>Безоружный удар.</strong> ' +
      '<em>Рукопашная атака оружием:</em> +5 к попаданию, досягаемость 5 фт., одна цель. ' +
      'Попадание: дробящий урон 4.</p>', 'test-actions')!
    await mount(features([{ id: 'test-actions', type: 'actions', title: 'Действия', html: '', ...parsed }]))

    const article = featureArticle('Безоружный удар.')
    const damage = field(article, 'Урон')
    expect(damage.textContent).toContain('4')
    expect(damage.textContent).toContain('Дробящий')
    expect(damage.querySelector('button')).toBeNull()
    expect(article.querySelectorAll('button')).toHaveLength(1)
    expect(article.textContent).toContain('Попадание: дробящий урон 4.')
  })

  it('не резервирует пустые поля для текстовых правил и простой атаки', async () => {
    await mount(features([{
      id: 'test-actions', type: 'actions', title: 'Действия', html: '', entries: [
        { id: 'test-multiattack', name: 'Мультиатака.', description: 'Существо совершает две рукопашные атаки.' },
        { id: 'test-strike', name: 'Удар.', description: '', attackBonus: 3, range: '5 фт.' },
      ],
    }]))

    const rule = featureArticle('Мультиатака.')
    expect(rule.querySelector('dl')).toBeNull()
    expect(rule.textContent).toContain('Существо совершает две рукопашные атаки.')
    const strike = featureArticle('Удар.')
    expect(Array.from(strike.querySelectorAll('dt'), (element) => element.textContent))
      .toEqual(['Бросок атаки', 'Дальность / область'])
    expect(strike.textContent).not.toContain('—')
    expect(strike.textContent).not.toContain('Доп. эффект')
  })

  it('сохраняет бросок формулы урона и показывает его результат', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    await mount(features([{ id: 'test-actions', type: 'actions', title: 'Действия', html: '', entries: [action] }]))
    const damage = field(featureArticle('Хвост.'), 'Урон')
    const roll = damage.querySelector<HTMLButtonElement>('button')!
    expect(roll.getAttribute('aria-label')).toContain('2к6 + 3')
    expect(damage.textContent).toContain('в среднем 10')
    await act(async () => roll.click())
    expect(damage.querySelector('output')?.textContent).toContain('= 5')
  })

  it('показывает атаку и спасбросок вместе, а также условия и эффект действия', async () => {
    await mount(features([{ id: 'test-actions', type: 'actions', title: 'Действия', html: '', entries: [action] }]))
    const article = featureArticle('Хвост.')
    expect(field(article, 'Бросок атаки').textContent).toContain('+5')
    const save = field(article, 'Спасбросок цели')
    expect(save.textContent).toContain('Сл 13')
    expect(save.querySelector('button')?.getAttribute('aria-label')).toContain('Сила')
    expect(article.textContent).toContain('Сбит с ног')
    expect(article.textContent).toContain(action.effect)
    expect(article.textContent).toContain(action.usage)
  })

  it('применяет именованные строки к обычным, бонусным, легендарным действиям, реакциям и логову', async () => {
    const types: readonly CreatureSectionType[] = [
      'traits', 'actions', 'bonus-actions', 'reactions', 'legendary-actions', 'lair-actions', 'regional-effects',
    ]
    await mount(features(types.map((type) => ({
      id: `test-${type}`, type, title: `Раздел ${type}`, html: '',
      entries: [{ ...action, id: `${type}-entry`, name: `Способность ${type}.` }],
    }))))

    for (const type of types) {
      const article = featureArticle(`Способность ${type}.`)
      expect(article.querySelector('h3')?.textContent).toBe(`Способность ${type}`)
      expect(field(article, 'Урон').textContent).toContain('2к6 + 3')
      expect(field(article, 'Спасбросок цели').textContent).toContain('Сл 13')
      expect(article.getBoundingClientRect().width).toBeGreaterThan(host.clientWidth * 0.8)
    }
    expect(host.querySelector('table')).toBeNull()
  })

  it('сохраняет ссылки заклинаний и разделяет список по частоте использования', async () => {
    await mount(features([spellcasting]))
    const article = featureArticle('Врождённое колдовство.')
    const links = Array.from(article.querySelectorAll<HTMLAnchorElement>('a'))
    expect(links.map((link) => [link.textContent, link.getAttribute('href'), link.dataset.entityId])).toEqual([
      ['свет', '/encyclopedia/spell/light/', '42'],
      ['полёт', '/encyclopedia/spell/fly/', '43'],
      ['невидимость', '/encyclopedia/spell/invisibility/', '44'],
    ])
    expect(Array.from(article.querySelectorAll('dt'), (element) => element.textContent))
      .toEqual(['Неограниченно', '1/день каждое'])
    expect(article.querySelector('li')?.textContent).toBe('Полёт действует только на самого заклинателя.')
  })

  it('показывает форматирование и ссылки вручную отредактированной особенности', async () => {
    await mount(features([{
      id: 'test-traits', type: 'traits', title: 'Особенности', html: '',
      introduction: '**Общее правило:** особенности действуют постоянно.',
      entries: [{ id: 'test-manual', name: 'Магическая защита.',
        description: '**Преимущество** против [света](/encyclopedia/spell/light/).\n\n- Только при свете.\n- Не действует во сне.',
      }],
    }]))
    const article = featureArticle('Магическая защита.')
    expect(article.querySelector('strong')?.textContent).toBe('Преимущество')
    expect(article.querySelector('a')?.getAttribute('href')).toBe('/encyclopedia/spell/light/')
    expect(article.querySelectorAll('li')).toHaveLength(2)
    expect(article.textContent).not.toContain('**')
    expect(host.querySelector('strong')?.textContent).toBe('Общее правило:')
  })

  it.each([1, 20])('размещает описание из %i абзацев после правил, не сужая действия', async (paragraphs) => {
    await mount(<CreatureFullView entity={{ ...mockTarrasque, sections: [
      { id: 'test-actions', type: 'actions', title: 'Действия', html: '', entries: [action] },
      { id: 'test-description', type: 'description', title: 'Описание',
        html: Array.from({ length: paragraphs }, (_, index) => `<p>Абзац ${index + 1}. История существа и его повадки.</p>`).join(''),
      },
    ] }} />)
    const description = host.querySelector<HTMLElement>('section[aria-label="Описание существа"]')!
    const article = featureArticle('Хвост.')
    expect(description).not.toBeNull()
    expect(description.querySelectorAll('p')).toHaveLength(paragraphs)
    expect(description.getBoundingClientRect().top).toBeGreaterThanOrEqual(article.getBoundingClientRect().bottom)
    expect(article.getBoundingClientRect().width).toBeGreaterThan(host.clientWidth * 0.9)
    const navigation = host.querySelector('nav[aria-label="Разделы существа"]')!
    for (const link of navigation.querySelectorAll<HTMLAnchorElement>('a')) {
      expect(host.querySelector(link.getAttribute('href')!)).not.toBeNull()
    }
  })

  it('не выводит пустую область описания у существа без описания и среды обитания', async () => {
    await mount(<CreatureFullView entity={{ ...mockTarrasque, habitat: [], sections: [
      { id: 'test-actions', type: 'actions', title: 'Действия', html: '', entries: [action] },
    ] }} />)
    expect(host.querySelector('[aria-label="Описание существа"]')).toBeNull()
    expect(featureArticle('Хвост.').getBoundingClientRect().width).toBeGreaterThan(host.clientWidth * 0.9)
  })

  it.each([520, 320])('сохраняет ширину механик и списков заклинаний внутри панели %i px', async (width) => {
    await mount(features([
      { id: 'test-actions', type: 'actions', title: 'Действия', html: '', entries: [action] },
      spellcasting,
    ]), width)

    expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth + 1)
    const bounds = host.getBoundingClientRect()
    for (const element of host.querySelectorAll<HTMLElement>('article, dl, dd, button, a')) {
      const rect = element.getBoundingClientRect()
      expect(rect.left, element.textContent ?? '').toBeGreaterThanOrEqual(bounds.left - 1)
      expect(rect.right, element.textContent ?? '').toBeLessThanOrEqual(bounds.right + 1)
    }
    for (const term of featureArticle('Хвост.').querySelectorAll('dt')) {
      expect(term.getBoundingClientRect().width, term.textContent ?? '').toBeGreaterThan(40)
    }
  })

  it('сохраняет шапку, боевой паспорт, характеристики и инфографику сопротивлений Тараска', async () => {
    await mount(<CreatureFullView entity={mockTarrasque} />)
    expect(host.querySelector('h1')?.textContent).toBe('Тараск')
    expect(host.querySelector('header')?.textContent).toContain('Tarrasque')
    const headings = Array.from(host.querySelectorAll('h2'), (heading) => heading.textContent)
    expect(headings).toContain('Боевой паспорт')
    expect(headings).toContain('Характеристики')
    expect(headings).toContain('Сопротивления, иммунитеты и уязвимости')
    expect(host.querySelector('[aria-label="Класс доспеха 25, природный доспех"]')).not.toBeNull()
    expect(host.querySelector('[data-creature-hp-value]')?.textContent).toBe('676')
    expect(host.querySelectorAll('[data-ability]')).toHaveLength(6)
    expect(host.querySelector('[data-ability="strength"] strong')?.textContent).toBe('30')
    expect(host.querySelectorAll('[data-damage-type]')).toHaveLength(mockTarrasque.damageAffinities.length)
    expect(host.querySelector('[data-damage-type="lightning"]')?.getAttribute('data-physical-state')).toBe('resistance')
    expect(host.querySelector('[data-damage-type="lightning"]')?.getAttribute('data-magical-state')).toBe('immunity')
  })
})
