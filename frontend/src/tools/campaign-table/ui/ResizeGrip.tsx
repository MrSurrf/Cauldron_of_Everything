import type { PointerEvent } from 'react'
import styles from './CampaignTable.module.css'

export function ResizeGrip({ label, width, onResize, min = 260, max = 800 }: {
  label: string; width: number; onResize: (width: number) => void; min?: number; max?: number
}) {
  const clamp = (value: number) => Math.min(max, Math.max(min, value))
  function start(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const startX = event.clientX
    const element = event.currentTarget
    function move(next: globalThis.PointerEvent) { onResize(clamp(width + startX - next.clientX)) }
    function end() { element.removeEventListener('pointermove', move); element.removeEventListener('pointerup', end); element.removeEventListener('pointercancel', end) }
    element.addEventListener('pointermove', move)
    element.addEventListener('pointerup', end)
    element.addEventListener('pointercancel', end)
  }
  return <div className={styles.resizeGrip} role="separator" aria-label={label} aria-orientation="vertical" tabIndex={0}
    aria-valuenow={width} aria-valuemin={min} aria-valuemax={max} onPointerDown={start} onKeyDown={event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); onResize(clamp(width + (event.key === 'ArrowLeft' ? 20 : -20))) }
    }} />
}
