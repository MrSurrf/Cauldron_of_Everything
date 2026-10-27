import { useCallback, useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import type { CharacterEncyclopediaEntry } from './characterEncyclopediaDrag'
import { CharacterEncyclopediaDragContext } from './useCharacterEncyclopediaDrag'
import styles from './characterEncyclopediaDragFeedback.module.css'

/** Состояние жеста изолировано от документа персонажа и библиотеки кампании. */
export function CharacterEncyclopediaDragProvider({ children }: { children: ReactNode }) {
  const [drag, setDrag] = useState<{ entry: CharacterEncyclopediaEntry | null; session: number }>({ entry: null, session: 0 })
  const preview = useRef<HTMLElement | null>(null)
  const previewFrame = useRef<number | undefined>(undefined)

  const removePreview = useCallback(() => {
    if (previewFrame.current !== undefined) cancelAnimationFrame(previewFrame.current)
    preview.current?.remove()
    preview.current = null
    previewFrame.current = undefined
  }, [])

  const clearDrag = useCallback(() => {
    removePreview()
    setDrag(current => ({ entry: null, session: current.session + 1 }))
  }, [removePreview])

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') clearDrag() }
    window.addEventListener('drop', clearDrag, true)
    window.addEventListener('dragend', clearDrag, true)
    window.addEventListener('blur', clearDrag)
    window.addEventListener('keydown', onEscape)
    return () => {
      removePreview()
      window.removeEventListener('drop', clearDrag, true)
      window.removeEventListener('dragend', clearDrag, true)
      window.removeEventListener('blur', clearDrag)
      window.removeEventListener('keydown', onEscape)
    }
  }, [clearDrag, removePreview])

  function beginDrag(event: DragEvent<HTMLElement>, entry: CharacterEncyclopediaEntry) {
    removePreview()
    const source = event.currentTarget
    const card = source.cloneNode(true) as HTMLElement
    card.classList.add(styles.preview)
    card.style.width = `${Math.min(320, source.getBoundingClientRect().width)}px`
    card.setAttribute('aria-hidden', 'true')
    card.inert = true
    document.body.append(card)
    preview.current = card
    event.dataTransfer.setDragImage(card, 20, 16)
    // Браузер снимет карточку в конце dragstart; затем копия больше не нужна.
    previewFrame.current = requestAnimationFrame(removePreview)
    setDrag(current => ({ entry, session: current.session + 1 }))
  }

  return <CharacterEncyclopediaDragContext.Provider value={{ ...drag, beginDrag }}>
    {children}
  </CharacterEncyclopediaDragContext.Provider>
}
