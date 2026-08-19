import {
  forwardRef,
  useCallback,
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
    rootClassName,
    rootStyle,
    style,
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
        style={style}
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
