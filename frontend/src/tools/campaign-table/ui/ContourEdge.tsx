import { useId } from 'react'
import type { CSSProperties } from 'react'
import { BaseEdge, useInternalNode, ViewportPortal } from '@xyflow/react'
import type { EdgeProps, InternalNode, XYPosition } from '@xyflow/react'
import { edgeColorToken, edgeDashArray, edgePath, normalizeEdgeAppearance } from '../model/edgeAppearance'
import type { EdgeAppearance, EdgeMotion } from '../model/edgeAppearance'
import { center, connectionPoints, contourBox, contourPoint, nodeVisual } from '../model/nodeGeometry'
import type { TableEdge, TableNode } from '../model/table'
import styles from './CampaignEdges.module.css'

function box(node: InternalNode<TableNode>) {
  return contourBox(node.data.entityType, node.internals.positionAbsolute,
    node.measured.width ?? nodeVisual(node.data.entityType).width, node.measured.height ?? 80, node.data.display?.creatureExpanded)
}
export function ContourEdge({ source, target, ...props }: EdgeProps<TableEdge>) {
  const from = useInternalNode<TableNode>(source)
  const to = useInternalNode<TableNode>(target)
  const markerId = `campaign-arrow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  if (!from || !to) return null
  const data = props.data as (EdgeAppearance & EdgeMotion) | undefined
  const appearance = normalizeEdgeAppearance(data)
  const points = connectionPoints(box(from), box(to))
  const { path, labelX, labelY } = edgePath(points, appearance.pathStyle)
  const color = edgeColorToken(appearance.color)
  const arrowStart = appearance.direction === 'both'
  const arrowEnd = appearance.direction !== 'none'
  return <g key={`${source}:${target}:${data?.animationKey ?? ''}`} className={styles.edge}
    data-selected={Boolean(props.selected)} data-removing={Boolean(data?.removing)}
    style={{ '--edge-color': color } as CSSProperties}>
    <defs><marker id={markerId} viewBox="0 0 10 10" refX={8} refY={5} markerWidth={9} markerHeight={9}
      markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M2 1 L8 5 L2 9" className={styles.arrow} /></marker></defs>
    <path className={styles.halo} d={path} aria-hidden="true" />
    <BaseEdge id={props.id} className={styles.line} style={{ ...props.style, stroke: color, strokeWidth: props.selected ? 2.6 : 2,
      strokeDasharray: edgeDashArray(appearance.lineStyle) }} markerStart={arrowStart ? `url(#${markerId})` : undefined} markerEnd={arrowEnd ? `url(#${markerId})` : undefined}
      interactionWidth={props.interactionWidth ?? 22} label={props.label} labelStyle={{ ...props.labelStyle, fill: 'var(--color-text-primary)', fontSize: 12 }}
      labelShowBg={props.labelShowBg} labelBgStyle={{ ...props.labelBgStyle, fill: 'var(--color-surface-default)', stroke: color, strokeOpacity: 0.25 }}
      labelBgPadding={props.labelBgPadding ?? [8, 5]} labelBgBorderRadius={props.labelBgBorderRadius ?? 6} path={path} labelX={labelX} labelY={labelY}
      data-connection-path="" />
    <path className={styles.trace} d={path} pathLength={1} aria-hidden="true" />
    {!arrowStart && <circle className={styles.endpoint} cx={points.source.x} cy={points.source.y} r={3} aria-hidden="true" />}
    {!arrowEnd && <circle className={styles.endpoint} cx={points.target.x} cy={points.target.y} r={3} aria-hidden="true" />}
  </g>
}
export function ConnectionPreview({ source, target, pointer, appearance: data }: {
  source: string; target: string | null; pointer: XYPosition | null; appearance?: EdgeAppearance
}) {
  const from = useInternalNode<TableNode>(source)
  const to = useInternalNode<TableNode>(target ?? '')
  if (!from || (!pointer && !to)) return null
  const sourceBox = box(from)
  const points = to ? connectionPoints(sourceBox, box(to))
    : { source: contourPoint(sourceBox, pointer ?? center(sourceBox)), target: pointer! }
  const appearance = normalizeEdgeAppearance({ pathStyle: 'bezier', ...data })
  const { path } = edgePath(points, appearance.pathStyle)
  return <ViewportPortal><svg className={styles.connectionPreview} aria-hidden="true" data-connection-preview="" data-target={Boolean(to)}
    style={{ '--edge-color': edgeColorToken(appearance.color) } as CSSProperties}>
    <path className={styles.previewLine} d={path} data-connection-path="" />
    {to && <circle className={styles.previewTarget} cx={points.target.x} cy={points.target.y} r={9} />}
    <circle className={styles.previewEndpoint} cx={points.source.x} cy={points.source.y} r={3.5} />
    <circle className={styles.previewEndpoint} cx={points.target.x} cy={points.target.y} r={4} />
  </svg></ViewportPortal>
}
