import {
  forwardRef,
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type SyntheticEvent,
} from 'react'

import { IconButton } from '../IconButton'
import { isAriaInvalid } from '../internal/aria'
import { hasRenderableContent } from '../internal/react'
import { FieldFrame } from '../internal/field/FieldFrame'
import fieldFrameStyles from '../internal/field/FieldFrame.module.css'
import { FieldShell } from '../internal/field/FieldShell'
import { useTextControlState } from '../internal/field/useTextControlState'
import { ScrollSync } from '../ScrollBar/ScrollSync'
import { Tooltip } from '../Tooltip'
import styles from './TextArea.module.css'
import { TextFormattingToolbar } from '../internal/content/TextFormattingToolbar'
import {
  formatTextAreaSelection,
  type TextAreaSelection,
} from './textAreaFormatting'
import type {
  TextAreaFormatAction,
  TextAreaProps,
} from './TextArea.types'

const DEFAULT_MIN_TEXT_SCALE = 0.75
const DEFAULT_MAX_TEXT_SCALE = 1.5
const DEFAULT_TEXT_SCALE_STEP = 0.125

type TextAreaStyle = CSSProperties & {
  '--text-area-content-size'?: string
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
) {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  )
}

function normalizeScale(
  value: number | undefined,
  fallback: number,
) {
  return Number.isFinite(value) ? Number(value) : fallback
}

function setNativeTextAreaValue(
  textarea: HTMLTextAreaElement,
  value: string,
) {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    'value',
  )

  descriptor?.set?.call(textarea, value)
  textarea.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      data: value,
      inputType: 'insertText',
    }),
  )
}

