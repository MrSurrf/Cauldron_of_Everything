import { describe, expect, it } from 'vitest'
import { proportionalNodeScale } from './nodeDecorationGeometry'

describe('масштаб SVG-декора ноды', () => {
  it('равномерно следует за пропорциональным resize', () => {
    expect(proportionalNodeScale(280, 148, 280, 148)).toBe(1)
    expect(proportionalNodeScale(560, 296, 280, 148)).toBe(2)
  })

  it('ограничивается более узкой осью без искажения SVG', () => {
    expect(proportionalNodeScale(560, 148, 280, 148)).toBe(1)
    expect(proportionalNodeScale(140, 296, 280, 148)).toBe(0.5)
  })

  it('возвращает безопасный масштаб для некорректной геометрии', () => {
    expect(proportionalNodeScale(0, 148, 280, 148)).toBe(1)
  })
})
