import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'

import { mergeAriaIds } from '../internal/aria'
import { hasRenderableContent, setRef } from '../internal/react'
import { SelectionMarker } from '../SelectionMarker'
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
    indicator,
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
  const controlledChecked = inputProps.checked
  const defaultChecked = inputProps.defaultChecked
  const [uncontrolledChecked, setUncontrolledChecked] = useState(
    Boolean(defaultChecked),
  )
  const hasDescription = hasRenderableContent(description)
  const hasCustomIndicator = hasRenderableContent(indicator)
  const hasCopy = hasRenderableContent(label) || hasDescription
  const checked = controlledChecked ?? uncontrolledChecked

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
  })

  useEffect(() => {
    const input = inputRef.current
    const form = input?.form

    if (!input || !form || controlledChecked !== undefined) {
      return
    }

    const handleReset = (event: Event) => {
      queueMicrotask(() => {
        if (!event.defaultPrevented) {
          setUncontrolledChecked(input.defaultChecked)
        }
      })
    }

    form.addEventListener('reset', handleReset)
    return () => form.removeEventListener('reset', handleReset)
  }, [controlledChecked, defaultChecked])

  function handleChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    if (inputProps.checked === undefined) {
      setUncontrolledChecked(event.currentTarget.checked)
    }
    onChange?.(event)
    onCheckedChange?.(event.currentTarget.checked, event)
  }

  const rootClasses = [styles.root, rootClassName]
    .filter(Boolean)
    .join(' ')
  const inputClasses = [styles.input, className]
    .filter(Boolean)
    .join(' ')
  const markerState = indeterminate
    ? 'mixed'
    : checked
      ? 'checked'
      : 'unchecked'

  return (
    <label
      className={rootClasses}
      data-checkbox-root
      data-disabled={disabled || undefined}
      data-has-copy={hasCopy || undefined}
      data-indicator={hasCustomIndicator ? 'custom' : 'marker'}
      data-state={markerState}
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

      {hasCustomIndicator ? (
        <span
          className={styles.indicator}
          data-checkbox-indicator
          aria-hidden="true"
        >
          {indicator}
        </span>
      ) : (
        <SelectionMarker
          className={styles.marker}
          state={markerState}
        />
      )}

      {hasCopy && (
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
