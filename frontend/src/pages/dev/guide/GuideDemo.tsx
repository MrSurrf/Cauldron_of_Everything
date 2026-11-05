import { useEffect, useRef, useState } from 'react'
import { DialogueBubble, GuideArrow } from '../../../shared/ui'
import wizzRight from '../../../../assets/Characters/Wizard/Wizard_explaning_to_right.png'
import wizzLeft from '../../../../assets/Characters/Wizard/Wizard_explaning_to_left.png'
import succiTease from '../../../../assets/Characters/Succi/Succi_Tease.png'
import succiIdk from '../../../../assets/Characters/Succi/Succi_idk.png'
import styles from './GuideDemo.module.css'

const steps = [
  { speaker: 'wizz', sprite: wizzRight, target: 'encyclopedia', text: 'Привет! Я Визз. Покажу, где искать нужное: начнём с энциклопедии в главном меню.' },
  { speaker: 'succi', sprite: succiTease, target: 'encyclopedia', text: 'А я Сукки! Энциклопедия — место, где можно найти дракона. Или причину пока его не искать.' },
  { speaker: 'wizz', sprite: wizzLeft, target: 'tools', text: 'Сукки, мы проводим экскурсию. В «Инструментах» находятся лист персонажа и опросник для нулевой сессии.' },
  { speaker: 'succi', sprite: succiIdk, target: 'tools', text: 'То есть здесь можно создать героя, а потом долго решать, какую ему дать причёску? Я всё правильно поняла?' },
  { speaker: 'wizz', sprite: wizzRight, target: 'profile', text: 'Почти. А здесь твой профиль: место для сведений о себе и своих игровых приключениях.' },
  { speaker: 'succi', sprite: succiTease, target: 'profile', text: 'И для лучшей фотографии! Ладно, Визз, не хмурься. Нажимай дальше — мы уже заканчиваем.' },
  { speaker: 'wizz', sprite: wizzLeft, target: 'profile', text: 'На этом знакомство завершено. Захочешь повторить — открой гид снова в Мастерской.' },
  { speaker: 'succi', sprite: succiIdk, target: 'profile', text: 'А я пока придумаю следующий маршрут. Может, в бестиарий? Что может пойти не так!' },
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
  const wizzSprite = [...steps.slice(0, stepIndex + 1)].reverse().find((entry) => entry.speaker === 'wizz')?.sprite ?? wizzRight
  const succiSprite = [...steps.slice(0, stepIndex + 1)].reverse().find((entry) => entry.speaker === 'succi')?.sprite ?? succiTease

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
          from: { x: bubble.left + bubble.width / 2, y: bubble.top - 12 },
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
  }, [step.target, step.speaker])

  return <dialog ref={dialogRef} className={styles.overlay} aria-label="Обучение с Виззом и Сукки" onCancel={(event) => { event.preventDefault(); onClose() }}>
    {!geometry && <div className={styles.shade} aria-hidden="true" />}
    {geometry && <>
      <div className={styles.spotlight} style={{ left: geometry.target.x, top: geometry.target.y, width: geometry.target.width, height: geometry.target.height }} aria-hidden="true" />
      <GuideArrow from={geometry.from} to={{ x: geometry.target.x + geometry.target.width / 2, y: geometry.target.y + geometry.target.height + 7 }} tone={step.speaker === 'succi' ? 'warm' : 'default'} />
    </>}
    <div className={styles.stage} data-speaker={step.speaker}>
      <div className={`${styles.character} ${styles.wizz}`} data-active={step.speaker === 'wizz'} aria-hidden="true"><img src={wizzSprite} alt="" /></div>
      <div className={`${styles.character} ${styles.succi}`} data-visible={stepIndex > 0} data-active={step.speaker === 'succi'} aria-hidden="true"><img src={succiSprite} alt="" /></div>
      <div className={styles.speech} ref={speechRef}>
        <p className={styles.mode}>GUIDE · Знакомство с мастерской</p>
        <DialogueBubble name={step.speaker === 'wizz' ? 'Визз' : 'Сукки'} text={step.text}
          tone={step.speaker === 'succi' ? 'warm' : 'default'} variant="wide" step={stepIndex + 1} total={steps.length}
          onClose={onClose}
          onPrevious={stepIndex > 0 ? () => setStepIndex((index) => index - 1) : undefined}
          onNext={stepIndex === steps.length - 1 ? onClose : () => setStepIndex((index) => index + 1)}
          nextLabel={stepIndex === steps.length - 1 ? 'Завершить обучение' : 'Следующая реплика'} />
        <p className={styles.hint}>Нажми на окно, чтобы показать реплику сразу · Esc — выйти</p>
      </div>
    </div>
  </dialog>
}
