import {
  forwardRef,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
} from 'react'

import { mergeAriaIds } from '../internal/aria'
import { hasRenderableContent, setRef } from '../internal/react'
import type { CheckboxProps } from './Checkbox.types'
import styles from './Checkbox.module.css'

export const Checkbox = forwardRef<
  HTMLInputElement,
  CheckboxProps
>(function Checkbox(
  {
    'aria-describedby': describedBy,
    className,
    description,
    disabled = false,
    id,
    indeterminate = false,
    label,
    onChange,
    onCheckedChange,
    rootClassName,
    ...inputProps
  },
  ref,
) {
  const generatedId = useId()
  const controlId = id ?? `checkbox-${generatedId}`
  const descriptionId = `${controlId}-description`
  const inputRef = useRef<HTMLInputElement>(null)
  const hasDescription = hasRenderableContent(description)

  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node
      setRef(ref, node)
    },
    [ref],
  )

  useLayoutEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate
    }
  }, [indeterminate])

  function handleChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    onChange?.(event)
    onCheckedChange?.(event.currentTarget.checked, event)
  }

  const rootClasses = [styles.root, rootClassName]
    .filter(Boolean)
    .join(' ')
  const inputClasses = [styles.input, className]
    .filter(Boolean)
    .join(' ')

  return (
    <label
      className={rootClasses}
      data-disabled={disabled || undefined}
    >
      <input
        {...inputProps}
        ref={setInputRef}
        id={controlId}
        type="checkbox"
        className={inputClasses}
        disabled={disabled}
        aria-checked={
          indeterminate ? 'mixed' : undefined
        }
        aria-describedby={mergeAriaIds(
          describedBy,
          hasDescription ? descriptionId : undefined,
        )}
        data-indeterminate={indeterminate || undefined}
        onChange={handleChange}
      />

      {(hasRenderableContent(label) || hasDescription) && (
        <span className={styles.copy}>
          {hasRenderableContent(label) && (
            <span className={styles.label}>{label}</span>
          )}

          {hasDescription && (
            <span
              id={descriptionId}
              className={styles.description}
            >
              {description}
            </span>
          )}
        </span>
      )}
    </label>
  )
})
