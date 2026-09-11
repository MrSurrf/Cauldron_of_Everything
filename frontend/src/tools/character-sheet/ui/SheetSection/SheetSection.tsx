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
  contentLayout?: 'default' | 'editor'
  title?: ReactNode
}

export function SheetSection({
  actions,
  children,
  className,
  contentLayout = 'default',
  title,
  ...sectionProps
}: SheetSectionProps) {
  const rootClassName = [
    styles.section,
    contentLayout === 'editor' ? styles.editorSection : undefined,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section
      {...sectionProps}
      className={rootClassName}
      data-content-layout={contentLayout}
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
