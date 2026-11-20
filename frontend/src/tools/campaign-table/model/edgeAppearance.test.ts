import { describe, expect, it } from 'vitest'
import { edgePath, normalizeEdgeAppearance, persistedEdgeAppearance, validEdgeAppearance } from './edgeAppearance'

describe('оформление связей', () => {
  it('читает старые документы и не сохраняет временную анимацию', () => {
    expect(validEdgeAppearance(undefined)).toBe(true)
    expect(validEdgeAppearance({ description: 'Союзники' })).toBe(true)
    expect(normalizeEdgeAppearance(undefined)).toEqual({ pathStyle: 'straight', lineStyle: 'solid', color: 'amethyst', direction: 'none' })
    expect(persistedEdgeAppearance({ color: 'cyan', pathStyle: 'bezier', removing: true, animationKey: 3, description: 'Союзники' }))
      .toEqual({ color: 'cyan', pathStyle: 'bezier' })
  })
  it('отклоняет некорректные стили и произвольный CSS из импортируемого документа', () => {
    expect(validEdgeAppearance({ color: 'url(https://example.test/paint.svg)' })).toBe(false)
    expect(validEdgeAppearance({ pathStyle: 'unknown' })).toBe(false)
    expect(validEdgeAppearance({ lineStyle: null })).toBe(false)
    expect(validEdgeAppearance({ direction: ['both'] })).toBe(false)
    expect(validEdgeAppearance([])).toBe(false)
    expect(normalizeEdgeAppearance({ color: 'broken', lineStyle: 'dotted' })).toMatchObject({ color: 'amethyst', lineStyle: 'dotted' })
  })
  it.each(['straight', 'bezier', 'step'] as const)('%s: оставляет начало и конец на точках крепления при любом направлении', style => {
    const source = { x: 18.5, y: -32 }
    for (const target of [{ x: 420, y: 180 }, { x: -420, y: 180 }, { x: 80, y: -450 }, source]) {
      const result = edgePath({ source, target }, style)
      const numbers = result.path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)!.map(Number)
      expect(numbers.slice(0, 2)).toEqual([source.x, source.y])
      expect(numbers.slice(-2)).toEqual([target.x, target.y])
      expect(numbers.every(Number.isFinite)).toBe(true)
      expect(Number.isFinite(result.labelX) && Number.isFinite(result.labelY)).toBe(true)
    }
  })
  it('различает кривую и скруглённую ломаную при диагональном размещении узлов', () => {
    const points = { source: { x: 20, y: 30 }, target: { x: 330, y: 180 } }
    expect(edgePath(points, 'straight').path).not.toMatch(/[CQ]/)
    expect(edgePath(points, 'bezier').path).toContain('C')
    expect(edgePath(points, 'step').path).toContain('Q')
  })
})
