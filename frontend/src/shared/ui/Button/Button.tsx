import { forwardRef } from 'react'

import { PlaceholderIcon } from '../icons/PlaceholderIcon'
import type { ButtonProps } from './Button.types'
import styles from './Button.module.css'

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      className,
      decoration = 'ornate',
      fullWidth = false,
      icon,
      size = 'hero',
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
        data-decoration={decoration}
        data-size={size}
        data-variant={variant}
        type={type}
      >
        {decoration === 'ornate' && (
          <>
            <span
              className={styles.innerFrame}
              data-button-inner-frame={true}
              aria-hidden={true}
            />

            <span
              className={styles.cornerShapes}
              data-button-corner-shapes={true}
              aria-hidden={true}
            >
              <span className={styles.cornerShape} />
              <span className={styles.cornerShape} />
              <span className={styles.cornerShape} />
              <span className={styles.cornerShape} />
            </span>
          </>
        )}

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
