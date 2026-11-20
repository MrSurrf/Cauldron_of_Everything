import { useId } from 'react'
import type { Ref } from 'react'
import questCornerUrl from '../assets/quest-node-corner.svg?url&no-inline'
import { shapePolygon } from '../model/nodeGeometry'
import styles from './CampaignNodes.module.css'
import { questNodeGeometry } from './nodeDecorationGeometry'

export function QuestNodeFrame({ width, height, svgRef }: { width: number; height: number; svgRef: Ref<SVGSVGElement> }) {
  const id = useId().replace(/:/g, '')
  const maskId = `quest-corner-${id}`
  const scrollClipId = `quest-scroll-${id}`
  const sealClipId = `quest-seal-${id}`
  const geometry = questNodeGeometry(width, height)
  const { left, top, scale, sealOffset } = geometry
  const x = (value: number) => (value - 60) * scale
  const y = (value: number) => (value - 84) * scale
  const tip = width - shapePolygon('quest', width, height)[1][0]
  const frame = `M${x(262)} 0 H${width - tip} L${width} ${height / 2} L${width - tip} ${height} H${x(170)}`

  return <svg ref={svgRef} className={styles.nodeOutline} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs>
      {/* В полосе 345–350 хвост свитка и верх печати разделяются по x=85. */}
      <clipPath id={scrollClipId}>
        <rect x={left} y={top} width={geometry.width} height={345 * scale} />
        <rect x={left} y={y(345)} width={85 * scale} height={5 * scale} />
      </clipPath>
      <clipPath id={sealClipId}>
        <rect x={left} y={y(350) + sealOffset} width={geometry.width} height={119 * scale} />
        <rect x={x(85)} y={y(345) + sealOffset} width={177 * scale} height={5 * scale} />
      </clipPath>
      <mask id={maskId} maskUnits="userSpaceOnUse" x={left} y={top} width={geometry.width} height={geometry.height + sealOffset} style={{ maskType: 'alpha' }}>
        <image data-node-decoration="quest" href={questCornerUrl} x={left} y={top} width={geometry.width} height={geometry.height} clipPath={`url(#${scrollClipId})`} />
        <image href={questCornerUrl} x={left} y={top + sealOffset} width={geometry.width} height={geometry.height} clipPath={`url(#${sealClipId})`} />
      </mask>
    </defs>
    <polygon points={shapePolygon('quest', width, height).map(point => point.join(',')).join(' ')} fill="var(--node-surface)" stroke="none" />
    <rect x={left} y={top} width={geometry.width} height={geometry.height + sealOffset} fill="var(--node-stroke)" stroke="none" mask={`url(#${maskId})`} />
    {/* Свиток и печать заменяют левую обводку; дополнительная высота продолжает её между ними. */}
    {sealOffset > 1 && <path d={`M${x(64)} ${y(345)} L${x(60)} ${y(407) + sealOffset}`} fill="none" vectorEffect="non-scaling-stroke" />}
    <path data-quest-frame="true" d={frame} fill="none" vectorEffect="non-scaling-stroke" />
  </svg>
}
