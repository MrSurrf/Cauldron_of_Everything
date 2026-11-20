/**
 * Равномерно масштабирует декор вместе с нодой, не искажая исходный SVG.
 * Меньшая из двух осей не даёт украшению выйти за границы узкой ноды.
 */
export function proportionalNodeScale(width: number, height: number, baseWidth: number, baseHeight: number) {
  if (width <= 0 || height <= 0 || baseWidth <= 0 || baseHeight <= 0) return 1
  return Math.min(width / baseWidth, height / baseHeight)
}

/** Свиток заменяет левую грань квеста; печать остаётся у нижней линии при независимом resize. */
export function questNodeGeometry(width: number, height: number) {
  const scale = proportionalNodeScale(width * 0.35, height, 262, 385)
  return {
    scale,
    left: -60 * scale,
    top: -84 * scale,
    width: 262 * scale,
    height: 469 * scale,
    sealOffset: height - 385 * scale,
    contentInset: 202 * scale + 8,
  }
}
