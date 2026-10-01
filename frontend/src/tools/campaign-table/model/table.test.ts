import { describe, expect, it } from 'vitest'
import { changeDiagram, createCanvasObject, createDiagram, createInstance, createTable, duplicatePlacement, moveToLocation, NODE_ENTITY_TYPES, parseTable, placeCanvasObject, placeExistingEntity, removeInstances, resolveDiagram, serializeTable, updateCanvasEntity } from './table'
import type { LibraryReference } from './library'

const reference: LibraryReference = { source: 'encyclopedia', entityId: '42', entityType: 'creature', name: 'Призрак', slug: 'ghost', facts: ['ПО 4'] }
function fixture() {
  let table = createTable()
  const a = createCanvasObject('location', { x: 10, y: 20 })
  const b = createCanvasObject('location', { x: 500, y: 400 })
  const creature = createInstance(reference, { x: 100, y: 200 })
  for (const object of [a, b, creature]) table = placeCanvasObject(table, table.activeId, object, object.entity.name || 'Крипта')
  return { table, a, b, creature }
}
describe('нормализованный документ кампании', () => {
  it.each(NODE_ENTITY_TYPES)('поддерживает %s отдельно от размещения', type => {
    const table = createTable(), object = createCanvasObject(type, { x: 75, y: 135 })
    const restored = parseTable(serializeTable(placeCanvasObject(table, table.activeId, object, 'Объект')))
    expect(restored.entities[0].entityType).toBe(type)
    expect(restored.diagrams[0].nodes[0].data).toEqual({ entityId: object.entity.id })
    expect(restored.diagrams[0].nodes[0].id).not.toBe(object.entity.id)
    expect(restored.diagrams[0].nodes[0].position).toEqual({ x: 75, y: 135 })
  })
  it('разделяет одну Entity между схемами, редактирует содержимое без изменения размещений', () => {
    const { table, creature } = fixture()
    const second = createDiagram('Другая схема')
    const shared = placeExistingEntity({ ...table, diagrams: [...table.diagrams, second] }, second.id, creature.entity.id, { x: -90, y: 40 })
    const updated = changeDiagram(shared, shared.activeId, diagram => ({ ...diagram, nodes: diagram.nodes.map(node => node.id === creature.node.id
      ? { ...node, data: { ...node.data, title: 'Хранитель', state: '12 хитов' } } : node) }))
    expect(updated.entities).toHaveLength(3)
    expect(updated.entities[2]).toMatchObject({ name: 'Хранитель', state: '12 хитов' })
    expect(updated.diagrams).toEqual(shared.diagrams)
    expect(resolveDiagram(updated, updated.diagrams[1]).nodes[0].data.title).toBe('Хранитель')
    expect(parseTable(serializeTable(updated))).toEqual(updated)
  })
  it('сохраняет независимые экземпляры из библиотеки и их оригинал', () => {
    const { table, creature } = fixture()
    const copied = duplicatePlacement(table, table.activeId, creature.node.id)
    const duplicate = copied.diagrams[0].nodes.at(-1)!
    const edited = updateCanvasEntity(copied, duplicate.data.entityId, { name: 'Другой', state: 'Ранен' })
    expect(duplicate.data.entityId).not.toBe(creature.entity.id)
    expect(edited.entities.find(entity => entity.id === creature.entity.id)?.name).toBe('Призрак')
    expect(edited.entities.at(-1)?.reference).toEqual(reference)
    expect(reference.name).toBe('Призрак')
    expect(reference.facts).toEqual(['ПО 4'])
    expect(duplicatePlacement(table, table.activeId, table.diagrams[0].nodes[0].id).entities).toHaveLength(3)
  })
  it('переносит экземпляры между локациями и освобождает их при удалении контейнера', () => {
    const { table, a, b, creature } = fixture()
    let diagram = resolveDiagram(table, table.diagrams[0])
    diagram.edges = [{ id: 'e', source: creature.node.id, target: a.node.id, label: 'Охраняет' }]
    diagram = moveToLocation(diagram, creature.node.id, a.node.id)
    expect(diagram.nodes[2].data.locationId).toBe(a.node.id)
    diagram = moveToLocation(diagram, creature.node.id, b.node.id)
    expect(diagram.nodes[2].data.locationId).toBe(b.node.id)
    expect(moveToLocation(diagram, a.node.id, b.node.id)).toBe(diagram)
    const released = removeInstances(diagram, new Set([b.node.id]))
    expect(released.nodes[1].data.locationId).toBeUndefined()
    expect(released.edges).toHaveLength(1)
    expect(removeInstances(released, new Set([creature.node.id])).edges).toHaveLength(0)
    expect(table.entities).toHaveLength(3)
  })
  it('сохраняет геометрию, связи, viewport, но не временный view model', () => {
    const { table, a, creature } = fixture()
    const updated = changeDiagram(table, table.activeId, diagram => ({ ...diagram,
      nodes: diagram.nodes.map(node => ({ ...node, position: { x: -100, y: 420 }, width: 300, height: 210, selected: true, dragging: true, measured: { width: 300, height: 210 } })),
      edges: [{ id: 'e', source: a.node.id, target: creature.node.id, label: 'Подпись', data: { description: 'До рассвета' } }], viewport: { x: 110, y: -40, zoom: 0.75 } }))
    const restored = parseTable(serializeTable(updated))
    expect(restored.diagrams[0].nodes[0]).toMatchObject({ position: { x: -100, y: 420 }, width: 300, height: 210, data: { entityId: a.entity.id } })
    expect(restored.diagrams[0].nodes[0]).not.toHaveProperty('selected')
    expect(restored.diagrams[0].nodes[0]).not.toHaveProperty('measured')
    expect(restored.diagrams[0].nodes[0].data).not.toHaveProperty('title')
    expect(restored.diagrams[0].edges).toEqual(updated.diagrams[0].edges)
    expect(restored.diagrams[0].viewport).toEqual(updated.diagrams[0].viewport)
  })
  it('мигрирует v1 и не смешивает playerCharacter с NPC', () => {
    const old = { version: 1, activeId: 'd', diagrams: [{ id: 'd', name: 'Старая схема', viewport: { x: 12, y: 14, zoom: 0.7 }, edges: [],
      nodes: [{ id: 'n', type: 'creature', position: { x: 20, y: -40 }, data: { creature: { id: '42', name: 'Призрак', slug: 'ghost' } } }] }] }
    const migrated = parseTable(JSON.stringify(old))
    expect(migrated.version).toBe(3)
    expect(migrated.entities[0].reference?.entityId).toBe('42')
    expect(migrated.diagrams[0].nodes[0].position).toEqual({ x: 20, y: -40 })
    expect(migrated.diagrams[0].viewport.zoom).toBe(0.7)
    expect(createInstance({ ...reference, entityType: 'character' }, { x: 0, y: 0 }).entity.entityType).toBe('playerCharacter')
    expect(createInstance({ ...reference, entityType: 'npc' }, { x: 0, y: 0 }).entity.entityType).toBe('npc')
  })
  it('мигрирует v2: Entity, независимые существа, содержимое, размеры и связи', () => {
    const data = { title: 'Изменённое имя', description: 'Секрет', facts: 'ПО 4', state: 'Ранен', reference }
    const old = { ...createTable(), version: 2, activeId: 'd', entities: [{ id: 'local', slug: 'local', entityType: 'location', name: 'Настоящее имя', description: 'Описание' }], diagrams: [
      { id: 'd', name: 'Схема', viewport: { x: 0, y: 0, zoom: 1 }, nodes: [
        { id: 'a', type: 'location', position: { x: 10, y: 20 }, width: 340, height: 260, data: { title: 'Старое имя', description: '', facts: '', state: '', localEntityId: 'local' } },
        { id: 'b', type: 'entity', position: { x: -30, y: 40 }, width: 300, height: 180, data: { ...data, locationId: 'a' } },
        { id: 'c', type: 'entity', position: { x: 80, y: 90 }, data },
      ], edges: [{ id: 'e', source: 'a', target: 'b', sourceHandle: 'out', targetHandle: 'in', label: 'Охраняет' }] },
    ] }
    const migrated = parseTable(JSON.stringify(old))
    expect(migrated.entities).toHaveLength(3)
    expect(migrated.entities[0].name).toBe('Настоящее имя')
    expect(migrated.entities[1]).toMatchObject({ name: data.title, description: data.description, state: data.state })
    expect(migrated.entities[1].id).not.toBe(migrated.entities[2].id)
    expect(migrated.diagrams[0].nodes[1]).toMatchObject({ position: { x: -30, y: 40 }, width: 300, height: 180, data: { locationId: 'a' } })
    expect(migrated.diagrams[0].edges[0].label).toBe('Охраняет')
    expect(parseTable(serializeTable(migrated))).toEqual(migrated)
  })
  it('отклоняет повреждённые ссылки, содержательные данные в ноде и неизвестные версии', () => {
    const { table } = fixture()
    const broken = structuredClone(table)
    broken.diagrams[0].nodes[0].data.entityId = 'missing'
    expect(() => parseTable(JSON.stringify(broken))).toThrow()
    expect(() => parseTable(JSON.stringify({ ...table, version: 4 }))).toThrow()
    Object.assign(table.diagrams[0].nodes[0].data, { title: 'Недопустимая копия' })
    expect(() => parseTable(JSON.stringify(table))).toThrow()
    const invalidEdge = createTable(); invalidEdge.diagrams[0].edges = [{ id: 'x', source: 'missing', target: 'missing-too' }]
    expect(() => parseTable(serializeTable(invalidEdge))).toThrow()
  })
})
