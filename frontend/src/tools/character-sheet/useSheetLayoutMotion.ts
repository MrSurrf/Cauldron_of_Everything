import { useLayoutEffect, useRef } from 'react'

/** Раскладка меняется один раз; между состояниями движется только transform. */
export function useSheetLayoutMotion(layoutKey: string, workspaceWidth: number) {
  const book = useRef<HTMLDivElement>(null)
  const pendingBounds = useRef<DOMRect | null>(null)
  const motion = useRef<Animation | null>(null)

  function captureLayout() {
    // При развороте перехода берём текущее видимое положение, а не его цель.
    pendingBounds.current = book.current?.getBoundingClientRect() ?? null
  }

  useLayoutEffect(() => {
    const element = book.current
    const before = pendingBounds.current
    pendingBounds.current = null
    motion.current?.cancel()
    motion.current = null
    if (!element) return
    delete element.dataset.layoutMoving

    if (!before || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const after = element.getBoundingClientRect()
    if (!before.width || !after.width) return
    const dx = (before.left + before.right - after.left - after.right) / 2
    const dy = before.top - after.top
    const ratio = before.width / after.width
    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01 && Math.abs(ratio - 1) < 0.00001) return

    const style = getComputedStyle(element)
    const target = style.transform
    const start = new DOMMatrix(target)
    // transform-origin: top center. Компенсируем новый центр и масштаб листа.
    start.a *= ratio
    start.d *= ratio
    start.e += dx
    start.f += dy
    const durationValue = style.getPropertyValue('--sheet-slide-duration').trim()
    const duration = Number.parseFloat(durationValue) * (durationValue.endsWith('ms') ? 1 : 1000)
    if (!Number.isFinite(duration) || duration <= 0) return

    element.dataset.layoutMoving = 'true'
    const animation = element.animate(
      [{ transform: start.toString() }, { transform: target }],
      { duration, easing: style.getPropertyValue('--sheet-slide-easing').trim() },
    )
    motion.current = animation
    const finish = () => {
      if (motion.current !== animation) return
      motion.current = null
      delete element.dataset.layoutMoving
    }
    animation.onfinish = finish
    animation.oncancel = finish
  }, [layoutKey, workspaceWidth])

  useLayoutEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const stop = () => {
      motion.current?.cancel()
      motion.current = null
      if (book.current) delete book.current.dataset.layoutMoving
    }
    const onPreferenceChange = () => { if (preference.matches) stop() }
    preference.addEventListener('change', onPreferenceChange)
    return () => {
      preference.removeEventListener('change', onPreferenceChange)
      stop()
    }
  }, [])

  return { book, captureLayout }
}
