import { useLayoutEffect, useRef, useState } from 'react'

// Масштаб — только свойство представления. Размеры колонок и документ не меняются.
export function useSheetFitWidth(enabled: boolean) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const page = pageRef.current
    if (!enabled || !viewport || !page) return

    const measure = () => {
      const content = viewport.firstElementChild
      if (!content || !viewport.clientWidth || !page.offsetWidth) return
      const padding = getComputedStyle(content)
      const available = viewport.clientWidth - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight)
      setScale(Math.min(1, Math.max(0.01, available / page.offsetWidth)))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    observer.observe(page)
    return () => observer.disconnect()
  }, [enabled])

  return { viewportRef, pageRef, scale: enabled ? scale : 1 }
}
