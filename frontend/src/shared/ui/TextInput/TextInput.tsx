import {
  forwardRef,
  type CSSProperties,
} from 'react'

import { isAriaInvalid } from '../internal/aria'
import { hasRenderableContent } from '../internal/react'
import fieldFrameStyles from '../internal/field/FieldFrame.module.css'
import { FieldFrame } from '../internal/field/FieldFrame'
import { FieldShell } from '../internal/field/FieldShell'
import { useTextControlState } from '../internal/field/useTextControlState'
import type { TextInputProps } from './TextInput.types'

type TextInputStyle = CSSProperties & {
  '--field-counter-reserve'?: string
}

function joinClassNames(
  ...classNames: Array<string | undefined>
) {
  return classNames.filter(Boolean).join(' ')
}

export const TextInput = forwardRef<
  HTMLInputElement,
  TextInputProps
>(function TextInput(
  {
    'aria-describedby': userDescribedBy,
    'aria-errormessage': userErrorMessage,
    'aria-invalid': userAriaInvalid,
    className,
    defaultValue,
    disabled = false,
    error,
    fieldClassName,
    form,
    hint,
    icon,
    id,
    invalid = false,
    label,
    maxLength,
    onInput,
    placeholder = 'Ваш текст...',
    readOnly = false,
    required = false,
    rootClassName,
    showCharacterCount = false,
    type = 'text',
    value,
    ...inputProps
  },
  ref,
) {
  const {
    characterCount,
    controlId,
    handleInput,
    overCharacterLimit,
    setControlRef,
  } = useTextControlState<HTMLInputElement>({
    defaultValue,
    form,
    forwardedRef: ref,
    id,
    idPrefix: 'text-input',
    maxLength,
    onInput,
    value,
  })
  const counterText =
    maxLength === undefined
      ? String(characterCount)
      : `${characterCount} / ${maxLength}`
  const fieldStyle:
    | TextInputStyle
    | undefined = showCharacterCount
    ? {
        '--field-counter-reserve':
          `max(calc(${counterText.length}ch + var(--space-4)), calc(var(--space-7) + var(--space-5)))`,
      }
    : undefined

  return (
    <FieldShell
      ariaInvalid={userAriaInvalid}
      className={fieldClassName}
      controlId={controlId}
      counter={
        showCharacterCount
          ? counterText
          : undefined
      }
      describedBy={userDescribedBy}
      disabled={disabled}
      error={error}
      errorMessage={userErrorMessage}
      filled={characterCount > 0}
      hasIcon={hasRenderableContent(icon)}
      hint={hint}
      invalid={invalid || overCharacterLimit}
      label={label}
      readOnly={readOnly}
      required={required}
      style={fieldStyle}
    >
      {({
        controlClassName,
        controlProps,
        frameClassName,
      }) => (
        <FieldFrame
          disabled={disabled}
          icon={icon}
          invalid={isAriaInvalid(
            controlProps['aria-invalid'],
          )}
          rootClassName={joinClassNames(
            frameClassName,
            rootClassName,
          )}
        >
          <input
            {...inputProps}
            {...controlProps}
            ref={setControlRef}
            className={joinClassNames(
              fieldFrameStyles.control,
              fieldFrameStyles.singleLine,
              controlClassName,
              className,
            )}
            defaultValue={defaultValue}
            disabled={disabled}
            form={form}
            maxLength={maxLength}
            onInput={handleInput}
            placeholder={placeholder}
            readOnly={readOnly}
            required={required}
            type={type}
            value={value}
          />
        </FieldFrame>
      )}
    </FieldShell>
  )
})
