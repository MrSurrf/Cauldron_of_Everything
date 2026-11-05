import { describe, expect, it } from 'vitest'

import { moveArticleCrop, resizeArticleCrop } from './cropGeometry'
import type { CropHandle, CropRect } from './cropGeometry'

const handles: CropHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
const rect: CropRect = { x: 0.2, y: 0.3, width: 0.4, height: 0.3 }

function closeRect(actual: CropRect, expected: CropRect) {
  for (const key of ['x', 'y', 'width', 'height'] as const) expect(actual[key]).toBeCloseTo(expected[key], 12)
}

function withinImage(actual: CropRect) {
  expect(Number.isFinite(actual.x + actual.y + actual.width + actual.height)).toBe(true)
  expect(actual.x).toBeGreaterThanOrEqual(-1e-12)
  expect(actual.y).toBeGreaterThanOrEqual(-1e-12)
  expect(actual.width).toBeGreaterThan(0)
  expect(actual.height).toBeGreaterThan(0)
  expect(actual.x + actual.width).toBeLessThanOrEqual(1 + 1e-12)
  expect(actual.y + actual.height).toBeLessThanOrEqual(1 + 1e-12)
}

function anchored(actual: CropRect, start: CropRect, handle: CropHandle, ratio = false) {
  if (handle.includes('w')) expect(actual.x + actual.width).toBeCloseTo(start.x + start.width, 12)
  else if (handle.includes('e')) expect(actual.x).toBeCloseTo(start.x, 12)
  else if (ratio) expect(actual.x + actual.width / 2).toBeCloseTo(start.x + start.width / 2, 12)
  else { expect(actual.x).toBe(start.x); expect(actual.width).toBeCloseTo(start.width, 12) }
  if (handle.includes('n')) expect(actual.y + actual.height).toBeCloseTo(start.y + start.height, 12)
  else if (handle.includes('s')) expect(actual.y).toBeCloseTo(start.y, 12)
  else if (ratio) expect(actual.y + actual.height / 2).toBeCloseTo(start.y + start.height / 2, 12)
  else { expect(actual.y).toBe(start.y); expect(actual.height).toBeCloseTo(start.height, 12) }
}

describe('moveArticleCrop', () => {
  it('перемещает кадр без изменения размера и без мутации исходника', () => {
    const original = { ...rect }
    closeRect(moveArticleCrop(rect, 0.1, -0.2), { x: 0.3, y: 0.1, width: 0.4, height: 0.3 })
    expect(rect).toEqual(original)
  })

  it.each([[100, 100, 0.6, 0.7], [-100, -100, 0, 0], [100, -100, 0.6, 0], [-100, 100, 0, 0.7]])(
    'ограничивает дельту (%s, %s) границами, не меняя форму', (dx, dy, x, y) => {
      closeRect(moveArticleCrop(rect, dx, dy), { ...rect, x, y })
    },
  )

  it('не накапливает дельты между обновлениями одного жеста', () => {
    moveArticleCrop(rect, 0.1, 0.1)
    closeRect(moveArticleCrop(rect, 0.2, 0.2), { ...rect, x: 0.4, y: 0.5 })
  })

  it('полноразмерный кадр остаётся внутри изображения', () => {
    expect(moveArticleCrop({ x: 0, y: 0, width: 1, height: 1 }, 0.4, -0.6)).toEqual({ x: 0, y: 0, width: 1, height: 1 })
  })

  it('не раздувает уже существующие очень тонкие кадры', () => {
    const thin = { x: 0.2, y: 0.3, width: 1e-8, height: 0.5 }
    expect(moveArticleCrop(thin, 0.1, -0.2).width).toBe(thin.width)
  })

  it('нормализует нечисловой ввод и некорректный начальный прямоугольник', () => {
    withinImage(moveArticleCrop({ x: Number.NaN, y: Infinity, width: -1, height: 2 }, Infinity, Number.NaN))
    closeRect(moveArticleCrop(rect, Number.NaN, Infinity), rect)
  })
})