function sameSelection(
  left: TextAreaSelection,
  right: TextAreaSelection,
) {
  return (
    left.start === right.start &&
    left.end === right.end
  )
}

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextAreaProps
>(function TextArea(
  {
    'aria-describedby': describedBy,
    'aria-errormessage': errorMessage,
    'aria-invalid': ariaInvalid,
    className,
    defaultTextScale = 1,
    defaultValue,
    disabled = false,
    error,
    fieldClassName,
    formatting,
    form,
    hint,
    icon,
    id,
    invalid = false,
    label,
    maxLength,
    maxTextScale = DEFAULT_MAX_TEXT_SCALE,
    minTextScale = DEFAULT_MIN_TEXT_SCALE,
    onFormat,
    onInput,
    onKeyDown,
    onKeyUp,
    onMouseUp,
    onSelect,
    onTextScaleChange,
    placeholder = 'Ваш текст...',
    readOnly = false,
    required = false,
    rootClassName,
    rows = 6,
    showCharacterCount = false,
    showTextScaleControls = false,
    style,
    textScale,
    textScaleStep = DEFAULT_TEXT_SCALE_STEP,
    topToolbar,
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
  const lowerScale = Math.min(
    normalizeScale(
      minTextScale,
      DEFAULT_MIN_TEXT_SCALE,
    ),
    normalizeScale(
      maxTextScale,
      DEFAULT_MAX_TEXT_SCALE,
    ),
  )
  const upperScale = Math.max(
    normalizeScale(
      minTextScale,
      DEFAULT_MIN_TEXT_SCALE,
    ),
    normalizeScale(
      maxTextScale,
      DEFAULT_MAX_TEXT_SCALE,
    ),
  )
  const [internalTextScale, setInternalTextScale] =
    useState(() =>
      clamp(
        normalizeScale(defaultTextScale, 1),
        lowerScale,
        upperScale,
      ),
    )
  const resolvedTextScale = clamp(
    normalizeScale(textScale, internalTextScale),
    lowerScale,
    upperScale,
  )
  const scaleEnabled =
    showTextScaleControls ||
    textScale !== undefined ||
    defaultTextScale !== 1
  const scaleStep = Math.max(
    0.01,
    Math.abs(
      normalizeScale(
        textScaleStep,
        DEFAULT_TEXT_SCALE_STEP,
      ),
    ),
  )
  const [selection, setSelection] =
    useState<TextAreaSelection>({
      end: 0,
      start: 0,
    })
  const hasTopToolbar = hasRenderableContent(topToolbar)
  const formattingEnabled = formatting === 'markdown'
  const hasSelection = selection.end > selection.start
  const counter =
    maxLength === undefined
      ? String(characterCount)
      : `${characterCount} / ${maxLength}`
  const scrollRefreshKey = useMemo(
    () => ({
      className,
      defaultValue,
      placeholder,
      resolvedTextScale,
      rows,
      value,
      wrap,
    }),
    [
      className,
      defaultValue,
      placeholder,
      resolvedTextScale,
      rows,
      value,
      wrap,
    ],
  )
  const textAreaStyle: TextAreaStyle | undefined =
    scaleEnabled
      ? {
          ...style,
          '--text-area-content-size': `${resolvedTextScale}em`,
        }
      : style

  const updateSelection = useCallback(
    (textarea: HTMLTextAreaElement) => {
      const nextSelection = {
        end: textarea.selectionEnd,
        start: textarea.selectionStart,
      }

      setSelection((current) =>
        sameSelection(current, nextSelection)
          ? current
          : nextSelection,
      )
    },
    [],
  )

  const applyFormat = useCallback(
    (action: TextAreaFormatAction) => {
      const textarea = controlRef.current

      if (!textarea || disabled || readOnly) {
        return
      }

      const result = formatTextAreaSelection(
        action,
        textarea.value,
        {
          end: textarea.selectionEnd,
          start: textarea.selectionStart,
        },
      )

      textarea.focus()
      setNativeTextAreaValue(textarea, result.value)
      textarea.setSelectionRange(
        result.selection.start,
        result.selection.end,
      )
      setSelection(result.selection)
      onFormat?.(action, result.value)

      textarea.ownerDocument.defaultView
        ?.requestAnimationFrame(() => {
          if (!textarea.isConnected) {
            return
          }

          textarea.focus()
          textarea.setSelectionRange(
            result.selection.start,
            result.selection.end,
          )
          updateSelection(textarea)
        })
    },
    [
      controlRef,
      disabled,
      onFormat,
      readOnly,
      updateSelection,
    ],
  )

  function handleTextAreaInput(
    event: FormEvent<HTMLTextAreaElement>,
  ) {
    handleInput(event)
    updateSelection(event.currentTarget)
  }

  function handleTextAreaSelect(
    event: SyntheticEvent<HTMLTextAreaElement>,
  ) {
    onSelect?.(event)
    updateSelection(event.currentTarget)
  }

  function handleTextAreaKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) {
    onKeyDown?.(event)

    if (
      event.defaultPrevented ||
      !formattingEnabled ||
      !(event.ctrlKey || event.metaKey)
    ) {
      return
    }

    const key = event.key.toLowerCase()
    const action =
      key === 'b'
        ? 'bold'
        : key === 'i'
          ? 'italic'
          : key === 'u'
            ? 'underline'
            : undefined

    if (!action) {
      return
    }

    event.preventDefault()
    applyFormat(action)
  }

  function handleTextAreaKeyUp(
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) {
    onKeyUp?.(event)
    updateSelection(event.currentTarget)
  }

  function handleTextAreaMouseUp(
    event: MouseEvent<HTMLTextAreaElement>,
  ) {
    onMouseUp?.(event)
    updateSelection(event.currentTarget)
  }

  function changeTextScale(direction: -1 | 1) {
    const nextScale = clamp(
      Math.round(
        (resolvedTextScale + direction * scaleStep) *
          1000,
      ) / 1000,
      lowerScale,
      upperScale,
    )

    if (textScale === undefined) {
      setInternalTextScale(nextScale)
    }

    onTextScaleChange?.(nextScale)
  }

  return (
    <FieldShell
      ariaInvalid={ariaInvalid}
      className={fieldClassName}
      controlId={controlId}
      counter={showCharacterCount ? counter : undefined}
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
          scaleEnabled ? styles.scaledControl : undefined,
          controlClassName,
          className,
        ]
          .filter(Boolean)
          .join(' ')
        const combinedFrameClassName = [
          frameClassName,
          rootClassName,
          hasTopToolbar
            ? styles.frameWithTopToolbar
            : undefined,
          showTextScaleControls
            ? styles.frameWithScaleControls
            : undefined,
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <div className={styles.editor}>
            {hasTopToolbar && (
              <div
                className={styles.topToolbar}
                role="toolbar"
                aria-label="Действия текстового поля"
              >
                {topToolbar}
              </div>
            )}

            <FieldFrame
              disabled={disabled}
              icon={icon}
              invalid={isAriaInvalid(
                controlProps['aria-invalid'],
              )}
              multiline={true}
              rootClassName={combinedFrameClassName}
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
                onInput={handleTextAreaInput}
                onKeyDown={handleTextAreaKeyDown}
                onKeyUp={handleTextAreaKeyUp}
                onMouseUp={handleTextAreaMouseUp}
                onSelect={handleTextAreaSelect}
                placeholder={placeholder}
                readOnly={readOnly}
                required={required}
                rows={rows}
                style={textAreaStyle}
                value={value}
                wrap={wrap}
              />

              <ScrollSync
                formOwnerKey={form}
                observeFormReset={true}
                observeInput={true}
                refreshKey={scrollRefreshKey}
                vertical={{
                  ariaLabel: 'Прокрутка текстового поля',
                  className:
                    fieldFrameStyles.multilineScrollBar,
                  decrementLabel: 'Прокрутить текст вверх',
                  disabled,
                  incrementLabel: 'Прокрутить текст вниз',
                }}
                viewportId={controlId}
                viewportRef={controlRef}
              />
            </FieldFrame>

            {formattingEnabled &&
              hasSelection &&
              !disabled &&
              !readOnly && (
                <TextFormattingToolbar
                  buttonClassName={styles.toolbarButton}
                  className={styles.formattingToolbar}
                  onAction={applyFormat}
                />
              )}

            {showTextScaleControls && (
              <div
                className={styles.scaleControls}
                role="group"
                aria-label="Размер текста"
                onMouseDown={(event) =>
                  event.preventDefault()
                }
              >
                <Tooltip content="Уменьшить текст">
                  <IconButton
                    aria-controls={controlId}
                    aria-label="Уменьшить текст"
                    className={styles.scaleButton}
                    disabled={
                      disabled ||
                      resolvedTextScale <= lowerScale
                    }
                    icon={
                      <span className={styles.scaleGlyph}>
                        −
                      </span>
                    }
                    onClick={() => changeTextScale(-1)}
                    size="sm"
                    variant="secondary"
                  />
                </Tooltip>

                <output
                  className={styles.scaleValue}
                  aria-live="polite"
                >
                  {Math.round(resolvedTextScale * 100)}%
                </output>

                <Tooltip content="Увеличить текст">
                  <IconButton
                    aria-controls={controlId}
                    aria-label="Увеличить текст"
                    className={styles.scaleButton}
                    disabled={
                      disabled ||
                      resolvedTextScale >= upperScale
                    }
                    icon={
                      <span className={styles.scaleGlyph}>
                        +
                      </span>
                    }
                    onClick={() => changeTextScale(1)}
                    size="sm"
                    variant="secondary"
                  />
                </Tooltip>
              </div>
            )}
          </div>
        )
      }}
    </FieldShell>
  )
})
