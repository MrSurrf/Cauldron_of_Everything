import { describe, expect, it } from 'vitest'
import { createDiagram, createTable, parseTable, serializeTable } from './table'

describe('сохранение пространства кампании', () => {
  it('восстанавливает отдельные экземпляры Entity, координаты, связи и активную схему', () => {
    const table = createTable()
    const first = table.diagrams[0]
    const creature = { id: '42', slug: 'ghost', name: 'Призрак' }
    first.nodes = [
      { id: 'a', type: 'creature', data: { creature }, position: { x: -125, y: 400 } },
      { id: 'b', type: 'creature', data: { creature }, position: { x: 1200, y: -20 } },
    ]
    first.edges = [{ id: 'ab', source: 'a', target: 'b', sourceHandle: 'out', targetHandle: 'in' }]
    first.viewport = { x: 110, y: -40, zoom: 0.75 }
    const second = createDiagram('Подземелье')
    table.diagrams.push(second)
    table.activeId = second.id
    expect(parseTable(serializeTable(table))).toEqual(table)
  })

  it('не сохраняет выделение и промежуточные размеры React Flow', () => {
    const table = createTable()
    table.diagrams[0].nodes.push({ id: 'a', type: 'creature', position: { x: 0, y: 0 },
      data: { creature: { id: '42', slug: 'ghost', name: 'Призрак' } }, selected: true, dragging: true, measured: { width: 260, height: 60 } })
    const restored = parseTable(serializeTable(table)).diagrams[0].nodes[0]
    expect(restored).not.toHaveProperty('selected')
    expect(restored).not.toHaveProperty('dragging')
    expect(restored).not.toHaveProperty('measured')
  })

  it('отклоняет связи с отсутствующим узлом и неизвестную версию', () => {
    const table = createTable()
    table.diagrams[0].edges.push({ id: 'broken', source: 'missing', target: 'missing-too' })
    expect(() => parseTable(serializeTable(table))).toThrow()
    expect(() => parseTable(JSON.stringify({ ...createTable(), version: 2 }))).toThrow()
  })
})
