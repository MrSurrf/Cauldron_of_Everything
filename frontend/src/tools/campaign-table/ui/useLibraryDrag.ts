import { useCallback, useEffect, useState } from 'react'
import type { RefObject } from 'react'
import type { LibraryReference } from '../model/library'

export type LibraryDrag = { reference: LibraryReference; x: number; y: number; overCanvas: boolean }

export function useLibraryDrag(canvas: RefObject<HTMLDivElement | null>) {
  const [drag, setDrag] = useState<LibraryDrag | null>(null)
  const dragging = drag !== null
  const finish = useCallback(() => setDrag(null), [])
  const begin = useCallback((reference: LibraryReference, pointer: { x: number; y: number }) => {
    setDrag({ reference, ...pointer, overCanvas: false })
  }, [])
  useEffect(() => {
    if (!dragging) return
    const follow = (event: DragEvent) => {
      const bounds = canvas.current?.getBoundingClientRect()
      const overCanvas = Boolean(bounds && event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom)
      setDrag(current => current ? { ...current, x: event.clientX, y: event.clientY, overCanvas } : current)
    }
    document.addEventListener('dragover', follow, true)
    document.addEventListener('dragend', finish)
    document.addEventListener('drop', finish)
    window.addEventListener('blur', finish)
    return () => {
      document.removeEventListener('dragover', follow, true)
      document.removeEventListener('dragend', finish)
      document.removeEventListener('drop', finish)
      window.removeEventListener('blur', finish)
    }
  }, [canvas, dragging, finish])
  return { drag, begin, finish }
}
