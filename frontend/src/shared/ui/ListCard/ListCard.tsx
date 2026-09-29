import type { HTMLAttributes } from 'react'

import styles from './ListCard.module.css'

export type ListCardProps = HTMLAttributes<HTMLSpanElement> & {
  name: string
  metric: string
  metricLabel?: string
  tags?: readonly string[]
}

export function ListCard({ name, metric, metricLabel, tags = [], className, ...props }: ListCardProps) {
  const metadata = tags.filter(Boolean).join(' · ')

  return (
    <span {...props} className={[styles.root, className].filter(Boolean).join(' ')}>
      <span className={styles.metric} aria-label={metricLabel} title={metricLabel}>{metric}</span>
      <span className={styles.content}>
        <strong className={styles.name} title={name}>{name}</strong>
        {metadata && <small className={styles.tags}>{metadata}</small>}
      </span>
    </span>
  )
}
