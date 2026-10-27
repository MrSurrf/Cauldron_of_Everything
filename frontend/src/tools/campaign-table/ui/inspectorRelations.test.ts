import { describe, expect, it } from 'vitest'
import { applyDiagramNodeChanges, changeDiagram, createCanvasObject, createDiagram, createTable, moveToLocation, placeCanvasObject, placeExistingEntity, resolveDiagram, updateCanvasEntity } from '../model/table'
import type { CampaignTable } from '../model/table'
import { prepareInspectorRelations } from './inspectorRelations'
import type { InspectorRelations } from './inspectorRelations'

function fixture() {
  let table = createTable()
  const location = createCanvasObject('location', { x: 0, y: 0 })
  const npc = createCanvasObject('npc', { x: 500, y: 0 })
  const item = createCanvasObject('item', { x: 800, y: 0 })
  for (const [object, name] of [[location, 'Замок'], [npc, 'Хранитель'], [item, 'Ключ']] as const) {
    table = placeCanvasObject(table, table.activeId, object, name)
  }
  table = changeDiagram(table, table.activeId, diagram => ({ ...diagram, edges: [
    { id: 'inhabitant', source: location.node.id, target: npc.node.id },
    { id: 'key', source: location.node.id, target: item.node.id },
  ] }))
  const inspect = (current: CampaignTable, previous?: InspectorRelations, nodeId = location.node.id, entityId = location.entity.id) =>
    prepareInspectorRelations(nodeId, entityId, resolveDiagram(current, current.diagrams[0]),
      current.diagrams.map(diagram => resolveDiagram(current, diagram)), current.entities, previous)
  return { table, location, npc, item, inspect }
}

describe('данные wiki-инспектора', () => {
  it('сохраняет граф связей, списки и счётчики на движении, выделении и измерениях', () => {
    const { table, location, npc, inspect } = fixture()
    const before = inspect(table)
    const moved = applyDiagramNodeChanges(table, table.activeId, [
      { type: 'position', id: location.node.id, position: { x: 120, y: 150 }, dragging: true },
      { type: 'select', id: npc.node.id, selected: true },
      { type: 'dimensions', id: npc.node.id, dimensions: { width: 280, height: 200 } },
    ])
    const after = inspect(moved, before)
    expect(after.indexes[0].graph).toBe(before.indexes[0].graph)
    expect(after.members).toBe(before.members)
    expect(after.related).toBe(before.related)
    expect(after.placements).toBe(1)
    expect(after.related.map(entity => entity.name)).toEqual(['Хранитель', 'Ключ'])
  })
  it('обновляет имя связанных страниц и содержимого без устаревших ссылок', () => {
    const { table, location, npc, item, inspect } = fixture()
    const contained = changeDiagram(table, table.activeId, diagram => moveToLocation(diagram, item.node.id, location.node.id))
    const before = inspect(contained)
    expect(before.members.map(member => member.title)).toEqual(['Ключ'])
    expect(before.related.map(entity => entity.name)).toEqual(['Хранитель'])
    const renamedNpc = updateCanvasEntity(contained, npc.entity.id, { name: 'Страж' })
    const next = inspect(renamedNpc, before)
    expect(next.members).toBe(before.members)
    expect(next.related[0].name).toBe('Страж')
    expect(before.related[0].name).toBe('Хранитель')
    const renamedItem = inspect(updateCanvasEntity(renamedNpc, item.entity.id, { name: 'Серебряный ключ' }), next)
    expect(renamedItem.members[0].title).toBe('Серебряный ключ')
    expect(renamedItem.related).toBe(next.related)
  })
  it('различает содержимое выбранных размещений и исключает его из общих связей', () => {
    const { table, location, item, inspect } = fixture()
    const duplicate = placeExistingEntity(table, table.activeId, location.entity.id, { x: 1000, y: 1000 })
    const duplicateId = duplicate.diagrams[0].nodes.at(-1)!.id
    const contained = changeDiagram(duplicate, table.activeId, diagram => moveToLocation(diagram, item.node.id, location.node.id))
    const first = inspect(contained)
    const second = inspect(contained, first, duplicateId)
    expect(first.placements).toBe(2)
    expect(first.members).toHaveLength(1)
    expect(first.related.map(entity => entity.name)).toEqual(['Хранитель'])
    expect(second.members).toHaveLength(0)
    expect(second.related.map(entity => entity.name)).toEqual(['Хранитель', 'Ключ'])
  })
  it('учитывает связи со всех схем, игнорирует их оформление и обновляет удаление ребра', () => {
    const { table, location, npc, item, inspect } = fixture()
    const second = createDiagram('Вторая схема')
    let shared = placeExistingEntity({ ...table, diagrams: [...table.diagrams, second] }, second.id, location.entity.id, { x: 0, y: 0 })
    shared = placeExistingEntity(shared, second.id, npc.entity.id, { x: 200, y: 200 })
    shared = changeDiagram(shared, second.id, diagram => ({ ...diagram,
      edges: [{ id: 'second-link', source: diagram.nodes[0].id, target: diagram.nodes[1].id }],
    }))
    const before = inspect(shared)
    expect(before.placements).toBe(2)
    const styled = changeDiagram(shared, shared.activeId, diagram => ({ ...diagram,
      edges: diagram.edges.map(edge => ({ ...edge, label: 'Подпись', selected: true })),
    }))
    const afterStyle = inspect(styled, before)
    expect(afterStyle.related).toBe(before.related)
    expect(afterStyle.indexes[0].graph).toBe(before.indexes[0].graph)
    const removed = inspect(changeDiagram(styled, styled.activeId, diagram => ({ ...diagram,
      edges: diagram.edges.filter(edge => edge.target !== item.node.id),
    })), afterStyle)
    expect(removed.related.map(entity => entity.id)).toEqual([npc.entity.id])
  })
})
