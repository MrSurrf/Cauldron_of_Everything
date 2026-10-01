import { BaseEdge, getStraightPath, useInternalNode, ViewportPortal } from '@xyflow/react'
import type { EdgeProps, InternalNode, XYPosition } from '@xyflow/react'
import { center, connectionPoints, contourBox, contourPoint, nodeVisual } from '../model/nodeGeometry'
import type { TableEdge, TableNode } from '../model/table'
import styles from './CampaignTable.module.css'

function box(node: InternalNode<TableNode>) {
  return contourBox(node.data.entityType, node.internals.positionAbsolute,
    node.measured.width ?? nodeVisual(node.data.entityType).width, node.measured.height ?? 80)
}
export function ContourEdge({ source, target, ...props }: EdgeProps<TableEdge>) {
  const from = useInternalNode<TableNode>(source)
  const to = useInternalNode<TableNode>(target)
  if (!from || !to) return null
  const points = connectionPoints(box(from), box(to))
  const [path, labelX, labelY] = getStraightPath({ sourceX: points.source.x, sourceY: points.source.y, targetX: points.target.x, targetY: points.target.y })
  return <BaseEdge id={props.id} style={props.style} markerStart={props.markerStart} markerEnd={props.markerEnd}
    interactionWidth={props.interactionWidth} label={props.label} labelStyle={props.labelStyle}
    labelShowBg={props.labelShowBg} labelBgStyle={props.labelBgStyle} labelBgPadding={props.labelBgPadding}
    labelBgBorderRadius={props.labelBgBorderRadius} path={path} labelX={labelX} labelY={labelY} />
}
export function ConnectionPreview({ source, target, pointer }: { source: string; target: string | null; pointer: XYPosition | null }) {
  const from = useInternalNode<TableNode>(source)
  const to = useInternalNode<TableNode>(target ?? '')
  if (!from || (!pointer && !to)) return null
  const sourceBox = box(from)
  const points = to ? connectionPoints(sourceBox, box(to))
    : { source: contourPoint(sourceBox, pointer ?? center(sourceBox)), target: pointer! }
  return <ViewportPortal><svg className={styles.connectionPreview} aria-hidden="true">
    <path d={`M${points.source.x},${points.source.y} L${points.target.x},${points.target.y}`} />
    <circle cx={points.source.x} cy={points.source.y} r={4} /><circle cx={points.target.x} cy={points.target.y} r={4} />
  </svg></ViewportPortal>
}
