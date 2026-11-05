import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchEncyclopedia } from '../../../entities/encyclopedia'
import { acquireItemClassification, entryItemClassification, instanceItemClassification } from './itemClassification'
import { entryReference } from './library'
import { createInstance, createTable, parseTable, placeCanvasObject, resolveDiagram, serializeTable } from './table'
import { ItemNode } from '../ui/NodeViews'

vi.mock('../../../entities/encyclopedia', () => ({ fetchEncyclopedia: vi.fn() }))
const fetchEntry = vi.mocked(fetchEncyclopedia)
beforeEach(() => fetchEntry.mockReset())

function itemData(classification?: string) {
  const table = createTable()
  const object = createInstance({ source: 'encyclopedia', entityId: '101', entityType: 'item', slug: 'sword',
    name: 'Огненный меч', facts: [], ...(classification ? { classification } : {}) }, { x: 0, y: 0 })
  const placed = placeCanvasObject(table, table.activeId, object, object.entity.name)
  return resolveDiagram(placed, placed.diagrams[0]).nodes[0].data
}

describe('вид предмета на схеме кампании', () => {
  it('переносит классификацию и редкость из выдачи через drag-ссылку и сохранённый документ', () => {
    const reference = entryReference({ id: 101, entity_type: 'item', slug: 'sword', name: 'Огненный меч', name_en: '',
      summary: { classification: 'Оружие (длинный меч)', rarity: 'Редкий' } })
    const table = createTable()
    const object = createInstance(JSON.parse(JSON.stringify(reference)), { x: 0, y: 0 })
    const saved = parseTable(serializeTable(placeCanvasObject(table, table.activeId, object, object.entity.name)))
    const data = resolveDiagram(saved, saved.diagrams[0]).nodes[0].data
    expect(instanceItemClassification(data)).toBe('Оружие (длинный меч)')
    expect(data.reference?.rarity).toBe('Редкий')
    const markup = renderToStaticMarkup(createElement(ItemNode, { title: data.title, summary: data.facts, classification: instanceItemClassification(data) }))
    expect(markup).toContain('data-icon="item-weapon"')
    expect(markup).toContain('data-color-mode="inherit"')
    expect(markup).not.toContain('data-item-rarity=')
    const historical = structuredClone(saved)
    delete historical.entities[0].reference!.rarity
    expect(() => parseTable(JSON.stringify(historical))).not.toThrow()
    for (const patch of [{ classification: {} }, { rarity: 3 }]) {
      const broken = structuredClone(saved)
      Object.assign(broken.entities[0].reference!, patch)
      expect(() => parseTable(JSON.stringify(broken))).toThrow()
    }
  })

  it('берёт редкость из полного статблока с резервом на summary', () => {
    const entry = { id: 101, entity_type: 'item', slug: 'sword', name: 'Меч', name_en: '', summary: { rarity: 'Редкий' } }
    expect(entryReference({ ...entry, data: { rarity: ' Легендарный ' } }).rarity).toBe('Легендарный')
    expect(entryReference({ ...entry, data: { rarity: '' } }).rarity).toBe('Редкий')
    expect(entryReference({ ...entry, data: { rarity: 7 }, summary: {} }).rarity).toBeUndefined()
  })

  it('выбирает иконку изменённого статблока вместо вида исходной карточки', () => {
    const data = itemData('Зелье')
    data.statBlock = { kind: 'item', entry: { id: 101, entity_type: 'item', slug: 'sword', name: data.title, name_en: '',
      data: { classification: 'Кольцо' }, summary: { classification: 'Зелье' } } }
    const classification = instanceItemClassification(data)
    expect(classification).toBe('Кольцо')
    expect(renderToStaticMarkup(createElement(ItemNode, { title: data.title, summary: '', classification })))
      .toContain('data-icon="item-ring"')
    expect(entryItemClassification({ summary: { classification: '', item_type: 'Посох' } })).toBe('Посох')
  })

  it('поддерживает старые ноды без вида и делит запрос оригинала между размещениями', async () => {
    const data = itemData()
    expect(instanceItemClassification(data)).toBeUndefined()
    let resolve!: (value: unknown) => void
    fetchEntry.mockReturnValueOnce(new Promise(done => { resolve = done }))
    const first = acquireItemClassification('old-item')
    const second = acquireItemClassification('old-item')
    first.release()
    await Promise.resolve()
    expect(fetchEntry).toHaveBeenCalledTimes(1)
    expect(fetchEntry.mock.calls[0][1].aborted).toBe(false)
    resolve({ entity_type: 'item', data: { classification: 'Свиток' } })
    expect(await second.promise).toBe('Свиток')
    second.release()
    const cached = acquireItemClassification('old-item')
    expect(await cached.promise).toBe('Свиток')
    expect(fetchEntry).toHaveBeenCalledTimes(1)
    cached.release()
  })

  it('отменяет запрос старой карточки после удаления последнего размещения', async () => {
    fetchEntry.mockReturnValueOnce(new Promise(() => {}))
    const request = acquireItemClassification('removed-item')
    request.release()
    await Promise.resolve()
    expect(fetchEntry.mock.calls[0][1].aborted).toBe(true)
  })
})
