import { useId } from 'react'

import {
  isAriaInvalid,
  mergeAriaIds,
} from '../aria'
import { hasRenderableContent } from '../react'
import styles from './FieldShell.module.css'
import type { FieldShellProps } from './FieldShell.types'

export function FieldShell({
  ariaInvalid,
  children,
  className,
  controlId: providedControlId,
  counter,
  counterId: providedCounterId,
  describedBy: userDescribedBy,
  disabled = false,
  error,
  errorMessage: userErrorMessage,
  filled = false,
  hasIcon = false,
  hint,
  invalid = false,
  label,
  multiline = false,
  readOnly = false,
  required = false,
  style,
}: FieldShellProps) {
  const generatedId = useId()
  const controlId =
    providedControlId ??
    `field-shell-${generatedId}`
  const hintId = `${controlId}-hint`
  const errorId = `${controlId}-error`
  const counterId =
    providedCounterId ?? `${controlId}-counter`
  const hasLabel = hasRenderableContent(label)
  const hasError = hasRenderableContent(error)
  const hasHint = hasRenderableContent(hint)
  const hasCounter =
    hasRenderableContent(counter)
  const message = hasError ? error : hint
  const messageId = hasError
    ? errorId
    : hasHint
      ? hintId
      : undefined
  const semanticInvalid =
    invalid ||
    hasError ||
    isAriaInvalid(ariaInvalid)
  const describedBy = mergeAriaIds(
    userDescribedBy,
    messageId,
    hasCounter ? counterId : undefined,
  )
  const errorMessage = mergeAriaIds(
    userErrorMessage,
    hasError ? errorId : undefined,
  )
  const fieldClassName = [
    styles.field,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={fieldClassName}
      data-disabled={disabled || undefined}
      data-filled={filled || undefined}
      data-has-counter={hasCounter || undefined}
      data-has-icon={hasIcon || undefined}
      data-has-label={hasLabel || undefined}
      data-invalid={semanticInvalid || undefined}
      data-multiline={multiline || undefined}
      data-readonly={readOnly || undefined}
      data-required={required || undefined}
      style={style}
    >
      <div className={styles.controlShell}>
        {children({
          controlClassName: styles.formControl,
          controlProps: {
            id: controlId,
            'aria-describedby': describedBy,
            'aria-errormessage': errorMessage,
            'aria-invalid': semanticInvalid
              ? true
              : ariaInvalid,
          },
          frameClassName: styles.formFrame,
        })}

        {hasLabel && (
          <label
            className={styles.label}
            htmlFor={controlId}
          >
            <span className={styles.labelText}>
              {label}
            </span>

            {required && (
              <span
                className={styles.requiredMarker}
                aria-hidden={true}
              >
                *
              </span>
            )}
          </label>
        )}

        {hasCounter && (
          <span
            id={counterId}
            className={styles.counter}
          >
            {counter}
          </span>
        )}
      </div>

      {(hasError || hasHint) && (
        <div className={styles.supportingRow}>
          <p
            id={messageId}
            className={[
              styles.message,
              hasError && styles.error,
            ]
              .filter(Boolean)
              .join(' ')}
            aria-live={
              hasError ? 'polite' : undefined
            }
          >
            {message}
          </p>
        </div>
      )}
    </div>
  )
}
