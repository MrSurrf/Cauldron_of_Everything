import type { ReactNode } from 'react'

import styles from './TextFieldFrame.module.css'

type TextFieldFrameProps = {
  children: ReactNode
  disabled: boolean
  icon?: ReactNode
  multiline?: boolean
  rootClassName?: string
}

export function TextFieldFrame({
  children,
  disabled,
  icon,
  multiline = false,
  rootClassName,
}: TextFieldFrameProps) {
  const hasIcon = icon !== undefined && icon !== null
  const frameClassName = [styles.root, rootClassName]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={frameClassName}
      data-disabled={disabled || undefined}
      data-has-icon={hasIcon || undefined}
      data-multiline={multiline || undefined}
    >
      <span
        className={styles.innerFrame}
        aria-hidden={true}
      />

      {children}

      {hasIcon && (
        <span
          className={styles.icon}
          aria-hidden={true}
        >
          {icon}
        </span>
      )}
    </div>
  )
}
