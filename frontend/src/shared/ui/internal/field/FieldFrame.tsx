import {
  forwardRef,
  type ReactNode,
} from 'react'

import styles from './FieldFrame.module.css'
import type { FieldControlProps } from './field.types'
import { hasRenderableContent } from '../react'

type FieldFrameProps =
  FieldControlProps & {
    children: ReactNode
    disabled: boolean
    invalid?: boolean
    multiline?: boolean
  }

type MultilineContentGuardProps = {
  position: 'bottom' | 'top'
}

function MultilineContentGuard({
  position,
}: MultilineContentGuardProps) {
  const className = [
    styles.multilineContentGuard,
    position === 'top'
      ? styles.multilineContentGuardTop
      : styles.multilineContentGuardBottom,
  ].join(' ')

  return (
    <span
      className={className}
      data-text-field-content-guard={
        position
      }
      aria-hidden={true}
    >
      <span
        className={
          styles.multilineContentGuardInner
        }
      />
    </span>
  )
}

export const FieldFrame = forwardRef<
  HTMLDivElement,
  FieldFrameProps
>(function FieldFrame(
  {
    children,
    disabled,
    icon,
    invalid = false,
    multiline = false,
    rootClassName,
  },
  ref,
) {
  const hasIcon = hasRenderableContent(icon)
  const frameClassName = [styles.root, rootClassName]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={ref}
      className={frameClassName}
      data-disabled={disabled || undefined}
      data-has-icon={hasIcon || undefined}
      data-invalid={invalid || undefined}
      data-multiline={multiline || undefined}
    >
      <span
        className={styles.innerFrame}
        aria-hidden={true}
      />

      {children}

      {multiline && (
        <>
          <MultilineContentGuard position="top" />
          <MultilineContentGuard position="bottom" />
        </>
      )}

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
})
