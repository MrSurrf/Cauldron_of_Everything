import type {
  HTMLAttributes,
  ReactNode,
} from 'react'

import styles from './SheetSection.module.css'

export type SheetSectionProps = Omit<
  HTMLAttributes<HTMLElement>,
  'title'
> & {
  actions?: ReactNode
  children: ReactNode
  title?: ReactNode
}

export function SheetSection({
  actions,
  children,
  className,
  title,
  ...sectionProps
}: SheetSectionProps) {
  const rootClassName = [
    styles.section,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section
      {...sectionProps}
      className={rootClassName}
    >
      {(title || actions) && (
        <header className={styles.header}>
          {title && (
            <h2 className={styles.title}>
              {title}
            </h2>
          )}

          {actions && (
            <div className={styles.actions}>
              {actions}
            </div>
          )}
        </header>
      )}

      <div className={styles.content}>
        {children}
      </div>
    </section>
  )
}
