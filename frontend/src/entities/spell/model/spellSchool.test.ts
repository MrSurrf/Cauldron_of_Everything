import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { getSpellSchool, SPELL_SCHOOL_LABELS, spellSchoolLabel, type SpellSchool } from './spellSchool'
import { SpellSchoolIcon } from '../ui/SpellSchoolIcon'

const canonical: Array<[string, SpellSchool]> = [
  ['Ограждение', 'abjuration'],
  ['Вызов', 'conjuration'],
  ['Прорицание', 'divination'],
  ['Очарование', 'enchantment'],
  ['Воплощение', 'evocation'],
  ['Иллюзия', 'illusion'],
  ['Некромантия', 'necromancy'],
  ['Преобразование', 'transmutation'],
]

describe('школы заклинаний', () => {
  it.each(canonical)('распознаёт %s', (label, school) => {
    expect(getSpellSchool(label)).toBe(school)
    expect(SPELL_SCHOOL_LABELS[school]).toBe(label)
  })

  it.each([
    ['Преграждение', 'abjuration'],
    ['Призыв', 'conjuration'],
    ['Предсказание', 'divination'],
    ['Эвокация', 'evocation'],
    ['Превращение', 'transmutation'],
    ['Трансмутация', 'transmutation'],
    ['school of Enchantment', 'enchantment'],
    ['  ШКОЛА: НЕКРОМАНТИИ  ', 'necromancy'],
    ['Illusion / Иллюзия', 'illusion'],
  ] as Array<[string, SpellSchool]>)('поддерживает алиас %s', (value, school) => {
    expect(getSpellSchool(value)).toBe(school)
    expect(spellSchoolLabel(value)).toBe(SPELL_SCHOOL_LABELS[school])
  })

  it.each(canonical.map(([, school]) => school))('рендерит иконку %s', (school) => {
    const markup = renderToStaticMarkup(createElement(SpellSchoolIcon, { school }))
    expect(markup).toContain(`data-icon="spell-${school}"`)
  })

  it('сохраняет неизвестное название без ложной классификации', () => {
    expect(getSpellSchool('Хрономантия')).toBeUndefined()
    expect(getSpellSchool('constructor')).toBeUndefined()
    expect(spellSchoolLabel('  Хрономантия ')).toBe('Хрономантия')
    expect(renderToStaticMarkup(createElement(SpellSchoolIcon, { school: 'Хрономантия' })))
      .toContain('data-icon="spell-unknown"')
  })
})
