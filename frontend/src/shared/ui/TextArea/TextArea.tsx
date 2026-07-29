import {
  forwardRef,
  useMemo,
} from 'react'

import { isAriaInvalid } from '../internal/aria'
import { hasRenderableContent } from '../internal/react'
import { FieldFrame } from '../internal/field/FieldFrame'
import fieldFrameStyles from '../internal/field/FieldFrame.module.css'
import { FieldShell } from '../internal/field/FieldShell'
import { useTextControlState } from '../internal/field/useTextControlState'
import { ScrollSync } from '../ScrollBar/ScrollSync'
import type { TextAreaProps } from './TextArea.types'

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextAreaProps
>(function TextArea(
  {
    'aria-describedby': describedBy,
    'aria-errormessage': errorMessage,
    'aria-invalid': ariaInvalid,
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
    rows = 6,
    showCharacterCount = false,
    value,
    wrap = 'soft',
    ...textareaProps
  },
  ref,
) {
  const {
    characterCount,
    controlId,
    controlRef,
    handleInput,
    overCharacterLimit,
    setControlRef,
  } = useTextControlState<HTMLTextAreaElement>({
    defaultValue,
    form,
    forwardedRef: ref,
    id,
    idPrefix: 'text-area',
    maxLength,
    onInput,
    value,
  })
  const counter =
    maxLength === undefined
      ? String(characterCount)
      : `${characterCount} / ${maxLength}`
  const scrollRefreshKey = useMemo(
    () => ({
      className,
      defaultValue,
      placeholder,
      rows,
      value,
      wrap,
    }),
    [
      className,
      defaultValue,
      placeholder,
      rows,
      value,
      wrap,
    ],
  )

  return (
    <FieldShell
      ariaInvalid={ariaInvalid}
      className={fieldClassName}
      controlId={controlId}
      counter={
        showCharacterCount
          ? counter
          : undefined
      }
      describedBy={describedBy}
      disabled={disabled}
      error={error}
      errorMessage={errorMessage}
      filled={characterCount > 0}
      hasIcon={hasRenderableContent(icon)}
      hint={hint}
      invalid={invalid || overCharacterLimit}
      label={label}
      multiline={true}
      readOnly={readOnly}
      required={required}
    >
      {({
        controlClassName,
        controlProps,
        frameClassName,
      }) => {
        const textareaClassName = [
          fieldFrameStyles.control,
          fieldFrameStyles.multiline,
          controlClassName,
          className,
        ]
          .filter(Boolean)
          .join(' ')
        const combinedFrameClassName = [
          frameClassName,
          rootClassName,
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <FieldFrame
            disabled={disabled}
            icon={icon}
            invalid={isAriaInvalid(
              controlProps['aria-invalid'],
            )}
            multiline={true}
            rootClassName={
              combinedFrameClassName
            }
          >
            <textarea
              {...textareaProps}
              {...controlProps}
              ref={setControlRef}
              className={textareaClassName}
              defaultValue={defaultValue}
              disabled={disabled}
              form={form}
              maxLength={maxLength}
              onInput={handleInput}
              placeholder={placeholder}
              readOnly={readOnly}
              required={required}
              rows={rows}
              value={value}
              wrap={wrap}
            />

            <ScrollSync
              formOwnerKey={form}
              observeFormReset={true}
              observeInput={true}
              refreshKey={scrollRefreshKey}
              vertical={{
                ariaLabel:
                  'Прокрутка текстового поля',
                className:
                  fieldFrameStyles.multilineScrollBar,
                decrementLabel:
                  'Прокрутить текст вверх',
                disabled,
                incrementLabel:
                  'Прокрутить текст вниз',
              }}
              viewportId={controlId}
              viewportRef={controlRef}
            />
          </FieldFrame>
        )
      }}
    </FieldShell>
  )
})
