export type CropRect = { x: number; y: number; width: number; height: number }
export type CropHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

type ResizeOptions = { aspectRatio?: number; minWidth?: number; minHeight?: number }

const MIN_SIZE = 0.01

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalized(rect: CropRect): CropRect {
  const width = rect.width > 0 ? Math.min(finite(rect.width, MIN_SIZE), 1) : MIN_SIZE
  const height = rect.height > 0 ? Math.min(finite(rect.height, MIN_SIZE), 1) : MIN_SIZE
  return {
    x: clamp(finite(rect.x), 0, 1 - width),
    y: clamp(finite(rect.y), 0, 1 - height),
    width,
    height,
  }
}

/** Дельта всегда относится к началу жеста, а не к предыдущему pointermove. */
export function moveArticleCrop(start: CropRect, dx: number, dy: number): CropRect {
  const rect = normalized(start)
  return {
    ...rect,
    x: clamp(rect.x + finite(dx), 0, 1 - rect.width),
    y: clamp(rect.y + finite(dy), 0, 1 - rect.height),
  }
}

/**
 * aspectRatio относится к нормализованным координатам, не к пикселям изображения.
 * Пределы и минимумы ограничивают один масштаб, поэтому не искажают пропорции.
 */
export function resizeArticleCrop(
  start: CropRect,
  handle: CropHandle,
  dx: number,
  dy: number,
  options: ResizeOptions = {},
): CropRect {
  const rect = normalized(start)
  const west = handle.includes('w')
  const east = handle.includes('e')
  const north = handle.includes('n')
  const south = handle.includes('s')
  const horizontal = west || east
  const vertical = north || south
  const deltaX = finite(dx)
  const deltaY = finite(dy)
  const minimumWidth = clamp(finite(options.minWidth ?? MIN_SIZE, MIN_SIZE), MIN_SIZE, 1)
  const minimumHeight = clamp(finite(options.minHeight ?? MIN_SIZE, MIN_SIZE), MIN_SIZE, 1)
  const ratio = options.aspectRatio

  if (typeof ratio !== 'number' || !Number.isFinite(ratio) || ratio <= 0) {
    const right = rect.x + rect.width
    const bottom = rect.y + rect.height
    const left = west ? clamp(rect.x + deltaX, 0, right - Math.min(minimumWidth, right)) : rect.x
    const top = north ? clamp(rect.y + deltaY, 0, bottom - Math.min(minimumHeight, bottom)) : rect.y
    const nextRight = east ? clamp(right + deltaX, rect.x + Math.min(minimumWidth, 1 - rect.x), 1) : right
    const nextBottom = south ? clamp(bottom + deltaY, rect.y + Math.min(minimumHeight, 1 - rect.y), 1) : bottom
    return {
      x: left,
      y: top,
      width: horizontal ? nextRight - left : rect.width,
      height: vertical ? nextBottom - top : rect.height,
    }
  }

  const anchorX = west ? rect.x + rect.width : rect.x
  const anchorY = north ? rect.y + rect.height : rect.y
  const centerX = rect.x + rect.width / 2
  const centerY = rect.y + rect.height / 2
  const availableWidth = horizontal ? west ? anchorX : 1 - anchorX : 2 * Math.min(centerX, 1 - centerX)
  const availableHeight = vertical ? north ? anchorY : 1 - anchorY : 2 * Math.min(centerY, 1 - centerY)

  // Компоненты не больше единицы: не вычисляем ratio², которое переполняется
  // у очень широких кадров, и одинаково обрабатываем узкие и широкие пропорции.
  const unitWidth = ratio >= 1 ? 1 : ratio
  const unitHeight = ratio >= 1 ? 1 / ratio : 1
  const targetWidth = rect.width + (west ? -deltaX : deltaX)
  const targetHeight = rect.height + (north ? -deltaY : deltaY)
  const targetScale = horizontal && vertical
    ? (targetWidth * unitWidth + targetHeight * unitHeight) / (unitWidth ** 2 + unitHeight ** 2)
    : horizontal ? targetWidth / unitWidth : targetHeight / unitHeight
  const maxScale = Math.min(availableWidth / unitWidth, availableHeight / unitHeight)
  // Если около якоря недостаточно места, сохраняем форму, а не принудительно
  // растягиваем короткую сторону до .01 за пределы изображения.
  const minScale = Math.min(Math.max(minimumWidth / unitWidth, minimumHeight / unitHeight), maxScale)
  const scale = clamp(targetScale, minScale, maxScale)
  const width = scale * unitWidth
  const height = scale * unitHeight

  return {
    x: horizontal ? west ? anchorX - width : anchorX : centerX - width / 2,
    y: vertical ? north ? anchorY - height : anchorY : centerY - height / 2,
    width,
    height,
  }
}