describe('resizeArticleCrop — свободные пропорции', () => {
  it.each([
    ['nw', { x: 0.25, y: 0.35, width: 0.35, height: 0.25 }],
    ['n', { x: 0.2, y: 0.35, width: 0.4, height: 0.25 }],
    ['ne', { x: 0.2, y: 0.35, width: 0.45, height: 0.25 }],
    ['e', { x: 0.2, y: 0.3, width: 0.45, height: 0.3 }],
    ['se', { x: 0.2, y: 0.3, width: 0.45, height: 0.35 }],
    ['s', { x: 0.2, y: 0.3, width: 0.4, height: 0.35 }],
    ['sw', { x: 0.25, y: 0.3, width: 0.35, height: 0.35 }],
    ['w', { x: 0.25, y: 0.3, width: 0.35, height: 0.3 }],
  ] as [CropHandle, CropRect][])('изменяет только нужные стороны: %s', (handle, expected) => {
    const next = resizeArticleCrop(rect, handle, 0.05, 0.05)
    closeRect(next, expected)
    anchored(next, rect, handle)
  })

  for (const handle of handles) {
    it(`${handle}: не переворачивается, не теряет якорь и соблюдает минимум у противоположной стороны`, () => {
      const dx = handle.includes('w') ? 100 : -100
      const dy = handle.includes('n') ? 100 : -100
      const next = resizeArticleCrop(rect, handle, dx, dy, { minWidth: 0.08, minHeight: 0.09 })
      withinImage(next)
      anchored(next, rect, handle)
      expect(next.width).toBeGreaterThanOrEqual(0.08 - 1e-12)
      expect(next.height).toBeGreaterThanOrEqual(0.09 - 1e-12)
    })

    it(`${handle}: ограничивает расширение границами изображения`, () => {
      const next = resizeArticleCrop(rect, handle, handle.includes('w') ? -100 : 100, handle.includes('n') ? -100 : 100)
      withinImage(next)
      anchored(next, rect, handle)
    })
  }

  it('игнорирует перпендикулярную дельту боковой ручки', () => {
    closeRect(resizeArticleCrop(rect, 'e', 0.1, -100), resizeArticleCrop(rect, 'e', 0.1, 100))
    closeRect(resizeArticleCrop(rect, 'n', -100, 0.1), resizeArticleCrop(rect, 'n', 100, 0.1))
  })

  it('сохраняет очень тонкую нетронутую ось точно, без накопления погрешности', () => {
    const thin = { x: 0.5, y: 0.2, width: 1e-20, height: 0.4 }
    expect(resizeArticleCrop(thin, 's', 100, 0.1).width).toBe(thin.width)
  })

  it('понижает недостижимый минимум у якоря, не двигая якорь за край', () => {
    const tiny = { x: 0.998, y: 0.997, width: 0.002, height: 0.003 }
    const next = resizeArticleCrop(tiny, 'se', -100, -100, { minWidth: 0.3, minHeight: 0.3 })
    closeRect(next, tiny)
    anchored(next, tiny, 'se')
  })

  it('поднимает слишком маленькие/отрицательные min до .01', () => {
    const next = resizeArticleCrop(rect, 'se', -1, -1, { minWidth: -1, minHeight: 0.001 })
    expect(next.width).toBeCloseTo(0.01, 12)
    expect(next.height).toBeCloseTo(0.01, 12)
  })

  it.each([0, -1, Infinity, Number.NaN])('некорректный aspect=%s включает свободный режим', aspectRatio => {
    closeRect(resizeArticleCrop(rect, 'nw', 0.1, -0.1, { aspectRatio }), resizeArticleCrop(rect, 'nw', 0.1, -0.1))
  })
})

