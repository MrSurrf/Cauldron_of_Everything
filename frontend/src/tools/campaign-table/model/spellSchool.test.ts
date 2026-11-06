import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchEncyclopedia } from '../../../entities/encyclopedia'
import { acquireSpellTraits, entrySpellSchool, entrySpellTraits, instanceSpellTraits, spellFlag, spellLevel } from './spellSchool'
import { entryReference } from './library'
import { createInstance, createTable, parseTable, placeCanvasObject, resolveDiagram, serializeTable } from './table'
import { SpellNode } from '../ui/NodeViews'

vi.mock('../../../entities/encyclopedia', () => ({ fetchEncyclopedia: vi.fn() }))
const fetchEntry = vi.mocked(fetchEncyclopedia)
beforeEach(() => fetchEntry.mockReset())

function spellData(traits: { school?: string; level?: number | null; ritual?: boolean; concentration?: boolean } = {}) {
  const table = createTable()
  const object = createInstance({ source: 'encyclopedia', entityId: '202', entityType: 'spell', slug: 'fireball',
    name: 'Огненный шар', facts: [], ...traits }, { x: 0, y: 0 })
  const placed = placeCanvasObject(table, table.activeId, object, object.entity.name)
  return resolveDiagram(placed, placed.diagrams[0]).nodes[0].data
}

describe('признаки заклинания на схеме кампании', () => {
  it('переносит признаки из выдачи в сохранённый документ и маркеры ноды', () => {
    const reference = entryReference({ id: 202, entity_type: 'spell', slug: 'fireball', name: 'Огненный шар', name_en: '',
      summary: { school: 'Эвокация', level: 3, ritual: true, concentration: true } })
    const table = createTable()
    const object = createInstance(JSON.parse(JSON.stringify(reference)), { x: 0, y: 0 })
    const saved = parseTable(serializeTable(placeCanvasObject(table, table.activeId, object, object.entity.name)))
    const data = resolveDiagram(saved, saved.diagrams[0]).nodes[0].data
    expect(instanceSpellTraits(data)).toEqual({ school: 'Эвокация', level: 3, ritual: true, concentration: true })
    const markup = renderToStaticMarkup(createElement(SpellNode, { title: data.title, summary: data.facts, ...instanceSpellTraits(data) }))
    expect(markup).toContain('data-icon="spell-evocation"')
    expect(markup).toContain('data-spell-marker="level"')
    expect(markup).toContain('data-consumes-slot="true"')
    expect(markup).toContain('aria-label="Требуется концентрация"')
    expect(markup).toContain('aria-label="Можно сотворить как ритуал"')

    const historical = structuredClone(saved)
    delete historical.entities[0].reference!.level
    delete historical.entities[0].reference!.ritual
    delete historical.entities[0].reference!.concentration
    expect(() => parseTable(JSON.stringify(historical))).not.toThrow()

    for (const patch of [{ school: {} }, { level: '3' }, { ritual: 'yes' }, { concentration: 1 }]) {
      const broken = structuredClone(saved)
      Object.assign(broken.entities[0].reference!, patch)
      expect(() => parseTable(JSON.stringify(broken))).toThrow()
    }
  })

  it('нормализует уровень, флаги и концентрацию из длительности', () => {
    expect(spellLevel(0)).toBe(0)
    expect(spellLevel('3-й уровень')).toBe(3)
    expect(spellLevel('Заговор')).toBe(0)
    expect(spellLevel(-1)).toBeUndefined()
    expect(spellFlag('Да')).toBe(true)
    expect(spellFlag('false')).toBe(false)
    expect(spellFlag('иногда')).toBeUndefined()
    expect(entrySpellTraits({ data: { level: '2', ritual: 'yes', duration: 'Концентрация, до 1 минуты' } }))
      .toEqual({ level: 2, ritual: true, concentration: true })

    const cantrip = renderToStaticMarkup(createElement(SpellNode, {
      title: 'Луч холода', summary: '', level: 0, ritual: false, concentration: false,
    }))
    expect(cantrip).toContain('data-spell-marker="level"')
    expect(cantrip).not.toContain('data-consumes-slot=')
    expect(cantrip).not.toContain('data-spell-marker="ritual"')
    expect(cantrip).not.toContain('data-spell-marker="concentration"')
  })

  it('выбирает признаки изменённого статблока вместо исходной карточки', () => {
    const data = spellData({ school: 'Иллюзия', level: 2, ritual: true, concentration: false })
    data.statBlock = { kind: 'spell', entry: { id: 202, entity_type: 'spell', slug: 'fireball', name: data.title, name_en: '',
      data: { school: 'Некромантия', level: 0, ritual: false, concentration: true },
      summary: { school: 'Иллюзия', level: 2, ritual: true, concentration: false } } }
    expect(instanceSpellTraits(data)).toEqual({ school: 'Некромантия', level: 0, ritual: false, concentration: true })
    expect(entrySpellSchool({ data: { school: '' }, summary: { school: 'Вызов' } })).toBe('Вызов')
  })

  it('поддерживает старые ноды без признаков и делит запрос оригинала', async () => {
    expect(instanceSpellTraits(spellData())).toEqual({})
    let resolve!: (value: unknown) => void
    fetchEntry.mockReturnValueOnce(new Promise(done => { resolve = done }))
    const first = acquireSpellTraits('old-spell')
    const second = acquireSpellTraits('old-spell')
    first.release()
    await Promise.resolve()
    expect(fetchEntry).toHaveBeenCalledTimes(1)
    expect(fetchEntry.mock.calls[0][1].aborted).toBe(false)
    resolve({ entity_type: 'spell', data: { school: 'Прорицание', level: 4, ritual: true, concentration: false } })
    expect(await second.promise).toEqual({ school: 'Прорицание', level: 4, ritual: true, concentration: false })
    second.release()
  })
})
