/**
 * Равномерно масштабирует декор вместе с нодой, не искажая исходный SVG.
 * Меньшая из двух осей не даёт украшению выйти за границы узкой ноды.
 */
export function proportionalNodeScale(width: number, height: number, baseWidth: number, baseHeight: number) {
  if (width <= 0 || height <= 0 || baseWidth <= 0 || baseHeight <= 0) return 1
  return Math.min(width / baseWidth, height / baseHeight)
}
