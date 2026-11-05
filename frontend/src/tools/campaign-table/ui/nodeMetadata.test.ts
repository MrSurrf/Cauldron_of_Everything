import { describe, expect, it } from 'vitest'
import { createCanvasObject, resolveNode } from '../model/table'
import type { TableNode } from '../model/table'
import { indexContainerMembers, stableDiagramMetadata } from './nodeMetadata'

function member(id: string, title: string, containerId?: string, locationId?: string): TableNode {
  const { node, entity } = createCanvasObject('item', { x: 0, y: 0 })
  const resolved = resolveNode(node, { ...entity, name: title })
  return { ...resolved, id, data: { ...resolved.data, containerId, locationId } }
}

describe('метаданные нод', () => {
  it('сохраняет ссылки индекса и содержимого при движении, выделении и ресайзе', () => {
    const nodes = [member('shield', 'Щит', 'character'), member('key', 'Ключ', undefined, 'castle'), member('free', 'Сумка')]
    const before = indexContainerMembers(nodes)
    const moved = nodes.map(node => ({ ...node, position: { x: 100, y: 200 }, selected: true, width: 300, height: 200,
      data: { ...node.data, description: 'Изменённое описание' } }))
    expect(indexContainerMembers(moved, before)).toBe(before)
    expect(before.get('character')).toEqual([{ id: 'shield', title: 'Щит' }])
    expect(before.get('castle')).toEqual([{ id: 'key', title: 'Ключ' }])
    expect(before.size).toBe(2)
  })

  it('обновляет название только в нужном контейнере', () => {
    const nodes = [member('shield', 'Щит', 'character'), member('key', 'Ключ', 'castle')]
    const before = indexContainerMembers(nodes)
    const next = indexContainerMembers([{ ...nodes[0], data: { ...nodes[0].data, title: 'Башенный щит' } }, nodes[1]], before)
    expect(next).not.toBe(before)
    expect(next.get('character')).toEqual([{ id: 'shield', title: 'Башенный щит' }])
    expect(next.get('castle')).toBe(before.get('castle'))
    expect(before.get('character')).toEqual([{ id: 'shield', title: 'Щит' }])
  })

  it('обновляет вложение и удаляет опустевший контейнер, сохраняя порядок', () => {
    const nodes = [member('shield', 'Щит', 'character'), member('key', 'Ключ', 'castle')]
    const before = indexContainerMembers(nodes)
    const next = indexContainerMembers([{ ...nodes[0], data: { ...nodes[0].data, containerId: 'castle' } }, nodes[1]], before)
    expect(next.has('character')).toBe(false)
    expect(next.get('castle')).toEqual([{ id: 'shield', title: 'Щит' }, { id: 'key', title: 'Ключ' }])
    const reordered = indexContainerMembers([nodes[1], { ...nodes[0], data: { ...nodes[0].data, containerId: 'castle' } }], next)
    expect(reordered.get('castle')?.map(node => node.id)).toEqual(['key', 'shield'])
    expect(indexContainerMembers([], reordered).size).toBe(0)
  })

  it('использует containerId перед совместимым locationId', () => {
    const indexed = indexContainerMembers([member('shield', 'Щит', 'character', 'castle')])
    expect(indexed.has('castle')).toBe(false)
    expect(indexed.get('character')).toHaveLength(1)
  })

  it('сохраняет метаданные схем при изменении графа и обновляет при переименовании и перестановке', () => {
    const diagrams = [{ id: 'main', name: 'Основная' }, { id: 'extra', name: 'Дополнительная' }]
    const before = stableDiagramMetadata(diagrams)
    expect(stableDiagramMetadata(diagrams.map(diagram => ({ ...diagram, nodes: [] })), before)).toBe(before)
    const renamed = stableDiagramMetadata([{ ...diagrams[0], name: 'Замок' }, diagrams[1]], before)
    expect(renamed).not.toBe(before)
    expect(renamed[0].name).toBe('Замок')
    expect(before[0].name).toBe('Основная')
    expect(stableDiagramMetadata([...diagrams].reverse(), before).map(diagram => diagram.id)).toEqual(['extra', 'main'])
    expect(stableDiagramMetadata([diagrams[0]], before)).toHaveLength(1)
  })
})
