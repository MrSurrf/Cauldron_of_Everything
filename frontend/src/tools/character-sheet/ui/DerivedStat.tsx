import type { ReactNode } from 'react'

import { TextInput } from '../../../shared/ui'
import styles from './stats.module.css'

export type DerivedStatProps = {
  actions?: ReactNode
  error?: string
  formula?: string
  label: string
  onValueChange?: (value: string) => void
  suffix?: ReactNode
  value: number | string | null
}

export function DerivedStat({
  actions,
  error,
  formula,
  label,
  onValueChange,
  suffix,
  value,
}: DerivedStatProps) {
  return (
    <div className={styles.derivedStat}>
      <div className={styles.derivedHeader}>
        <span className={styles.label}>{label}</span>
        {actions}
      </div>

      {onValueChange ? (
        <TextInput
          aria-label={label}
          className={`${styles.compactControl} ${styles.statInput}`}
          inputMode="decimal"
          invalid={Boolean(error)}
          rootClassName={styles.compactFrame}
          value={value ?? ''}
          onChange={(event) => {
            onValueChange(event.currentTarget.value)
          }}
        />
      ) : (
        <div className={styles.valueRow}>
          <output className={styles.value} aria-label={label}>
            {value ?? '—'}
          </output>
          {suffix && <span className={styles.suffix}>{suffix}</span>}
        </div>
      )}

      {formula && (
        <code className={styles.formula} title={formula}>
          {formula}
        </code>
      )}

      {error && (
        <p className={styles.error} role="status">
          {error}
        </p>
      )}
    </div>
  )
}
