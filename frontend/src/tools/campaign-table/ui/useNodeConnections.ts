import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { addEdge } from '@xyflow/react'
import type { XYPosition } from '@xyflow/react'
import type { Diagram } from '../model/table'
import { containerOf } from '../model/nodeContainment'

type Gesture = { id: string; pointerId: number; x: number; y: number; dragging: boolean }

/** Одна модель связи для click → click и pointerdown → drag → pointerup. */
export function useNodeConnections(diagram: Diagram, readOnly: boolean, screenToFlowPosition: (point: XYPosition) => XYPosition,
  onChange: (update: (diagram: Diagram) => Diagram) => void, onCancel: () => void) {
  const [source, setSource] = useState<string | null>(null)
  const [target, setTarget] = useState<string | null>(null)
  const [pointer, setPointer] = useState<XYPosition | null>(null)
  const gesture = useRef<Gesture | null>(null)
  const ignoreClickUntil = useRef(0)
  const validTarget = (id: string | null, from: string) => id !== from && diagram.nodes.some(node => node.id === id && !containerOf(node)) ? id : null
  const cancel = (animate = true) => {
    if (animate) onCancel()
    gesture.current = null
    setSource(null); setTarget(null); setPointer(null)
  }
  const start = (id: string, point?: XYPosition) => {
    if (readOnly) return
    setSource(id); setTarget(null); setPointer(point ? screenToFlowPosition(point) : null)
  }
  const complete = (from: string, to: string | null) => {
    if (readOnly || !validTarget(to, from)) return false
    onChange(current => ({ ...current, edges: addEdge({ id: crypto.randomUUID(), source: from, target: to!, data: { pathStyle: 'bezier' } }, current.edges) }))
    cancel(false)
    return true
  }
  useEffect(() => {
    const targetAt = (event: PointerEvent) => document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('.react-flow__node')?.dataset.id ?? null
    const move = (event: PointerEvent) => {
      const active = gesture.current
      if (!active || active.pointerId !== event.pointerId) return
      if (!active.dragging && Math.hypot(event.clientX - active.x, event.clientY - active.y) < 5) return
      if (!active.dragging) { active.dragging = true; start(active.id) }
      setPointer(screenToFlowPosition({ x: event.clientX, y: event.clientY }))
      setTarget(validTarget(targetAt(event), active.id))
    }
    const up = (event: PointerEvent) => {
      const active = gesture.current
      if (!active || active.pointerId !== event.pointerId) return
      gesture.current = null
      if (!active.dragging) return // Короткое нажатие обработает обычный click кнопки.
      event.preventDefault(); event.stopPropagation()
      ignoreClickUntil.current = performance.now() + 100
      if (!complete(active.id, targetAt(event))) cancel()
    }
    const abort = () => { if (gesture.current || source) cancel() }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') abort() }
    document.addEventListener('pointermove', move, true)
    document.addEventListener('pointerup', up, true)
    document.addEventListener('pointercancel', abort, true)
    document.addEventListener('keydown', escape)
    window.addEventListener('blur', abort)
    return () => {
      document.removeEventListener('pointermove', move, true)
      document.removeEventListener('pointerup', up, true)
      document.removeEventListener('pointercancel', abort, true)
      document.removeEventListener('keydown', escape)
      window.removeEventListener('blur', abort)
    }
  })
  return { source, target, pointer, setPointer, setTarget, start, cancel,
    ignoreClick: () => performance.now() < ignoreClickUntil.current,
    finish: (id: string) => source ? complete(source, id) : false,
    begin: (id: string, event: ReactPointerEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      if (readOnly || event.button !== 0 || !event.isPrimary) return
      // Не захватываем pointer: конечная нода определяется под курсором, в том числе на touch.
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
      gesture.current = { id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, dragging: false }
    },
  }
}
