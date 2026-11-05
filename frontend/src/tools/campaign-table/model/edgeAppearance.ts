import { getBezierPath, getSmoothStepPath, getStraightPath, Position } from '@xyflow/react'
import type { XYPosition } from '@xyflow/react'

export const edgeColors = [
  { value: 'amethyst', label: 'Аметист', token: 'var(--color-brand-bright)' },
  { value: 'cyan', label: 'Лёд', token: 'var(--palette-cyan-300)' },
  { value: 'blue', label: 'Сапфир', token: 'var(--palette-blue-400)' },
  { value: 'green', label: 'Изумруд', token: 'var(--color-status-success)' },
  { value: 'gold', label: 'Золото', token: 'var(--color-status-warning)' },
  { value: 'rose', label: 'Роза', token: 'var(--color-status-danger)' },
  { value: 'slate', label: 'Дымка', token: 'var(--color-text-secondary)' },
] as const
export type EdgeColor = typeof edgeColors[number]['value']
export type EdgeAppearance = {
  pathStyle?: 'straight' | 'bezier' | 'step'
  lineStyle?: 'solid' | 'dashed' | 'dotted'
  color?: EdgeColor
  direction?: 'none' | 'forward' | 'both'
}
export type EdgeMotion = { removing?: boolean; animationKey?: string | number }

const appearanceValues = {
  pathStyle: ['straight', 'bezier', 'step'],
  lineStyle: ['solid', 'dashed', 'dotted'],
  color: edgeColors.map(color => color.value),
  direction: ['none', 'forward', 'both'],
} satisfies Record<keyof EdgeAppearance, readonly string[]>
const defaults: Required<EdgeAppearance> = { pathStyle: 'straight', lineStyle: 'solid', color: 'amethyst', direction: 'none' }
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Старые связи без оформления остаются валидными; произвольный CSS из документа не используется. */
export function validEdgeAppearance(value: unknown): boolean {
  if (value === undefined) return true
  if (!isRecord(value)) return false
  return (Object.keys(appearanceValues) as (keyof EdgeAppearance)[]).every(key => value[key] === undefined
    || (typeof value[key] === 'string' && (appearanceValues[key] as readonly string[]).includes(value[key])))
}

/** Только сохраняемые настройки: временные состояния анимации не попадают в документ. */
export function persistedEdgeAppearance(value: unknown): EdgeAppearance {
  if (!isRecord(value)) return {}
  return Object.fromEntries((Object.keys(appearanceValues) as (keyof EdgeAppearance)[])
    .filter(key => typeof value[key] === 'string' && (appearanceValues[key] as readonly string[]).includes(value[key]))
    .map(key => [key, value[key]])) as EdgeAppearance
}
export function normalizeEdgeAppearance(value: unknown): Required<EdgeAppearance> {
  return { ...defaults, ...persistedEdgeAppearance(value) }
}
export function edgeColorToken(color: EdgeColor): string {
  return edgeColors.find(item => item.value === color)!.token
}
export const edgeDashArray = (lineStyle: EdgeAppearance['lineStyle']) => lineStyle === 'dashed' ? '8 6' : lineStyle === 'dotted' ? '1 6' : undefined

/** Контур задаёт точки крепления, направление касательных выбирается по взаимному положению узлов. */
export function edgePath(points: { source: XYPosition; target: XYPosition }, style: EdgeAppearance['pathStyle'] = 'straight') {
  const { source, target } = points
  const dx = target.x - source.x, dy = target.y - source.y
  const horizontal = Math.abs(dx) >= Math.abs(dy)
  const sourcePosition = horizontal ? dx >= 0 ? Position.Right : Position.Left : dy >= 0 ? Position.Bottom : Position.Top
  const targetPosition = horizontal ? dx >= 0 ? Position.Left : Position.Right : dy >= 0 ? Position.Top : Position.Bottom
  const options = { sourceX: source.x, sourceY: source.y, targetX: target.x, targetY: target.y, sourcePosition, targetPosition }
  const [path, labelX, labelY] = style === 'bezier' ? getBezierPath({ ...options, curvature: 0.3 })
    : style === 'step' ? getSmoothStepPath({ ...options, borderRadius: 18, offset: 28 }) : getStraightPath(options)
  return { path, labelX, labelY }
}
