import { useEffect, useRef, useState } from 'react'
import { DialogueBubble, GuideArrow } from '../../../shared/ui'
import wizardUrl from '../../../../assets/Characters/Wizard/Wizard_explaning_to_right.png'
import styles from './GuideDemo.module.css'

const steps = [
  { target: 'encyclopedia', text: 'Привет! Я Визз. Начнём с энциклопедии: здесь можно найти заклинания, существ и правила. Этот раздел живёт в главном меню.' },
  { target: 'tools', text: 'В «Инструментах» тебя ждут лист персонажа и опросник для нулевой сессии. Выбери нужный инструмент — и можно готовиться к игре!' },
  { target: 'profile', text: 'А здесь — твой профиль. На этом первая прогулка закончена! Если захочешь повторить её, позови меня из Мастерской.' },
] as const

type Geometry = {
  target: { x: number; y: number; width: number; height: number }
  from: { x: number; y: number }
}

export function GuideDemo({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const speechRef = useRef<HTMLDivElement>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [geometry, setGeometry] = useState<Geometry | null>(null)
  const step = steps[stepIndex]

  useEffect(() => {
    const dialog = dialogRef.current!
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [])

  useEffect(() => {
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const candidates = [document.querySelector<HTMLElement>(`[data-guide-target="${step.target}"]`), document.querySelector<HTMLElement>('[data-guide-target="mobile-menu"]')]
        const target = candidates.find((element) => {
          if (!element) return false
          const rect = element.getBoundingClientRect()
          return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight
        })
        const bubble = speechRef.current?.getBoundingClientRect()
        if (!target || !bubble) { setGeometry(null); return }
        const rect = target.getBoundingClientRect()
        const x = Math.max(4, rect.left - 6)
        const y = Math.max(4, rect.top - 6)
        setGeometry({
          target: { x, y, width: Math.min(window.innerWidth - 4, rect.right + 6) - x, height: Math.min(window.innerHeight - 4, rect.bottom + 6) - y },
          from: { x: bubble.left + bubble.width * 0.7, y: bubble.top - 12 },
        })
      })
    }
    const observer = new ResizeObserver(measure)
    if (speechRef.current) observer.observe(speechRef.current)
    const header = document.querySelector('header')
    if (header) observer.observe(header)
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step.target])

  return <dialog ref={dialogRef} className={styles.overlay} aria-label="Обучение с Виззом" onCancel={(event) => { event.preventDefault(); onClose() }}>
    {!geometry && <div className={styles.shade} aria-hidden="true" />}
    {geometry && <>
      <div className={styles.spotlight} style={{ left: geometry.target.x, top: geometry.target.y, width: geometry.target.width, height: geometry.target.height }} aria-hidden="true" />
      <GuideArrow from={geometry.from} to={{ x: geometry.target.x + geometry.target.width / 2, y: geometry.target.y + geometry.target.height + 7 }} />
    </>}
    <div className={styles.stage}>
      <div className={styles.character} aria-hidden="true"><img src={wizardUrl} alt="" /></div>
      <div className={styles.speech} ref={speechRef}>
        <p className={styles.mode}>GUIDE · Знакомство с мастерской</p>
        <DialogueBubble name="Визз" text={step.text} variant="wide" step={stepIndex + 1} total={steps.length}
          onClose={onClose}
          onPrevious={stepIndex > 0 ? () => setStepIndex((index) => index - 1) : undefined}
          onNext={stepIndex === steps.length - 1 ? onClose : () => setStepIndex((index) => index + 1)}
          nextLabel={stepIndex === steps.length - 1 ? 'Завершить обучение' : 'Следующая реплика'} />
        <p className={styles.hint}>Esc — выйти · «Показать сразу» — пропустить набор</p>
      </div>
    </div>
  </dialog>
}
