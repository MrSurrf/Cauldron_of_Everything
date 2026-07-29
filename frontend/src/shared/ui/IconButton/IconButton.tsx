import { forwardRef } from 'react'

import { Button } from '../Button'
import type { IconButtonProps } from './IconButton.types'
import styles from './IconButton.module.css'

export const IconButton = forwardRef<
  HTMLButtonElement,
  IconButtonProps
>(function IconButton(
  {
    'aria-busy': ariaBusy,
    'aria-label': ariaLabel,
    className,
    disabled = false,
    icon,
    loading = false,
    size = 'md',
    type = 'button',
    variant = 'secondary',
    ...buttonProps
  },
  ref,
) {
  const buttonClassName = [
    styles.iconButton,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Button
      {...buttonProps}
      ref={ref}
      aria-busy={loading || ariaBusy}
      aria-label={ariaLabel}
      className={buttonClassName}
      data-icon-only={true}
      data-loading={loading || undefined}
      disabled={disabled || loading}
      icon={null}
      size={size}
      type={type}
      variant={variant}
    >
      <span
        className={styles.glyph}
        aria-hidden={true}
      >
        {loading ? (
          <span className={styles.spinner} />
        ) : icon}
      </span>
    </Button>
  )
})
