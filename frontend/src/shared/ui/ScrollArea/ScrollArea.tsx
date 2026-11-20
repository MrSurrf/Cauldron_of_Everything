import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
} from 'react'

import { ScrollSync } from '../ScrollBar/ScrollSync'
import styles from './ScrollArea.module.css'
import type {
  ScrollAreaOrientation,
  ScrollAreaProps,
} from './ScrollArea.types'

function includesAxis(
  orientation: ScrollAreaOrientation,
  axis: 'horizontal' | 'vertical',
) {
  return (
    orientation === axis ||
    orientation === 'both'
  )
}

export const ScrollArea = forwardRef<
  HTMLDivElement,
  ScrollAreaProps
>(function ScrollArea(
  {
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    children,
    className,
    contentClassName,
    horizontalScrollBarLabel,
    id,
    orientation = 'vertical',
    role,
    rootClassName,
    rootStyle,
    style,
    tabIndex,
    verticalScrollBarLabel,
    ...viewportProps
  },
  ref,
) {
  const generatedId = useId()
  const viewportId = id ?? generatedId
  const viewportRef =
    useRef<HTMLDivElement>(null)
  const contentRef =
    useRef<HTMLDivElement>(null)
  const wheelTargetRef = useRef<{ position: number; time: number } | null>(null)
  const horizontalEnabled = includesAxis(
    orientation,
    'horizontal',
  )
  const verticalEnabled = includesAxis(
    orientation,
    'vertical',
  )
  const resolvedRootClassName = [
    styles.root,
    rootClassName,
  ]
    .filter(Boolean)
    .join(' ')
  const resolvedViewportClassName = [
    styles.viewport,
    className,
  ]
    .filter(Boolean)
    .join(' ')
  const resolvedContentClassName = [
    styles.content,
    contentClassName,
  ]
    .filter(Boolean)
    .join(' ')
  const verticalLabel =
    verticalScrollBarLabel ??
    (ariaLabel
      ? `Вертикальная прокрутка: ${ariaLabel}`
      : 'Вертикальная прокрутка области')
  const horizontalLabel =
    horizontalScrollBarLabel ??
    (ariaLabel
      ? `Горизонтальная прокрутка: ${ariaLabel}`
      : 'Горизонтальная прокрутка области')
  const hasAccessibleName = Boolean(
    ariaLabel || ariaLabelledBy,
  )

  const setViewportRef = useCallback(
    (node: HTMLDivElement | null) => {
      viewportRef.current = node

      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    },
    [ref],
  )

  useEffect(() => {
    if (orientation !== 'horizontal') return
    const viewport = viewportRef.current
    if (!viewport) return

    function handleWheel(event: WheelEvent) {
      if (!viewport || event.defaultPrevented || event.ctrlKey || event.shiftKey) return
      // Тачпад уже передаёт горизонтальную ось браузеру напрямую.
      if (Math.abs(event.deltaX) >= Math.abs(event.deltaY) || event.deltaY === 0) return
      // Вложенное вертикальное поле сохраняет собственную прокрутку.
      let target = event.target
      while (target instanceof Element && target !== viewport) {
        if (target.scrollHeight > target.clientHeight + 1 &&
            /auto|scroll/.test(getComputedStyle(target).overflowY)) return
        target = target.parentElement
      }

      const maximum = viewport.scrollWidth - viewport.clientWidth
      if (maximum <= 1 || viewport.scrollHeight > viewport.clientHeight + 1) return
      const direction = Math.sign(event.deltaY)
      const current = viewport.scrollLeft
      if ((direction < 0 && current <= 1) || (direction > 0 && current >= maximum - 1)) {
        wheelTargetRef.current = null
        return
      }

      const lineHeight = Number.parseFloat(getComputedStyle(viewport).lineHeight)
      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? Number.isFinite(lineHeight) ? lineHeight : 20
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? viewport.clientWidth : 1
      const now = performance.now()
      const pending = wheelTargetRef.current
      const origin = pending && now - pending.time < 200 ? pending.position : current
      const next = Math.min(maximum, Math.max(0, origin + event.deltaY * unit))
      if (next === origin && Math.abs(current - next) <= 1) return

      event.preventDefault()
      wheelTargetRef.current = { position: next, time: now }
      viewport.scrollTo({
        left: next,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      })
    }

    viewport.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      viewport.removeEventListener('wheel', handleWheel)
      wheelTargetRef.current = null
    }
  }, [orientation])

  return (
    <div
      className={resolvedRootClassName}
      data-orientation={orientation}
      style={rootStyle}
    >
      <div
        {...viewportProps}
        ref={setViewportRef}
        id={viewportId}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={resolvedViewportClassName}
        role={role ?? (hasAccessibleName ? 'region' : undefined)}
        style={style}
        tabIndex={tabIndex ?? (hasAccessibleName ? 0 : undefined)}
      >
        <div
          ref={contentRef}
          className={resolvedContentClassName}
        >
          {children}
        </div>
      </div>

      <ScrollSync
        contentRef={contentRef}
        horizontal={
          horizontalEnabled
            ? {
                ariaLabel: horizontalLabel,
                className:
                  styles.horizontalScrollBar,
                slotClassName:
                  styles.horizontalSlot,
              }
            : undefined
        }
        vertical={
          verticalEnabled
            ? {
                ariaLabel: verticalLabel,
                className:
                  styles.verticalScrollBar,
                slotClassName:
                  styles.verticalSlot,
              }
            : undefined
        }
        viewportId={viewportId}
        viewportRef={viewportRef}
      />

      {orientation === 'both' && (
        <span
          className={styles.corner}
          aria-hidden={true}
        />
      )}
    </div>
  )
})
