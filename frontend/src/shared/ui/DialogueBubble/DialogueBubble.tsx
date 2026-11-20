import { useEffect, useId, useState } from 'react'
import styles from './DialogueBubble.module.css'

export type DialogueBubbleProps = {
  name: string
  text?: string
  variant?: 'compact' | 'wide' | 'story' | 'waiting'
  animated?: boolean
  step?: number
  total?: number
  onPrevious?: () => void
  onNext?: () => void
  onClose?: () => void
  nextLabel?: string
  tone?: 'default' | 'warm'
}

/** Самостоятельная реплика: размеры не зависят от персонажа или режима guide. */
export function DialogueBubble({
  name, text = '', variant = 'wide', animated = true,
  step, total, onPrevious, onNext, onClose, nextLabel = 'Далее', tone = 'default',
}: DialogueBubbleProps) {
  const titleId = useId()
  const [typed, setTyped] = useState({ text, count: 0 })
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const count = typed.text === text ? typed.count : 0
  const complete = !animated || reducedMotion || count >= text.length
  const reveal = () => setTyped({ text, count: text.length })

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(preference.matches)
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (complete || variant === 'waiting') return
    const timer = window.setInterval(() => {
      setTyped((current) => ({ text, count: current.text === text ? Math.min(current.count + 1, text.length) : 1 }))
    }, 28)
    return () => window.clearInterval(timer)
  }, [text, complete, variant])

  return (
    <section className={styles.bubble} data-variant={variant} data-tone={tone} data-typing={!complete}
      aria-labelledby={titleId}
      aria-description={!complete ? 'Нажмите Enter или пробел, чтобы показать реплику целиком' : undefined}
      tabIndex={!complete ? 0 : undefined}
      onClick={(event) => {
        if (!complete && !(event.target instanceof Element && event.target.closest('button'))) reveal()
      }}
      onKeyDown={(event) => {
        if (!complete && event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          reveal()
        }
      }}>
      <span className={styles.ornament} aria-hidden="true" />
      <div className={styles.content}>
        <h2 id={titleId} className={styles.name}>{name}</h2>
        {onClose && <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть диалог">×</button>}
        {variant === 'waiting' ? <p className={styles.waiting} role="status" aria-label={`${name} думает`}><span>•</span><span>•</span><span>•</span></p> : (
          <>
            <p className={styles.text} aria-hidden="true">
              <span className={styles.reserve}>{text}</span>
              <span>{complete ? text : text.slice(0, count)}{!complete && <span className={styles.cursor}>▌</span>}</span>
            </p>
            <p className={styles.srOnly} aria-live="polite" aria-atomic="true">{text}</p>
          </>
        )}
        {variant !== 'waiting' && <footer className={styles.controls}>
          {step !== undefined && total !== undefined && <span className={styles.counter}>{step} / {total}</span>}
          {onPrevious && <button type="button" className={styles.round} onClick={onPrevious} aria-label="Предыдущая реплика">←</button>}
          {complete && onNext && <button type="button" className={styles.round} onClick={onNext} aria-label={nextLabel}>→</button>}
        </footer>}
      </div>
    </section>
  )
}
