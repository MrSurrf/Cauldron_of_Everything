import {
  forwardRef,
  useCallback,
  useId,
  useRef,
  type AnimationEvent,
  type ClipboardEvent,
  type CSSProperties,
  type FocusEvent,
  type ForwardedRef,
  type InputEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

import { TextArea } from '../TextArea'
import type { TextAreaProps } from '../TextArea'
import {
  isAriaInvalid,
  mergeAriaIds,
} from '../TextField/aria'
import { TextInput } from '../TextInput'
import type { TextInputProps } from '../TextInput'
import styles from './FormField.module.css'
import type {
  FormFieldComponent,
  FormFieldProps,
} from './FormField.types'
import {
  useFormFieldState,
  type FormFieldControl,
} from './useFormFieldState'

type FormFieldStyle = CSSProperties & {
  '--form-field-counter-reserve'?: string
}

type FormFieldEventHandler<Event> = (
  event: Event,
) => void

function callEventHandler<Event>(
  handler: unknown,
  event: Event,
) {
  const eventHandler = handler as
    | FormFieldEventHandler<Event>
    | undefined

  eventHandler?.(event)
}

function hasContent(value: ReactNode): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0
  }

  return (
    value !== undefined &&
    value !== null &&
    value !== false
  )
}

function setForwardedRef<T>(
  ref: ForwardedRef<T>,
  value: T | null,
) {
  if (typeof ref === 'function') {
    ref(value)
  } else if (ref) {
    ref.current = value
  }
}

