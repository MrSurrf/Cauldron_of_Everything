import { describe, expect, it } from 'vitest'
import { createEmptyCharacterSheet } from '../../character-sheet'
import { parseContentSource } from '../../../shared/ui/ContentEditor'
import { canPlaceInside, containerOf, moveInside } from './nodeContainment'
import { changeDiagram, createCanvasObject, createTable, duplicatePlacement, parseTable, placeCanvasObject, removeInstances, resolveDiagram, serializeTable } from './table'
import { TableHistory } from './tableHistory'

function fixture() {
  let table = createTable()
  const character = createCanvasObject('playerCharacter', { x: 0, y: 0 })
  character.entity.statBlock = { kind: 'playerCharacter', document: createEmptyCharacterSheet() }
  character.entity.statBlock.document.equipmentContentText = 'Рюкзак и верёвка'
  const item = createCanvasObject('item', { x: 300, y: 0 })
  const location = createCanvasObject('location', { x: 0, y: 300 })
  for (const [object, name] of [[character, 'Элора'], [item, 'Щит'], [location, 'Замок']] as const) {
    table = placeCanvasObject(table, table.activeId, object, name)
  }
  const put = (current: typeof table, target?: string) => changeDiagram(current, current.activeId, diagram => moveInside(diagram, item.node.id, target))
  const equipment = (current: typeof table) => {
    const block = current.entities.find(entity => entity.id === character.entity.id)!.statBlock!
    if (block.kind !== 'playerCharacter') throw new Error('Нет чарлиста')
    return block.document.equipmentContentText
  }
  return { table, character, item, location, put, equipment }
}

describe('перенос со схемы в контейнеры', () => {
  it('принимает предмет в локацию и чарлист, запрещает неподходящие типы', () => {
    const { table, character, item, location, put } = fixture()
    const diagram = resolveDiagram(table, table.diagrams[0])
    expect(canPlaceInside(diagram.nodes[1], diagram.nodes[0])).toBe(true)
    expect(canPlaceInside(diagram.nodes[0], diagram.nodes[1])).toBe(false)
    expect(canPlaceInside(diagram.nodes[1], diagram.nodes[1])).toBe(false)
    expect(put(table, location.node.id).diagrams[0].nodes[1].data.locationId).toBe(location.node.id)
    const saved = parseTable(serializeTable(put(table, character.node.id)))
    expect(saved.diagrams[0].nodes.find(node => node.id === item.node.id)!.data.containerId).toBe(character.node.id)
  })
  it('переносит предмет в штатное снаряжение без изменения исходного материала', () => {
    const { table, character, item, put, equipment } = fixture()
    const next = put(table, character.node.id)
    expect(equipment(next)).toContain('Рюкзак и верёвка')
    expect(equipment(next)).toContain(':::item[Щит]')
    expect(next.entities.find(entity => entity.id === item.entity.id)).toEqual(table.entities.find(entity => entity.id === item.entity.id))
    expect(equipment(put(next))).not.toContain(':::item[Щит]')
    expect(containerOf(put(next).diagrams[0].nodes[1])).toBeUndefined()
  })
  it('Undo/Redo отменяет вложение и снаряжение вместе, сохраняя прочие правки чарлиста', () => {
    const { table, character, put, equipment } = fixture()
    const history = new TableHistory()
    const next = put(table, character.node.id)
    history.record(table, next)
    const changed = structuredClone(next)
    const block = changed.entities[0].statBlock!
    if (block.kind !== 'playerCharacter') throw new Error('Нет чарлиста')
    block.document.equipmentContentText += '\nМоя новая запись'
    const undone = history.undo(changed)
    expect(equipment(undone)).not.toContain(':::item[Щит]')
    expect(equipment(undone)).toContain('Моя новая запись')
    const redone = history.redo(undone)
    expect(equipment(redone)).toContain(':::item[Щит]')
    expect(equipment(redone)).toContain('Моя новая запись')
    expect(parseContentSource(equipment(redone)).filter(block => block.kind === 'item')).toHaveLength(1)
  })
  it('извлечение и повторное вложение сохраняют количество и настройку предмета', () => {
    const { table, character, put, equipment } = fixture()
    const next = put(table, character.node.id)
    const block = next.entities[0].statBlock!
    if (block.kind !== 'playerCharacter') throw new Error('Нет чарлиста')
    block.document.equipmentContentText = equipment(next).replace('quantity="1"', 'quantity="4"').replace('attuned="false"', 'attuned="true"')
    const released = parseTable(serializeTable(put(next)))
    const back = put(released, character.node.id)
    expect(equipment(back)).toContain('quantity="4"')
    expect(equipment(back)).toContain('attuned="true"')
  })
  it('удаление персонажа освобождает предмет; Undo восстанавливает принадлежность', () => {
    const { table, character, item, put, equipment } = fixture()
    const contained = put(table, character.node.id)
    const removed = changeDiagram(contained, table.activeId, diagram => removeInstances(diagram, new Set([character.node.id])))
    expect(containerOf(removed.diagrams[0].nodes.find(node => node.id === item.node.id)!)).toBeUndefined()
    expect(equipment(removed)).not.toContain(':::item[Щит]')
    const history = new TableHistory()
    history.record(contained, removed)
    const undone = history.undo(removed)
    expect(equipment(undone)).toContain(':::item[Щит]')
    expect(parseTable(serializeTable(undone)).diagrams[0].nodes).toHaveLength(3)
  })
  it('не допускает повреждённую принадлежность при чтении сохранения', () => {
    const { table, character, put } = fixture()
    const next = put(table, character.node.id)
    next.diagrams[0].nodes[1].data.containerId = 'missing'
    expect(() => parseTable(serializeTable(next))).toThrow()
  })
  it('дублирует вложенный предмет отдельным виджетом, Undo убирает только копию', () => {
    const { table, character, item, put, equipment } = fixture()
    const contained = put(table, character.node.id)
    const duplicated = duplicatePlacement(contained, table.activeId, item.node.id, 'item-copy')
    const widgets = parseContentSource(equipment(duplicated)).filter(block => block.kind === 'item')
    expect(widgets).toHaveLength(2)
    expect(new Set(widgets.map(block => block.attributes['campaign-placement'])).size).toBe(2)
    expect(parseTable(serializeTable(duplicated)).diagrams[0].nodes).toHaveLength(4)
    const history = new TableHistory()
    history.record(contained, duplicated)
    expect(parseContentSource(equipment(history.undo(duplicated))).filter(block => block.kind === 'item')).toHaveLength(1)
  })
  it('Undo удаления предмета восстанавливает отредактированный виджет, не превращая правки в историю графа', () => {
    const { table, character, item, put, equipment } = fixture()
    const history = new TableHistory()
    const next = put(table, character.node.id)
    const edited = structuredClone(next)
    const block = edited.entities[0].statBlock!
    if (block.kind !== 'playerCharacter') throw new Error('Нет чарлиста')
    block.document.equipmentContentText = equipment(edited).replace('quantity="1"', 'quantity="7"')
    history.record(next, edited)
    expect(history.undo(edited)).toBe(edited)
    const removed = changeDiagram(edited, table.activeId, diagram => removeInstances(diagram, new Set([item.node.id])))
    history.record(edited, removed)
    expect(equipment(removed)).not.toContain(':::item[Щит]')
    expect(equipment(history.undo(removed))).toContain('quantity="7"')
  })
})
