import { useId } from 'react'
import type { Ref } from 'react'
import locationCornerUrl from '../assets/location-node-corner.svg?url&no-inline'
import styles from './CampaignNodes.module.css'

const CORNER_SCALE = 0.15
const SOURCE_WIDTH = 776
const SOURCE_HEIGHT = 356
const SOURCE_LEFT = 7.33
const SOURCE_TOP = 228.8175
const BORDER_WIDTH = 1.25
const CORNER_INSET = (14.6 * CORNER_SCALE - BORDER_WIDTH) / 2
const BEVEL = 4
const x = (value: number) => (value - SOURCE_LEFT) * CORNER_SCALE
const y = (value: number) => (value - SOURCE_TOP) * CORNER_SCALE

export function LocationNodeFrame({ width, height, svgRef }: { width: number; height: number; svgRef: Ref<SVGSVGElement> }) {
  const id = useId().replace(/:/g, '')
  const maskId = `location-corner-${id}`
  const filterId = `location-contour-${id}`
  const cornerLeft = x(0), cornerTop = y(0)
  const cornerWidth = SOURCE_WIDTH * CORNER_SCALE, cornerHeight = SOURCE_HEIGHT * CORNER_SCALE
  const cornerRight = x(SOURCE_WIDTH), cornerBottom = y(SOURCE_HEIGHT)
  // Середины открытых концов SVG совпадают с верхней и левой границами карточки.
  // Башня сохраняет размер при resize; растягиваются только прямые участки рамки.
  const frame = `M${cornerRight - CORNER_INSET - 0.25} 0 H${width - BEVEL} L${width} ${BEVEL} V${height - BEVEL} L${width - BEVEL} ${height} H${BEVEL} L0 ${height - BEVEL} V${cornerBottom - CORNER_INSET - 0.25}`
  // Подложка следует середине силуэта; сам контур целиком берётся из исходного SVG.
  const surface = [
    `M0 ${height - BEVEL} V${y(324.64)}`,
    `C${x(35)} ${y(307)} ${x(53)} ${y(276)} ${x(53)} ${y(244.5)}`,
    `V${y(179.2)} L${x(46)} ${y(176.5)} V${y(132.64)}`,
    `L${x(71.62)} ${y(123.16)} V${y(142)} L${x(101.9)} ${y(132.02)} V${y(110.55)}`,
    `L${x(120.5)} ${y(103.2)} L${x(139.6)} ${y(110.55)} V${y(132.02)}`,
    `L${x(169.92)} ${y(142)} V${y(123.94)} L${x(194.9)} ${y(132.5)} V${y(176.2)}`,
    `L${x(188.2)} ${y(179.2)} V${y(203.45)} H${x(546.8)} L${x(572.28)} 0`,
    `H${width - BEVEL} L${width} ${BEVEL} V${height - BEVEL}`,
    `L${width - BEVEL} ${height} H${BEVEL} Z`,
  ].join(' ')

  return <svg ref={svgRef} className={styles.nodeOutline} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs>
      {/* Толстый исходный силуэт сужается до толщины рамки без изменения размера башни. */}
      <filter id={filterId} filterUnits="userSpaceOnUse" x={cornerLeft} y={cornerTop} width={cornerWidth} height={cornerHeight}>
        <feMorphology in="SourceAlpha" operator="erode" radius={CORNER_INSET} />
      </filter>
      <mask id={maskId} maskUnits="userSpaceOnUse" x={cornerLeft} y={cornerTop} width={cornerWidth} height={cornerHeight} style={{ maskType: 'alpha' }}>
        <image href={locationCornerUrl} x={cornerLeft} y={cornerTop} width={cornerWidth} height={cornerHeight} filter={`url(#${filterId})`} />
      </mask>
    </defs>
    <path d={surface} fill="var(--node-surface)" stroke="none" />
    <rect x={cornerLeft} y={cornerTop} width={cornerWidth} height={cornerHeight} fill="var(--node-stroke)" stroke="none" mask={`url(#${maskId})`} />
    <path d={frame} fill="none" strokeWidth={BORDER_WIDTH} vectorEffect="non-scaling-stroke" />
  </svg>
}
