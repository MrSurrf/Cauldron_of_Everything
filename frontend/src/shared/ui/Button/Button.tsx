import { forwardRef } from 'react'

import { PlaceholderIcon } from '../icons/PlaceholderIcon'
import type { ButtonProps } from './Button.types'
import styles from './Button.module.css'

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      className,
      fullWidth = false,
      icon,
      type = 'button',
      variant = 'primary',
      ...buttonProps
    },
    ref,
  ) {
    const renderedIcon =
      icon === undefined && variant === 'primary'
        ? <PlaceholderIcon />
        : icon

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
        <span
          className={styles.innerFrame}
          aria-hidden={true}
        />

        <span
          className={styles.cornerShapes}
          aria-hidden={true}
        >
          <span className={styles.cornerShape} />
          <span className={styles.cornerShape} />
          <span className={styles.cornerShape} />
          <span className={styles.cornerShape} />
        </span>

        <span className={styles.content}>
          <span className={styles.label}>
            {children}
          </span>

          {renderedIcon && (
            <span
              className={styles.icon}
              aria-hidden={true}
            >
              {renderedIcon}
            </span>
          )}
        </span>
      </button>
    )
  },
)
