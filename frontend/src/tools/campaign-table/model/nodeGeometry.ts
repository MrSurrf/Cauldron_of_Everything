import type { XYPosition } from '@xyflow/react'
import type { EntityType } from '../../../entities/base'
import type { NodeEntityType } from './table'

export type NodeShape = 'circle' | 'rectangle' | 'octagon' | 'diamond' | 'square' | 'quest' | 'shield' | 'note'
export type NodeVisual = { shape: NodeShape; width: number; badge: boolean }
export const canResizeNode = (type: EntityType) => ['location', 'note', 'quest'].includes(type)
export function nodeMinimumSize(type: EntityType) {
  if (type === 'location') return { width: 220, height: 148 }
  if (type === 'quest') return { width: 220, height: 96 }
  if (type === 'note') return { width: 190, height: 128 }
  return { width: 160, height: 72 }
}
export const NOTE_FOLD_SIZE = 24
export const EXPANDED_CREATURE_WIDTH = 368
export const nodeVisuals = {
  playerCharacter: { shape: 'circle', width: 180, badge: true },
  npc: { shape: 'circle', width: 180, badge: true },
  creature: { shape: 'octagon', width: 180, badge: true },
  location: { shape: 'rectangle', width: 280, badge: false },
  quest: { shape: 'quest', width: 280, badge: false },
  faction: { shape: 'shield', width: 180, badge: true },
  item: { shape: 'square', width: 160, badge: true },
  spell: { shape: 'diamond', width: 180, badge: true },
  note: { shape: 'note', width: 220, badge: false },
} satisfies Record<NodeEntityType, NodeVisual>
export function nodeVisual(type: EntityType): NodeVisual {
  return type in nodeVisuals ? nodeVisuals[type as keyof typeof nodeVisuals] : { shape: 'rectangle', width: 220, badge: false }
}
// Один контур используется SVG-представлением и геометрией связей.
export const polygons: Record<Exclude<NodeShape, 'circle'>, [number, number][]> = {
  rectangle: [[0, 0], [1, 0], [1, 1], [0, 1]],
  square: [[0.06, 0], [0.94, 0], [1, 0.06], [1, 0.94], [0.94, 1], [0.06, 1], [0, 0.94], [0, 0.06]],
  octagon: [[0.28, 0], [0.72, 0], [1, 0.28], [1, 0.72], [0.72, 1], [0.28, 1], [0, 0.72], [0, 0.28]],
  diamond: [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]],
  quest: [[0.03, 0], [0.94, 0], [1, 0.5], [0.94, 1], [0.03, 1], [0, 0.85], [0, 0.15]],
  shield: [[0, 0], [1, 0], [1, 0.7], [0.5, 1], [0, 0.7]],
  note: [[0, 0], [0.87, 0], [1, 0.2], [1, 1], [0, 1]],
}
/** Срезы карточек заданы в пикселях: resize не растягивает сгиб бумаги и наконечник квеста. */
export function shapePolygon(shape: Exclude<NodeShape, 'circle'>, width: number, height: number): [number, number][] {
  if (shape === 'note') {
    const fold = Math.min(NOTE_FOLD_SIZE, width / 3, height / 3)
    return [[0, 0], [width - fold, 0], [width, fold], [width, height], [0, height]]
  }
  if (shape === 'quest') {
    const tip = Math.min(18, width / 8, height / 3)
    const cut = Math.min(7, height / 6)
    return [[cut, 0], [width - tip, 0], [width, height / 2], [width - tip, height], [cut, height], [0, height - cut], [0, cut]]
  }
  return polygons[shape].map(([x, y]) => [x * width, y * height])
}
export type ShapeBox = { x: number; y: number; width: number; height: number; shape: NodeShape }
export function contourBox(type: EntityType, position: XYPosition, width: number, height: number, expanded = false): ShapeBox {
  if (type === 'creature' && expanded) return { ...position, width, height, shape: 'rectangle' }
  const visual = nodeVisual(type)
  if (!visual.badge) return { ...position, width, height, shape: visual.shape }
  const size = Math.min(width - 32, 120)
  return { x: position.x + (width - size) / 2, y: position.y, width: size, height: size, shape: visual.shape }
}
export function center(box: ShapeBox): XYPosition { return { x: box.x + box.width / 2, y: box.y + box.height / 2 } }
// Пересечение луча от центра к соседу с внешним контуром (не bounding box).
export function contourPoint(box: ShapeBox, toward: XYPosition): XYPosition {
  const origin = center(box)
  let dx = toward.x - origin.x
  const dy = toward.y - origin.y
  if (Math.abs(dx) + Math.abs(dy) < 0.00001) dx = 1
  if (box.shape === 'circle') {
    const scale = 1 / Math.hypot(dx / (box.width / 2), dy / (box.height / 2))
    return { x: origin.x + dx * scale, y: origin.y + dy * scale }
  }
  const points = shapePolygon(box.shape, box.width, box.height).map(([x, y]) => ({ x: box.x + x, y: box.y + y }))
  let distance = Infinity
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length]
    const sx = b.x - a.x, sy = b.y - a.y
    const determinant = dx * sy - dy * sx
    if (Math.abs(determinant) < 0.00001) continue
    const ax = a.x - origin.x, ay = a.y - origin.y
    const t = (ax * sy - ay * sx) / determinant
    const u = (ax * dy - ay * dx) / determinant
    if (t >= 0 && u >= -0.00001 && u <= 1.00001) distance = Math.min(distance, t)
  }
  return Number.isFinite(distance) ? { x: origin.x + dx * distance, y: origin.y + dy * distance } : origin
}
export function connectionPoints(source: ShapeBox, target: ShapeBox) {
  const from = center(source), to = center(target)
  // Совпадающие центры: детерминированные противоположные точки, без NaN.
  const coincident = Math.hypot(to.x - from.x, to.y - from.y) < 0.00001
  return { source: contourPoint(source, coincident ? { x: from.x + 1, y: from.y } : to),
    target: contourPoint(target, coincident ? { x: to.x - 1, y: to.y } : from) }
}
