import { describe, expect, it } from 'vitest'
import { center, connectionPoints, contourBox, contourPoint, nodeVisuals } from './nodeGeometry'
import type { ShapeBox } from './nodeGeometry'

describe('присоединение к контуру', () => {
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
    if (nodeVisuals[type].badge) expect(shape).toMatchObject({ x: 30, y: 24, width: 120, height: 120 })
  })
})