describe('resizeArticleCrop — фиксированные пропорции', () => {
  it('проецирует угол на прямую пропорций, сохраняя противоположный угол', () => {
    const square = { x: 0.1, y: 0.2, width: 0.3, height: 0.3 }
    closeRect(resizeArticleCrop(square, 'se', 0.2, 0, { aspectRatio: 1 }), { ...square, width: 0.4, height: 0.4 })
    closeRect(resizeArticleCrop(square, 'nw', -0.1, -0.1, { aspectRatio: 1 }), { x: 0, y: 0.1, width: 0.4, height: 0.4 })
  })

  it('боковая ручка растёт симметрично относительно центра противоположного ребра', () => {
    const square = { x: 0.2, y: 0.3, width: 0.2, height: 0.2 }
    closeRect(resizeArticleCrop(square, 'e', 0.2, 100, { aspectRatio: 1 }), { x: 0.2, y: 0.2, width: 0.4, height: 0.4 })
    closeRect(resizeArticleCrop(square, 'n', 100, -0.2, { aspectRatio: 1 }), { x: 0.1, y: 0.1, width: 0.4, height: 0.4 })
  })

  for (const handle of handles) {
    for (const aspectRatio of [1, 16 / 9, 9 / 16, 20, 1 / 20, 1e8, 1e-8]) {
      it(`${handle}: сохраняет aspect=${aspectRatio} и якорь при расширении/сжатии за границы`, () => {
        for (const [dx, dy] of [[-100, -100], [-100, 100], [100, -100], [100, 100], [0.03, -0.02]]) {
          const next = resizeArticleCrop(rect, handle, dx, dy, { aspectRatio })
          withinImage(next)
          anchored(next, rect, handle, true)
          expect(next.width / next.height / aspectRatio).toBeCloseTo(1, 12)
        }
      })
    }
  }

  it('уважает оба минимума через общий scale, а не деформирует короткую сторону', () => {
    const next = resizeArticleCrop(rect, 'se', -100, -100, { aspectRatio: 2, minWidth: 0.12, minHeight: 0.1 })
    expect(next.width).toBeCloseTo(0.2, 12)
    expect(next.height).toBeCloseTo(0.1, 12)
  })

  it('при нехватке места сохраняет aspect и anchor, уступая требованиям min', () => {
    const tiny = { x: 0.998, y: 0.997, width: 0.002, height: 0.003 }
    const next = resizeArticleCrop(tiny, 'se', 100, 100, { aspectRatio: 2, minWidth: 0.2, minHeight: 0.2 })
    withinImage(next)
    anchored(next, tiny, 'se', true)
    expect(next.width).toBeCloseTo(0.002, 12)
    expect(next.height).toBeCloseTo(0.001, 12)
  })

  it('граница по перпендикулярной оси ограничивает боковую ручку без сдвига центра', () => {
    const top = { x: 0.2, y: 0, width: 0.2, height: 0.2 }
    const next = resizeArticleCrop(top, 'e', 100, 0, { aspectRatio: 1 })
    closeRect(next, top)
  })

  it('поддерживает нулевую дельту без дрейфа уже согласованного aspect', () => {
    for (const handle of handles) closeRect(resizeArticleCrop(rect, handle, 0, 0, { aspectRatio: rect.width / rect.height }), rect)
  })

  it('не мутирует start и options', () => {
    const start = Object.freeze({ ...rect })
    const options = Object.freeze({ aspectRatio: 2, minWidth: 0.1, minHeight: 0.1 })
    expect(() => resizeArticleCrop(start, 'se', 0.1, 0.1, options)).not.toThrow()
    expect(start).toEqual(rect)
  })

  it('проверяет инварианты всех ручек у четырёх границ, в тесном месте и для экстремальных aspect', () => {
    const starts: CropRect[] = [
      { x: 0, y: 0, width: 1, height: 1 },
      { x: 0, y: 0.99, width: 0.001, height: 0.01 },
      { x: 0.99, y: 0, width: 0.01, height: 0.001 },
      { x: 0.999, y: 0.999, width: 0.001, height: 0.001 },
      { x: 0.1, y: 0.7, width: 0.3, height: 0.1 },
    ]
    for (const start of starts) {
      for (const handle of handles) {
        for (const aspectRatio of [undefined, 0.01, 1, 100, 1e100, 1e-100]) {
          for (const [dx, dy] of [[0.1, -0.4], [-10, -10], [10, 10]]) {
            const next = resizeArticleCrop(start, handle, dx, dy, { aspectRatio, minWidth: 0.3, minHeight: 0.2 })
            withinImage(next)
            anchored(next, start, handle, aspectRatio !== undefined)
            if (aspectRatio) expect(next.width / next.height / aspectRatio).toBeCloseTo(1, 10)
          }
        }
      }
    }
  })
})
