import { describe, expect, it } from 'vitest'
import { TableHistory } from './tableHistory'
import { changeDiagram, createCanvasObject, createDiagram, createTable, placeCanvasObject, removeInstances, updateCanvasEntity } from './table'

function fixture() {
  const table = createTable(), object = createCanvasObject('note', { x: 10, y: 20 })
  return placeCanvasObject(table, table.activeId, object, 'Заметка')
}
describe('история графа кампании', () => {
  it('объединяет несколько кадров drag/resize в один шаг и сохраняет Entity/layout', () => {
    const history = new TableHistory()
    const before = fixture()
    history.begin(before)
    let current = before
    for (let step = 1; step <= 8; step++) {
      const next = changeDiagram(current, current.activeId, diagram => ({ ...diagram, nodes: diagram.nodes.map(node => ({ ...node, position: { x: step * 50, y: 30 }, width: 200 + step, height: 100 + step })) }))
      history.record(current, next); current = next
    }
    history.end(current)
    current = updateCanvasEntity(current, current.entities[0].id, { name: 'Новое имя' })
    const undone = history.undo(current)
    expect(undone.diagrams[0].nodes).toEqual(before.diagrams[0].nodes)
    expect(undone.entities[0].name).toBe('Новое имя')
    expect(history.undo(undone)).toBe(undone)
    expect(history.redo(undone).diagrams[0].nodes).toEqual(current.diagrams[0].nodes)
  })
  it('возвращает удалённую ноду и связи, новая операция сбрасывает redo', () => {
    const history = new TableHistory(), before = fixture()
    const second = createCanvasObject('note', { x: 200, y: 20 })
    const table = placeCanvasObject(before, before.activeId, second, 'Вторая')
    table.diagrams[0].edges = [{ id: 'edge', source: table.diagrams[0].nodes[0].id, target: second.node.id, label: 'Связь' }]
    const removed = changeDiagram(table, table.activeId, diagram => removeInstances(diagram, new Set([second.node.id])))
    history.record(table, removed)
    const undone = history.undo(removed)
    expect(undone.diagrams[0]).toEqual(table.diagrams[0])
    const changed = changeDiagram(undone, undone.activeId, diagram => ({ ...diagram, edges: diagram.edges.map(edge => ({ ...edge, label: 'Новая связь' })) }))
    history.record(undone, changed)
    expect(history.redo(changed)).toBe(changed)
    expect(history.undo(changed).diagrams[0].edges[0].label).toBe('Связь')
  })
  it('игнорирует выделение и viewport; истории схем независимы', () => {
    const history = new TableHistory(), before = fixture()
    const selection = changeDiagram(before, before.activeId, diagram => ({ ...diagram, viewport: { x: 40, y: 60, zoom: 0.5 }, nodes: diagram.nodes.map(node => ({ ...node, selected: true, measured: { width: 200, height: 100 } })) }))
    history.record(before, selection)
    expect(history.undo(selection)).toBe(selection)
    const removed = changeDiagram(selection, selection.activeId, diagram => ({ ...diagram, nodes: [] }))
    history.record(selection, removed)
    const second = createDiagram('Вторая')
    const switched = { ...removed, activeId: second.id, diagrams: [...removed.diagrams, second] }
    expect(history.undo(switched)).toBe(switched)
    const back = { ...switched, activeId: before.activeId }
    const restored = history.undo(back)
    expect(restored.diagrams[0].nodes).toHaveLength(1)
    expect(restored.diagrams[0].viewport).toEqual(selection.diagrams[0].viewport)
    expect(restored.diagrams[0].nodes[0]).not.toHaveProperty('selected')
  })
})
