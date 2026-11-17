import { describe, expect, it } from 'vitest'
import { createCanvasObject, resolveNode } from '../model/table'
import type { TableEdge } from '../model/table'
import { projectFlowEdge, projectFlowNode } from './flowProjection'

const display = { expanded: false, hidden: false, linking: false, draft: false }

describe('проекция нод и связей для React Flow', () => {
  it('переиспользует неподвижные ноды и data при перемещении раскрытого существа', () => {
    const object = createCanvasObject('creature', { x: 0, y: 0 })
    const node = resolveNode(object.node, object.entity)
    const options = { ...display, expanded: true, arrivalKey: 42 }
    const before = projectFlowNode(node, options)
    expect(projectFlowNode(node, { ...options })).toBe(before)
    const moved = projectFlowNode({ ...node, position: { x: 20, y: 30 } }, options)
    expect(moved.data).toBe(before.data)
    expect(moved.position).toEqual({ x: 20, y: 30 })
    const collapsed = projectFlowNode(node, display)
    expect(collapsed.width).toBe(180)
    expect(collapsed.data).toBe(node.data)
    expect(collapsed.data.display?.creatureExpanded).toBeUndefined()
  })

  it('не теряет измерения, скрытие и изменение размера', () => {
    const object = createCanvasObject('note', { x: 0, y: 0 })
    const node = { ...resolveNode(object.node, object.entity), width: 400, height: 300 }
    const measured = { width: 400, height: 300 }
    const before = projectFlowNode(node, { ...display, measured })
    expect(before).toMatchObject({ width: 400, height: 300, measured })
    const hidden = projectFlowNode(node, { ...display, measured, hidden: true })
    expect(hidden.hidden).toBe(true)
    expect(hidden).not.toBe(before)
    expect(hidden.data).toBe(before.data)
  })

  it('переиспользует связи, но обновляет выделение, скрытие и содержимое', () => {
    const edge: TableEdge = { id: 'edge', source: 'a', target: 'b' }
    const before = projectFlowEdge(edge, false, false)
    expect(projectFlowEdge(edge, false, false)).toBe(before)
    expect(projectFlowEdge(edge, true, false)).toMatchObject({ selected: true })
    expect(projectFlowEdge(edge, false, true)).toMatchObject({ hidden: true })
    expect(projectFlowEdge({ ...edge, label: 'Новая подпись' }, false, false).label).toBe('Новая подпись')
  })
})
