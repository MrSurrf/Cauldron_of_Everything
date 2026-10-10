import type { HTMLAttributes, ReactNode } from 'react'

import styles from './ListCard.module.css'

export type ListCardProps = HTMLAttributes<HTMLSpanElement> & {
  name: string
  metric?: string
  metricLabel?: string
  tags?: readonly string[]
  icon?: ReactNode
  appearance?: 'default' | 'navigation'
}

export function ListCard({ name, metric, metricLabel, tags = [], icon, appearance = 'default', className, ...props }: ListCardProps) {
  const metadata = tags.filter(Boolean).join(' · ')

  return (
    <span {...props} data-appearance={appearance} className={[styles.root, metric === undefined && !icon ? styles.withoutMetric : '', className].filter(Boolean).join(' ')}>
      {icon && metric === undefined && <span className={styles.icon} aria-hidden="true">{icon}</span>}
      {metric !== undefined && <span className={styles.metric} aria-label={metricLabel} title={metricLabel}>{metric}</span>}
      <span className={styles.content}>
        <strong className={styles.name} title={name}>{name}</strong>
        {metadata && <small className={styles.tags}>{metadata}</small>}
      </span>
    </span>
  )
}
