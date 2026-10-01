import { describe, expect, it } from 'vitest'
import { createCanvasObject, createDiagram, createInstance, createLocation, createTable, moveToLocation, parseTable, placeCanvasObject, removeInstances, serializeTable } from './table'
import type { LibraryReference } from './library'

const reference: LibraryReference = { source: 'encyclopedia', entityId: '42', entityType: 'creature', name: 'Призрак', slug: 'ghost', facts: ['ПО 4'] }
describe('сохранение пространства кампании', () => {
  it('создаёт Entity отдельно от размещения локации и заметки', () => {
    const table = createTable()
    const location = createCanvasObject('location', { x: 75, y: 135 })
    const note = createCanvasObject('note', { x: 420, y: 500 })
    const placed = placeCanvasObject(placeCanvasObject(table, table.activeId, location, 'Крипта'), table.activeId, note, 'Ключ')
    const restored = parseTable(serializeTable(placed))
    expect(restored.entities).toHaveLength(2)
    expect(restored.entities?.map(entity => entity.entityType)).toEqual(['location', 'note'])
    expect(restored.diagrams[0].nodes[0].data.localEntityId).toBe(location.entity.id)
    expect(restored.diagrams[0].nodes[0].id).not.toBe(location.entity.id)
    expect(restored.diagrams[0].nodes[0].position).toEqual({ x: 75, y: 135 })
    expect(restored.diagrams[0].nodes[1].position).toEqual({ x: 420, y: 500 })
    const withoutLocation = removeInstances(restored.diagrams[0], new Set([location.node.id]))
    expect(withoutLocation.nodes).toHaveLength(1)
    expect(restored.entities).toHaveLength(2)
    const second = createDiagram('Другая схема')
    second.nodes = [{ ...restored.diagrams[0].nodes[1], id: crypto.randomUUID(), position: { x: 20, y: 30 } }]
    const shared = parseTable(serializeTable({ ...restored, diagrams: [...restored.diagrams, second] }))
    expect(shared.diagrams[1].nodes[0].data.localEntityId).toBe(note.entity.id)
    expect(placeCanvasObject(restored, table.activeId, createCanvasObject('note', { x: 0, y: 0 }), '')).toBe(restored)
  })
  it('восстанавливает независимые экземпляры, геометрию, подписи и layout', () => {
    const table = createTable()
    const first = table.diagrams[0]
    first.nodes = [createInstance(reference, { x: -125, y: 400 }), createInstance(reference, { x: 1200, y: -20 })]
    first.nodes[0].data.title = 'Раненый призрак'
    first.nodes[0].data.state = '12 хитов'
    first.nodes[0].data.description = 'Секрет мастера'
    first.nodes[0].width = 400
    first.edges = [{ id: 'ab', source: first.nodes[0].id, target: first.nodes[1].id, sourceHandle: 'out', targetHandle: 'in', label: 'Охраняет', data: { description: 'До рассвета' } }]
    first.viewport = { x: 110, y: -40, zoom: 0.75 }
    const second = createDiagram('Подземелье')
    table.diagrams.push(second); table.activeId = second.id
    table.layout = { libraryWidth: 400, inspectorWidth: 500, section: 'spell', query: 'Свет' }
    expect(parseTable(serializeTable(table))).toEqual(table)
    expect(first.nodes[1].data.title).toBe('Призрак')
    first.nodes[0].data.reference!.facts.push('Локальная пометка')
    expect(reference.facts).toEqual(['ПО 4'])
    expect(first.nodes[1].data.reference!.facts).toEqual(['ПО 4'])
  })
  it('не сохраняет временное выделение React Flow', () => {
    const table = createTable()
    table.diagrams[0].nodes.push({ ...createInstance(reference, { x: 0, y: 0 }), selected: true, dragging: true, measured: { width: 260, height: 150 } })
    const restored = parseTable(serializeTable(table)).diagrams[0].nodes[0]
    expect(restored).not.toHaveProperty('selected')
    expect(restored).not.toHaveProperty('dragging')
    expect(restored).not.toHaveProperty('measured')
    expect(restored.width).toBe(260)
  })
  it('мигрирует v1 без потери существ, схем и связей', () => {
    const old = { version: 1, activeId: 'd', diagrams: [{ id: 'd', name: 'Старая схема', viewport: { x: 12, y: 14, zoom: 0.7 }, edges: [],
      nodes: [{ id: 'n', type: 'creature', position: { x: 20, y: -40 }, data: { creature: { id: '42', name: 'Призрак', slug: 'ghost' } } }] }] }
    const migrated = parseTable(JSON.stringify(old))
    expect(migrated.version).toBe(2)
    expect(migrated.diagrams[0].nodes[0].data.reference?.entityId).toBe('42')
    expect(migrated.diagrams[0].nodes[0].position).toEqual({ x: 20, y: -40 })
    expect(migrated.diagrams[0].viewport.zoom).toBe(0.7)
  })
  it('переносит существ между локациями и извлекает, сохраняя экземпляр и связи', () => {
    let diagram = createDiagram()
    const creature = createInstance(reference, { x: 0, y: 0 })
    const a = createLocation({ x: 10, y: 20 }); const b = createLocation({ x: 500, y: 400 })
    diagram.nodes = [a, b, creature]
    diagram.edges = [{ id: 'e', source: creature.id, target: a.id }]
    diagram = moveToLocation(diagram, creature.id, a.id)
    expect(diagram.nodes[2].data.locationId).toBe(a.id)
    diagram = moveToLocation(diagram, creature.id, b.id)
    expect(diagram.nodes[2].data.locationId).toBe(b.id)
    const table = createTable(); table.diagrams = [diagram]; table.activeId = diagram.id
    expect(parseTable(serializeTable(table)).diagrams[0]).toEqual(diagram)
    diagram = moveToLocation(diagram, creature.id)
    expect(diagram.nodes[2].data.locationId).toBeUndefined()
    expect(diagram.nodes[2].id).toBe(creature.id)
    expect(diagram.edges).toHaveLength(1)
  })
  it('не допускает вложенных локаций и заклинаний в контейнере', () => {
    const diagram = createDiagram()
    const a = createLocation({ x: 0, y: 0 }); const b = createLocation({ x: 400, y: 0 })
    const spell = createInstance({ ...reference, entityType: 'spell' }, { x: 0, y: 0 })
    diagram.nodes = [a, b, spell]
    expect(moveToLocation(diagram, a.id, b.id)).toBe(diagram)
    expect(moveToLocation(diagram, spell.id, a.id)).toBe(diagram)
    expect(moveToLocation(diagram, spell.id, 'missing')).toBe(diagram)
  })
  it('при удалении контейнера освобождает содержимое, удаление экземпляра убирает только его связи', () => {
    const diagram = createDiagram()
    const location = createLocation({ x: 0, y: 0 }); const creature = createInstance(reference, { x: 0, y: 0 })
    const other = createInstance(reference, { x: 500, y: 400 })
    creature.data.locationId = location.id
    diagram.nodes = [location, creature, other]
    diagram.edges = [{ id: 'e', source: creature.id, target: other.id }]
    const released = removeInstances(diagram, new Set([location.id]))
    expect(released.nodes).toHaveLength(2)
    expect(released.nodes[0].data.locationId).toBeUndefined()
    expect(released.edges).toHaveLength(1)
    const removed = removeInstances(released, new Set([creature.id]))
    expect(removed.nodes.map(node => node.id)).toEqual([other.id])
    expect(removed.edges).toHaveLength(0)
  })
  it('отклоняет повреждённые ссылки, вложенность и неизвестную версию', () => {
    const table = createTable()
    table.diagrams[0].edges.push({ id: 'broken', source: 'missing', target: 'missing-too' })
    expect(() => parseTable(serializeTable(table))).toThrow()
    expect(() => parseTable(JSON.stringify({ ...createTable(), version: 3 }))).toThrow()
    expect(() => parseTable(JSON.stringify({ ...createTable(), version: '2' }))).toThrow()
    const node = createInstance(reference, { x: 0, y: 0 }); node.data.locationId = 'missing'
    table.diagrams[0].edges = []; table.diagrams[0].nodes = [node]
    expect(() => parseTable(serializeTable(table))).toThrow()
  })
})
