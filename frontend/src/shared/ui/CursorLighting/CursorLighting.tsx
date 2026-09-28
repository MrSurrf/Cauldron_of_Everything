import { useEffect, useRef } from 'react'

import { trackCursorLighting } from './trackCursorLighting'
import './CursorLighting.css'

/** Один декоративный слой для всех маршрутов, без перерисовок React при движении. */
export function CursorLighting() {
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (glowRef.current) return trackCursorLighting(glowRef.current)
  }, [])

  return <div ref={glowRef} className="cursor-light" aria-hidden="true" />
}
