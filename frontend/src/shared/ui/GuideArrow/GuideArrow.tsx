import { useId } from 'react'
import styles from './GuideArrow.module.css'

type Point = { x: number; y: number }

/** Координаты относительно viewport; наконечник направлен точно в to. */
export function GuideArrow({ from, to, tone = 'default' }: { from: Point; to: Point; tone?: 'default' | 'warm' }) {
  const markerId = useId()
  const bend = Math.max(40, Math.abs(to.y - from.y) * 0.45)
  return <svg className={styles.arrow} data-tone={tone} aria-hidden="true">
    <defs><marker id={markerId} viewBox="0 0 12 12" refX="10" refY="6" markerWidth="12" markerHeight="12" orient="auto" markerUnits="userSpaceOnUse"><path d="M2 2 L10 6 L2 10" /></marker></defs>
    <path d={`M${from.x} ${from.y} C${from.x} ${from.y - bend}, ${to.x} ${to.y + bend}, ${to.x} ${to.y}`} markerEnd={`url(#${markerId})`} />
    <circle cx={from.x} cy={from.y} r="3" />
  </svg>
}
