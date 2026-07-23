import { forwardRef } from 'react'

import type { ButtonProps } from './Button.types'
import styles from './Button.module.css'

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      className,
      fullWidth = false,
      showArrow,
      type = 'button',
      variant = 'primary',
      ...buttonProps
    },
    ref,
  ) {
    const hasArrow =
      variant === 'primary' && (showArrow ?? true)

    const buttonClassName = [
      styles.button,
      fullWidth ? styles.fullWidth : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <button
        {...buttonProps}
        ref={ref}
        className={buttonClassName}
        data-variant={variant}
        type={type}
      >
        <span className={styles.label}>
          {children}
        </span>

        {hasArrow && (
          <span
            className={styles.arrow}
            aria-hidden="true"
          />
        )}
      </button>
    )
  },
)
