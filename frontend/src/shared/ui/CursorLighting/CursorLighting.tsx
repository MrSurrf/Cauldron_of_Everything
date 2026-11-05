import { useEffect } from 'react'

import { trackCursorLighting } from './trackCursorLighting'
import './CursorLighting.css'

/** Общий контроллер фонового света и обводок, без слоя поверх интерфейса. */
export function CursorLighting() {
  useEffect(() => trackCursorLighting(), [])
  return null
}
