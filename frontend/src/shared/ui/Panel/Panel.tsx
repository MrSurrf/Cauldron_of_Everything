import { forwardRef } from 'react'

import type { PanelProps } from './Panel.types'
import styles from './Panel.module.css'

export const Panel = forwardRef<
  HTMLDivElement,
  PanelProps
>(function Panel(
  {
    children,
    className,
    padding = 'normal',
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
    >
      <span
        className={styles.frame}
        aria-hidden={true}
      >
        <span className={styles.innerFrame} />
      </span>

      <div className={styles.content}>
        {children}
      </div>
    </div>
  )
})
