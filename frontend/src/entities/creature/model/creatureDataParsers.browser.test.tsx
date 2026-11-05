import { describe, expect, it } from 'vitest'

import { parseFeatureHtml } from './creatureDataParsers'

describe('сохранность правил при разборе особенностей существа', () => {
  it('отображает фиксированный урон без выдуманной формулы броска', () => {
    const rule = '+5 к попаданию, досягаемость 5 фт., одна цель. Попадание: дробящий урон 4.'
    const parsed = parseFeatureHtml(
      `<p><strong>Безоружный удар.</strong> <em>Рукопашная атака оружием:</em> ${rule}</p>`,
      'actions',
    )

    expect(parsed?.entries).toHaveLength(1)
    expect(parsed?.entries[0]).toMatchObject({
      name: 'Безоружный удар.',
      subtitle: 'Рукопашная атака оружием',
      attackBonus: 5,
      range: '5 фт.',
      target: '1 цель',
      damage: [{ type: 'bludgeoning', average: 4 }],
      description: rule,
    })
    expect(parsed?.entries[0].damage?.[0].formula).toBeUndefined()
    expect(parsed?.entries[0].descriptionHtml).toContain('Попадание: дробящий урон 4.')
  })

  it.each([
    ['Колющий урон 7 (1к8 + 3) плюс урон ядом 3 (1к6).', ['1к8 + 3', '1к6']],
    ['7 (1к8 + 3) колющего урона плюс 3 (1к6) урона ядом.', ['1к8 + 3', '1к6']],
  ])('разбирает несколько типов урона в порядке исходника: %s', (rule, formulas) => {
    const entry = parseFeatureHtml(`<p><strong>Укус.</strong> Попадание: ${rule}</p>`, 'actions')?.entries[0]

    expect(entry?.damage?.map((damage) => damage.formula)).toEqual(formulas)
    expect(entry?.damage?.map((damage) => damage.type)).toEqual(['piercing', 'poison'])
    expect(entry?.description).toContain(rule)
  })

  it('не скрывает неизвестный формат урона, условия и последствия попадания', () => {
    const rule = 'Попадание: урон равен половине хитов цели, и цель становится опутанной. Если цель уже опутана, она теряет сознание.'
    const entry = parseFeatureHtml(`<p><strong>Захват.</strong> ${rule}</p>`, 'actions')?.entries[0]

    expect(entry?.damage).toBeUndefined()
    expect(entry?.description).toBe(rule)
    expect(entry?.descriptionHtml).toContain(rule)
  })

  it('не удаляет дополнительные условия рядом с распознанным уроном', () => {
    const rule = 'Попадание: 7 (1к8 + 3) колющего урона, и цель должна совершить спасбросок Телосложения Сл 13 или стать отравленной.'
    const entry = parseFeatureHtml(`<p><strong>Жало.</strong> ${rule}</p>`, 'actions')?.entries[0]

    expect(entry?.damage).toMatchObject([{ type: 'piercing', average: 7, formula: '1к8 + 3' }])
    expect(entry?.save).toEqual({ ability: 'constitution', dc: 13 })
    expect(entry?.description).toBe(rule)
  })

  it('отделяет длинное условие восстановления и не сливает Лидерство с атакой', () => {
    const parsed = parseFeatureHtml(`<div>
      <p><strong>Безоружный удар.</strong> Попадание: дробящий урон 4.</p>
      <p><strong>Лидерство (перезаряжается после короткого или продолжительного отдыха).</strong> В течение 1 минуты союзники получают 1к4.</p>
    </div>`, 'actions')

    expect(parsed?.entries).toHaveLength(2)
    expect(parsed?.entries[1]).toMatchObject({
      name: 'Лидерство.',
      usage: 'перезаряжается после короткого или продолжительного отдыха',
      description: 'В течение 1 минуты союзники получают 1к4.',
    })
  })

  it('сохраняет группы врождённых заклинаний, ссылки, сноски, списки и таблицы', () => {
    const parsed = parseFeatureHtml(`<div>
      <p>Вступление с <a href="/encyclopedia/spell/mage-hand/" data-entity-id="12">ссылкой</a>.</p>
      <p><strong>Врождённое колдовство.</strong> Базовая характеристика — Харизма.</p>
      <p><strong>Неограниченно:</strong> <a href="/encyclopedia/spell/light/" data-entity-id="42">свет</a><sup>*</sup>.</p>
      <p><em>1/день каждое:</em> <a href="/encyclopedia/spell/fly/">полёт</a>.</p>
      <p><strong>По 2 раза в день:</strong> обнаружение магии.</p>
      <p><strong>1–2-й уровень (4 ячейки):</strong> щит.</p>
      <ul><li>Только на себя.</li></ul>
      <table><tbody><tr><th>Уровень</th><td>3</td></tr></tbody></table>
      <p><strong>Храбрый.</strong> Преимущество против испуга.</p>
    </div>`, 'traits')

    expect(parsed?.entries).toHaveLength(2)
    expect(parsed?.introductionHtml).toContain('data-entity-id="12"')
    const spellcasting = parsed?.entries[0]
    expect(spellcasting?.name).toBe('Врождённое колдовство.')
    expect(spellcasting?.descriptionHtml).toContain('data-entity-id="42"')
    expect(spellcasting?.descriptionHtml).toContain('<sup>*</sup>')
    expect(spellcasting?.descriptionHtml).toContain('<strong>Неограниченно:</strong>')
    expect(spellcasting?.descriptionHtml).toContain('<em>1/день каждое:</em>')
    expect(spellcasting?.descriptionHtml).toContain('<strong>По 2 раза в день:</strong>')
    expect(spellcasting?.descriptionHtml).toContain('<ul><li>Только на себя.</li></ul>')
    expect(spellcasting?.descriptionHtml).toContain('<table>')
    expect(spellcasting?.description).toContain('Только на себя.')
    expect(spellcasting?.description).toContain('Уровень 3')
  })

  it('не создаёт отдельную особенность из выделенного названия заклинания или подписи попадания', () => {
    const parsed = parseFeatureHtml(`<p><strong>Колдовство.</strong> Использует заклинания.</p>
      <p><strong><a href="/encyclopedia/spell/fireball/">Огненный шар</a></strong> (1/день).</p>
      <p><strong>Попадание.</strong> Урон зависит от заклинания.</p>`, 'traits')

    expect(parsed?.entries).toHaveLength(1)
    expect(parsed?.entries[0].descriptionHtml).toContain('Огненный шар')
    expect(parsed?.entries[0].description).toContain('Попадание. Урон зависит от заклинания.')
  })

  it.each([
    '<p><strong>Особенность.</strong> Текст.</p><aside>Неизвестная структура.</aside>',
    'Текст вне абзацев.<p><strong>Особенность.</strong> Текст.</p>',
    'Текст перед обёрткой.<div><p><strong>Особенность.</strong> Текст.</p></div>',
  ])('оставляет неизвестную структуру исходному HTML-представлению', (html) => {
    expect(parseFeatureHtml(html, 'traits')).toBeUndefined()
  })
})
