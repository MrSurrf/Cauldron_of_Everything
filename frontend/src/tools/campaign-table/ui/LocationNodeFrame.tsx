import { useId } from 'react'
import type { Ref } from 'react'
import locationCornerUrl from '../assets/location-node-corner.svg?url&no-inline'
import locationCornerSource from '../assets/location-node-corner.svg?raw'
import styles from './CampaignNodes.module.css'

const CORNER_SCALE = 0.15
const sourceViewBox = locationCornerSource.match(/\bviewBox=["']([^"']+)["']/)?.[1].trim().split(/[\s,]+/).map(Number)
if (!sourceViewBox || sourceViewBox.length !== 4 || sourceViewBox.some(value => !Number.isFinite(value))
  || sourceViewBox[2] <= 0 || sourceViewBox[3] <= 0) {
  throw new Error('Уголок локации должен содержать корректный viewBox SVG.')
}
const [SOURCE_X, SOURCE_Y, SOURCE_WIDTH, SOURCE_HEIGHT] = sourceViewBox
// Стыки принадлежат контуру, а не краям области экспорта SVG.
const SOURCE_LEFT = 7.35335
const SOURCE_TOP = 228.7935
const SOURCE_RIGHT = 572.28
const SOURCE_BOTTOM = 324.64
const BORDER_WIDTH = 1.25
const CORNER_INSET = (14.6 * CORNER_SCALE - BORDER_WIDTH) / 2
const JOIN_OVERLAP = 1
const BEVEL = 4
const x = (value: number) => (value - SOURCE_LEFT) * CORNER_SCALE
const y = (value: number) => (value - SOURCE_TOP) * CORNER_SCALE

export function LocationNodeFrame({ width, height, svgRef }: { width: number; height: number; svgRef: Ref<SVGSVGElement> }) {
  const id = useId().replace(/:/g, '')
  const maskId = `location-corner-${id}`
  const filterId = `location-contour-${id}`
  const cornerLeft = x(SOURCE_X), cornerTop = y(SOURCE_Y)
  const cornerWidth = SOURCE_WIDTH * CORNER_SCALE, cornerHeight = SOURCE_HEIGHT * CORNER_SCALE
  const cornerRight = x(SOURCE_RIGHT), cornerBottom = y(SOURCE_BOTTOM)
  // Середины открытых концов SVG совпадают с верхней и левой границами карточки.
  // Башня сохраняет размер при resize; растягиваются только прямые участки рамки.
  // Небольшое перекрытие закрывает диагональные срезы после сужения маски.
  const frame = `M${cornerRight - JOIN_OVERLAP} 0 H${width - BEVEL} L${width} ${BEVEL} V${height - BEVEL} L${width - BEVEL} ${height} H${BEVEL} L0 ${height - BEVEL} V${cornerBottom - JOIN_OVERLAP}`
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
        <image href={locationCornerUrl} x={cornerLeft} y={cornerTop} width={cornerWidth} height={cornerHeight} preserveAspectRatio="none" filter={`url(#${filterId})`} />
      </mask>
    </defs>
    <path d={surface} fill="var(--node-surface)" stroke="none" />
    <rect x={cornerLeft} y={cornerTop} width={cornerWidth} height={cornerHeight} fill="var(--node-stroke)" stroke="none" mask={`url(#${maskId})`} />
    <path d={frame} fill="none" strokeWidth={BORDER_WIDTH} vectorEffect="non-scaling-stroke" />
  </svg>
}
