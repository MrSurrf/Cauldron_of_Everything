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
}

/** Самостоятельная реплика: размеры не зависят от персонажа или режима guide. */
export function DialogueBubble({
  name, text = '', variant = 'wide', animated = true,
  step, total, onPrevious, onNext, onClose, nextLabel = 'Далее',
}: DialogueBubbleProps) {
  const titleId = useId()
  const [typed, setTyped] = useState({ text, count: 0 })
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const count = typed.text === text ? typed.count : 0
  const complete = !animated || reducedMotion || count >= text.length

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
    <section className={styles.bubble} data-variant={variant} aria-labelledby={titleId}>
      <svg className={styles.frame} viewBox="0 0 600 240" preserveAspectRatio="none" aria-hidden="true">
        <path className={styles.surface} d="M24 8 H576 L592 24 V204 L577 220 H88 L12 238 L30 208 L8 192 V26 Z" />
        <path className={styles.detail} d="M25 13 H574 L587 26 V201 L575 215 H86 L23 232 L36 207 L13 190 V28 Z M8 26 Q25 26 24 8 M576 8 Q576 24 592 24 M592 204 Q577 204 577 220" />
      </svg>
      <span className={styles.ornament} aria-hidden="true">◇</span>
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
          {!complete ? <button type="button" className={styles.reveal} onClick={() => setTyped({ text, count: text.length })}>Показать сразу</button>
            : onNext && <button type="button" className={styles.round} onClick={onNext} aria-label={nextLabel}>→</button>}
        </footer>}
      </div>
    </section>
  )
}
