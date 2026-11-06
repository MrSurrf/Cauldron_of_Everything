import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchEncyclopedia } from '../../../entities/encyclopedia'
import { acquireSpellSchool, entrySpellSchool, instanceSpellSchool } from './spellSchool'
import { entryReference } from './library'
import { createInstance, createTable, parseTable, placeCanvasObject, resolveDiagram, serializeTable } from './table'
import { SpellNode } from '../ui/NodeViews'

vi.mock('../../../entities/encyclopedia', () => ({ fetchEncyclopedia: vi.fn() }))
const fetchEntry = vi.mocked(fetchEncyclopedia)
beforeEach(() => fetchEntry.mockReset())

function spellData(school?: string) {
  const table = createTable()
  const object = createInstance({ source: 'encyclopedia', entityId: '202', entityType: 'spell', slug: 'fireball',
    name: 'Огненный шар', facts: [], ...(school ? { school } : {}) }, { x: 0, y: 0 })
  const placed = placeCanvasObject(table, table.activeId, object, object.entity.name)
  return resolveDiagram(placed, placed.diagrams[0]).nodes[0].data
}

describe('школа заклинания на схеме кампании', () => {
  it('переносит школу из выдачи в сохранённый документ и иконку ноды', () => {
    const reference = entryReference({ id: 202, entity_type: 'spell', slug: 'fireball', name: 'Огненный шар', name_en: '',
      summary: { school: 'Эвокация', level: 3 } })
    const table = createTable()
    const object = createInstance(JSON.parse(JSON.stringify(reference)), { x: 0, y: 0 })
    const saved = parseTable(serializeTable(placeCanvasObject(table, table.activeId, object, object.entity.name)))
    const data = resolveDiagram(saved, saved.diagrams[0]).nodes[0].data
    expect(instanceSpellSchool(data)).toBe('Эвокация')
    expect(renderToStaticMarkup(createElement(SpellNode, { title: data.title, summary: data.facts, school: instanceSpellSchool(data) })))
      .toContain('data-icon="spell-evocation"')

    const broken = structuredClone(saved)
    broken.entities[0].reference!.school = {} as string
    expect(() => parseTable(JSON.stringify(broken))).toThrow()
  })

  it('выбирает школу изменённого статблока вместо исходной карточки', () => {
    const data = spellData('Иллюзия')
    data.statBlock = { kind: 'spell', entry: { id: 202, entity_type: 'spell', slug: 'fireball', name: data.title, name_en: '',
      data: { school: 'Некромантия' }, summary: { school: 'Иллюзия' } } }
    expect(instanceSpellSchool(data)).toBe('Некромантия')
    expect(entrySpellSchool({ data: { school: '' }, summary: { school: 'Вызов' } })).toBe('Вызов')
  })

  it('поддерживает старые ноды без школы и делит запрос оригинала', async () => {
    expect(instanceSpellSchool(spellData())).toBeUndefined()
    let resolve!: (value: unknown) => void
    fetchEntry.mockReturnValueOnce(new Promise(done => { resolve = done }))
    const first = acquireSpellSchool('old-spell')
    const second = acquireSpellSchool('old-spell')
    first.release()
    await Promise.resolve()
    expect(fetchEntry).toHaveBeenCalledTimes(1)
    expect(fetchEntry.mock.calls[0][1].aborted).toBe(false)
    resolve({ entity_type: 'spell', data: { school: 'Прорицание' } })
    expect(await second.promise).toBe('Прорицание')
    second.release()
  })
})
