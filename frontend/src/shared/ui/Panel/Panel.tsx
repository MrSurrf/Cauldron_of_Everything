import { forwardRef } from 'react'

import type { PanelProps } from './Panel.types'
import styles from './Panel.module.css'

function DragIndicator() {
  return (
    <svg
      className={styles.dragIndicator}
      viewBox="0 0 192 12"
      aria-hidden={true}
      focusable="false"
    >
      <path
        className={styles.dragIndicatorLine}
        d="M1 6H61 M71 6H86 M106 6H121 M131 6H191"
      />
      <path
        className={styles.dragIndicatorPoint}
        d="M66 2.5 71 6 66 9.5 61 6Z"
      />
      <path
        className={styles.dragIndicatorCore}
        d="M96 1 106 6 96 11 86 6Z"
      />
      <path
        className={styles.dragIndicatorPoint}
        d="M126 2.5 131 6 126 9.5 121 6Z"
      />
    </svg>
  )
}

export const Panel = forwardRef<
  HTMLDivElement,
  PanelProps
>(function Panel(
  {
    children,
    className,
    padding = 'normal',
    variant = 'default',
    ...divProps
  },
  ref,
) {
  const rootClassName = [
    styles.panel,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      {...divProps}
      ref={ref}
      className={rootClassName}
      data-padding={padding}
      data-variant={variant}
    >
      <span
        className={styles.frame}
        aria-hidden={true}
      >
        <span className={styles.innerFrame} />
      </span>

      {variant === 'draggable' && (
        <DragIndicator />
      )}

      <div className={styles.content}>
        {children}
      </div>
    </div>
  )
})
