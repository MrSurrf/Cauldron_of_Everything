import type { ReactNode } from 'react'

import styles from './FullscreenToolLayout.module.css'

export type FullscreenToolLayoutProps = {
  children: ReactNode
  className?: string
}

export function FullscreenToolLayout({
  children,
  className,
}: FullscreenToolLayoutProps) {
  const rootClassName = [
    styles.root,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClassName}>
      {children}
    </div>
  )
}
