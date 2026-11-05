import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

export type DepartingConnection = { id: string; path: string; color: string; width: string }

// Снимок пути остаётся на холсте после удаления узла. Документ и Undo обновляются сразу.
export function useDepartingConnections(canvas: RefObject<HTMLDivElement | null>) {
  const [connections, setConnections] = useState<DepartingConnection[]>([])
  const pending = useRef(new Set<string>())
  const timers = useRef(new Set<number>())
  useEffect(() => {
    const active = timers.current
    return () => { for (const timer of active) window.clearTimeout(timer) }
  }, [])
  const capture = useCallback((ids: ReadonlySet<string>, preview = false) => {
    if (!canvas.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const paths: { id: string; element: SVGPathElement }[] = []
    for (const id of ids) {
      const element = canvas.current.querySelector<SVGPathElement>(`.react-flow__edge[data-id="${CSS.escape(id)}"] .react-flow__edge-path`)
      if (element) paths.push({ id, element })
    }
    const previewPath = preview ? canvas.current.querySelector<SVGPathElement>('[data-connection-preview] [data-connection-path]') : null
    if (previewPath) paths.push({ id: 'preview', element: previewPath })
    const snapshots = paths.filter(({ id }) => !pending.current.has(id)).flatMap(({ id, element }) => {
      const path = element.getAttribute('d')
      if (!path) return []
      pending.current.add(id)
      const computed = getComputedStyle(element)
      return [{ id, path, color: computed.stroke, width: computed.strokeWidth }]
    })
    if (!snapshots.length) return
    setConnections(current => [...current, ...snapshots])
    const timer = window.setTimeout(() => {
      const finished = new Set(snapshots.map(item => item.id))
      setConnections(current => current.filter(item => !finished.has(item.id)))
      for (const id of finished) pending.current.delete(id)
      timers.current.delete(timer)
    }, 220)
    timers.current.add(timer)
  }, [canvas])
  return { connections, capture }
}

