import { createContext, useContext, useEffect, useRef, useState, type DragEvent } from 'react'
import type { CharacterEncyclopediaEntry, CharacterEncyclopediaMode } from './characterEncyclopediaDrag'

type CharacterEncyclopediaDragState = {
  entry: CharacterEncyclopediaEntry | null
  session: number
  beginDrag: (event: DragEvent<HTMLElement>, entry: CharacterEncyclopediaEntry) => void
}

export const CharacterEncyclopediaDragContext = createContext<CharacterEncyclopediaDragState>({
  entry: null,
  session: 0,
  beginDrag: () => undefined,
})

export function useCharacterEncyclopediaDrag() {
  return useContext(CharacterEncyclopediaDragContext)
}

/** Подсказки не участвуют в импорте: каждый приёмник сохраняет свои обработчики. */
export function useCharacterEncyclopediaDropTarget(mode: CharacterEncyclopediaMode, enabled = true, level?: number) {
  const { entry, session } = useCharacterEncyclopediaDrag()
  const [hoveredSession, setHoveredSession] = useState<number | null>(null)
  const [received, setReceived] = useState(false)
  const feedbackTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(feedbackTimer.current), [])

  const available = enabled && entry?.entityType === mode
    && (mode !== 'spell' || level === undefined || entry.level === null || entry.level === level)

  return {
    available,
    active: enabled && hoveredSession === session,
    received,
    setActive: (value: boolean) => setHoveredSession(value ? session : null),
    receive: () => {
      setHoveredSession(null)
      setReceived(true)
      window.clearTimeout(feedbackTimer.current)
      feedbackTimer.current = window.setTimeout(() => setReceived(false), 520)
    },
  }
}