const FormFieldImplementation = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  FormFieldProps
>(function FormField(
  {
    as = 'input',
    error,
    fieldClassName,
    hint,
    invalid = false,
    label,
    showCharacterCount = false,
    validationKey,
    ...controlProps
  },
  ref,
) {
  const generatedId = useId()
  const controlRef = useRef<
    HTMLInputElement | HTMLTextAreaElement
  >(null)
  const controlId =
    controlProps.id ??
    `form-field-${generatedId}`
  const hintId = `${controlId}-hint`
  const errorId = `${controlId}-error`
  const counterId = `${controlId}-counter`
  const hasLabel = hasContent(label)
  const hasError = hasContent(error)
  const hasHint = hasContent(hint)
  const hasIcon = hasContent(
    controlProps.icon,
  )
  const message = hasError ? error : hint
  const messageId = hasError
    ? errorId
    : hasHint
      ? hintId
      : undefined
  const {
    'aria-describedby': userDescribedBy,
    'aria-errormessage': userErrorMessage,
    'aria-invalid': userAriaInvalid,
    defaultValue,
    disabled = false,
    maxLength,
    onBeforeInput,
    onBlur,
    onInput,
    onKeyDown,
    onPaste,
    readOnly = false,
    required = false,
    value,
  } = controlProps
  const externalInvalid =
    invalid ||
    hasError ||
    isAriaInvalid(userAriaInvalid)
  const {
    characterCount,
    characterLimit,
    cancelInputAttempt,
    clearLimitFeedback,
    completeFeedback,
    feedbackPhase,
    handleBeforeInput: trackBeforeInput,
    handleKeyDown: trackKeyDown,
    handlePaste: trackPaste,
    handleValueInput,
    limitAnnouncement,
    limitAnnouncementVersion,
    semanticInvalid,
  } = useFormFieldState({
    controlKind: as,
    controlRef,
    defaultValue,
    disabled,
    form: controlProps.form,
    invalid: externalInvalid,
    maxLength,
    readOnly,
    validationKey,
    value,
  })
  const describedBy = mergeAriaIds(
    userDescribedBy,
    messageId,
    showCharacterCount
      ? counterId
      : undefined,
  )
  const errorMessage = mergeAriaIds(
    userErrorMessage,
    hasError ? errorId : undefined,
  )
  const fieldClassNames = [
    styles.field,
    fieldClassName,
  ]
    .filter(Boolean)
    .join(' ')
  const showSupportingRow =
    hasError || hasHint
  const counterText =
    characterLimit === undefined
      ? String(characterCount)
      : `${characterCount} / ${characterLimit}`
  const fieldStyle:
    | FormFieldStyle
    | undefined =
    showCharacterCount && as !== 'textarea'
    ? {
        '--form-field-counter-reserve':
          `max(calc(${counterText.length}ch + var(--space-4)), calc(var(--space-7) + var(--space-5)))`,
      }
    : undefined
  const controlClassName = [
    styles.formControl,
    controlProps.className,
  ]
    .filter(Boolean)
    .join(' ')
  const frameClassName = [
    styles.formFrame,
    controlProps.rootClassName,
  ]
    .filter(Boolean)
    .join(' ')
  const setControlRef = useCallback(
    (
      node:
        | HTMLInputElement
        | HTMLTextAreaElement
        | null,
    ) => {
      controlRef.current = node
      setForwardedRef(ref, node)
    },
    [ref],
  )

  function handleInput(
    event: InputEvent<FormFieldControl>,
  ) {
    handleValueInput(event)
    callEventHandler(onInput, event)
  }

  function handleControlBeforeInput(
    event: InputEvent<FormFieldControl>,
  ) {
    callEventHandler(onBeforeInput, event)

    if (event.defaultPrevented) {
      cancelInputAttempt()
      return
    }

    trackBeforeInput(event)
  }

  function handleControlBlur(
    event: FocusEvent<FormFieldControl>,
  ) {
    callEventHandler(onBlur, event)

    clearLimitFeedback()
  }

  function handleControlKeyDown(
    event: KeyboardEvent<FormFieldControl>,
  ) {
    callEventHandler(onKeyDown, event)

    if (!event.defaultPrevented) {
      trackKeyDown(event)
    }
  }

  function handleControlPaste(
    event: ClipboardEvent<FormFieldControl>,
  ) {
    callEventHandler(onPaste, event)

    if (!event.defaultPrevented) {
      trackPaste(event)
    }
  }

  function handleFeedbackAnimationEnd(
    event: AnimationEvent<HTMLDivElement>,
  ) {
    if (event.currentTarget === event.target) {
      completeFeedback()
    }
  }

  const sharedControlProps = {
    ...controlProps,
    id: controlId,
    'aria-describedby': describedBy,
    'aria-errormessage': errorMessage,
    'aria-invalid': semanticInvalid
      ? true
      : userAriaInvalid,
    className: controlClassName,
    maxLength: characterLimit,
    onBeforeInput: handleControlBeforeInput,
    onBlur: handleControlBlur,
    onInput: handleInput,
    onKeyDown: handleControlKeyDown,
    onPaste: handleControlPaste,
    rootClassName: frameClassName,
  }

  return (
    <div
      className={fieldClassNames}
      data-disabled={disabled || undefined}
      data-filled={
        characterCount > 0 || undefined
      }
      data-has-counter={
        showCharacterCount || undefined
      }
      data-has-icon={hasIcon || undefined}
      data-has-label={hasLabel || undefined}
      data-feedback={feedbackPhase}
      data-invalid={semanticInvalid || undefined}
      data-multiline={
        as === 'textarea' || undefined
      }
      data-readonly={readOnly || undefined}
      data-required={required || undefined}
      style={fieldStyle}
    >
      <div
        className={styles.controlShell}
        onAnimationEnd={
          handleFeedbackAnimationEnd
        }
      >
        {as === 'textarea' ? (
          <TextArea
            {...(sharedControlProps as TextAreaProps)}
            ref={setControlRef}
          />
        ) : (
          <TextInput
            {...(sharedControlProps as TextInputProps)}
            ref={setControlRef}
          />
        )}

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

        {showCharacterCount && (
          <span
            id={counterId}
            className={styles.counter}
          >
            {counterText}
          </span>
        )}

        {limitAnnouncement && (
          <span
            key={limitAnnouncementVersion}
            className={styles.visuallyHidden}
            role="status"
            aria-live="polite"
          >
            {limitAnnouncement}
          </span>
        )}
      </div>

      {showSupportingRow && (
        <div className={styles.supportingRow}>
          {(hasError || hasHint) && (
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
          )}
        </div>
      )}
    </div>
  )
})

export const FormField =
  FormFieldImplementation as FormFieldComponent
