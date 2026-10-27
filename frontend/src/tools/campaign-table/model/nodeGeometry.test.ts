import { describe, expect, it } from 'vitest'
import { center, connectionPoints, contourBox, contourPoint, nodeVisuals, shapePolygon } from './nodeGeometry'
import type { ShapeBox } from './nodeGeometry'

describe('присоединение к контуру', () => {
  it('при раскрытии существа соединяет тот же узел с контуром карточки', () => {
    const expanded = contourBox('creature', { x: 10, y: 20 }, 368, 460, true)
    expect(expanded).toEqual({ x: 10, y: 20, width: 368, height: 460, shape: 'rectangle' })
    expect(contourPoint(expanded, { x: 800, y: 250 })).toEqual({ x: 378, y: 250 })
    expect(contourBox('creature', { x: 10, y: 20 }, 180, 170).shape).toBe('octagon')
  })
  const box: ShapeBox = { x: 10, y: 20, width: 100, height: 100, shape: 'circle' }
  it('соединяет круг с любой стороны, включая диагональ', () => {
    expect(contourPoint(box, { x: 300, y: 70 })).toEqual({ x: 110, y: 70 })
    expect(contourPoint(box, { x: 60, y: -200 })).toEqual({ x: 60, y: 20 })
    const p = contourPoint(box, { x: 160, y: 170 })
    expect(Math.hypot(p.x - 60, p.y - 70)).toBeCloseTo(50)
  })
  it('учитывает ромб и срезанные углы, а не прямоугольные границы', () => {
    expect(contourPoint({ ...box, shape: 'diamond' }, { x: 160, y: 170 })).toEqual({ x: 85, y: 95 })
    const point = contourPoint({ ...box, shape: 'octagon' }, { x: 160, y: 170 })
    expect(point.x).toBeCloseTo(96)
    expect(point.y).toBeCloseTo(106)
  })
  it.each([[190, 128], [520, 130], [220, 360], [860, 520]])('сгиб записки сохраняет 24 × 24 px при размере %i × %i', (width, height) => {
    const polygon = shapePolygon('note', width, height)
    expect(width - polygon[1][0]).toBe(24)
    expect(polygon[2][1]).toBe(24)
    const point = contourPoint({ x: 0, y: 0, width, height, shape: 'note' }, { x: width, y: 0 })
    // Связь приходит на видимую диагональ сгиба, а не в пустой угол bounding box.
    expect(point.x - point.y).toBeCloseTo(width - 24)
    expect(point.x).toBeLessThan(width)
    expect(point.y).toBeGreaterThan(0)
  })
  it.each([[220, 96], [600, 100], [240, 420]])('наконечник квеста не растягивается при размере %i × %i', (width, height) => {
    const polygon = shapePolygon('quest', width, height)
    expect(width - polygon[1][0]).toBe(18)
    expect(polygon[2]).toEqual([width, height / 2])
    expect(polygon[0]).toEqual([7, 0])
    expect(contourPoint({ x: 0, y: 0, width, height, shape: 'quest' }, { x: width * 2, y: height / 2 })).toEqual({ x: width, y: height / 2 })
  })
  it('перестраивает обе точки при перемещении соседа через вертикаль', () => {
    const right = connectionPoints(box, { ...box, x: 300 })
    const above = connectionPoints(box, { ...box, y: -300 })
    expect(right.source).toEqual({ x: 110, y: 70 })
    expect(above.source).toEqual({ x: 60, y: 20 })
    expect(above.target).toEqual({ x: 60, y: -200 })
  })
  it.each(Object.keys(nodeVisuals) as (keyof typeof nodeVisuals)[])('%s: учитывает форму и совпадающие центры', type => {
    const shape = contourBox(type, { x: 0, y: 0 }, 180, 220)
    const points = connectionPoints(shape, shape)
    expect(Number.isFinite(points.source.x)).toBe(true)
    expect(Number.isFinite(points.target.y)).toBe(true)
    expect(points.source).not.toEqual(center(shape))
    expect(points.source).not.toEqual(points.target)
    if (nodeVisuals[type].badge) expect(shape).toMatchObject({ x: 30, y: 0, width: 120, height: 120 })
  })
})
