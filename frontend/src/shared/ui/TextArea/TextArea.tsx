import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type InputEvent as ReactInputEvent,
  type UIEvent,
} from 'react'

import { ScrollBar } from '../ScrollBar'
import { isAriaInvalid } from '../TextField/aria'
import { TextFieldFrame } from '../TextField/TextFieldFrame'
import styles from '../TextField/TextFieldFrame.module.css'
import type { TextAreaProps } from './TextArea.types'

type ScrollMetrics = {
  max: number
  step: number
  value: number
}

const emptyScrollMetrics: ScrollMetrics = {
  max: 0,
  step: 1,
  value: 0,
}

function readScrollMetrics(
  textarea: HTMLTextAreaElement,
): ScrollMetrics {
  const max = Math.max(
    0,
    textarea.scrollHeight - textarea.clientHeight,
  )
  const value = Math.min(
    Math.max(Math.round(textarea.scrollTop), 0),
    max,
  )
  const lineHeight = Number.parseFloat(
    getComputedStyle(textarea).lineHeight,
  )

  return {
    max,
    step:
      Number.isFinite(lineHeight) && lineHeight > 0
        ? Math.max(1, Math.round(lineHeight))
        : 1,
    value,
  }
}

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextAreaProps
>(function TextArea(
  {
    'aria-invalid': ariaInvalid,
    className,
    disabled = false,
    form,
    icon,
    id,
    onInput,
    onScroll,
    placeholder = 'Ваш текст...',
    rootClassName,
    rows = 6,
    value,
    wrap = 'soft',
    ...textareaProps
  },
  ref,
) {
  const generatedId = useId()
  const textareaId = id ?? generatedId
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [scrollMetrics, setScrollMetrics] = useState(
    emptyScrollMetrics,
  )
  const textareaClassName = [
    styles.control,
    styles.multiline,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const setTextareaRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node

      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    },
    [ref],
  )

  const updateScrollMetrics = useCallback(
    (node = textareaRef.current) => {
      if (!node) {
        return
      }

      const next = readScrollMetrics(node)

      setScrollMetrics((current) =>
        current.max === next.max &&
        current.step === next.step &&
        current.value === next.value
          ? current
          : next,
      )
    },
    [],
  )

  useLayoutEffect(() => {
    updateScrollMetrics()
  })

  useLayoutEffect(() => {
    const node = textareaRef.current

    if (!node || typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver(() => {
      updateScrollMetrics(node)
    })

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [updateScrollMetrics])

  useEffect(() => {
    const node = textareaRef.current
    const ownerForm = node?.form

    if (!node || !ownerForm) {
      return
    }

    let resetTimer:
      | ReturnType<typeof setTimeout>
      | undefined

    function handleReset() {
      if (resetTimer !== undefined) {
        clearTimeout(resetTimer)
      }

      resetTimer = setTimeout(() => {
        updateScrollMetrics(node)
      }, 0)
    }

    ownerForm.addEventListener('reset', handleReset)

    return () => {
      ownerForm.removeEventListener(
        'reset',
        handleReset,
      )

      if (resetTimer !== undefined) {
        clearTimeout(resetTimer)
      }
    }
  }, [form, updateScrollMetrics])

  function handleInput(
    event: ReactInputEvent<HTMLTextAreaElement>,
  ) {
    onInput?.(event)
    updateScrollMetrics(event.currentTarget)
  }

  function handleScroll(
    event: UIEvent<HTMLTextAreaElement>,
  ) {
    onScroll?.(event)
    updateScrollMetrics(event.currentTarget)
  }

  function handleScrollBarChange(value: number) {
    const node = textareaRef.current

    if (!node) {
      return
    }

    node.scrollTop = value
    updateScrollMetrics(node)
  }

  return (
    <TextFieldFrame
      disabled={disabled}
      icon={icon}
      invalid={isAriaInvalid(ariaInvalid)}
      multiline={true}
      rootClassName={rootClassName}
    >
      <textarea
        {...textareaProps}
        ref={setTextareaRef}
        id={textareaId}
        aria-invalid={ariaInvalid}
        className={textareaClassName}
        disabled={disabled}
        form={form}
        onInput={handleInput}
        onScroll={handleScroll}
        placeholder={placeholder}
        rows={rows}
        value={value}
        wrap={wrap}
      />

      {scrollMetrics.max > 0 && (
        <ScrollBar
          aria-controls={textareaId}
          aria-label={'Прокрутка текстового поля'}
          className={styles.multilineScrollBar}
          decrementLabel={'Прокрутить текст вверх'}
          disabled={disabled}
          incrementLabel={'Прокрутить текст вниз'}
          max={scrollMetrics.max}
          min={0}
          onValueChange={handleScrollBarChange}
          orientation={'vertical'}
          step={scrollMetrics.step}
          value={scrollMetrics.value}
        />
      )}
    </TextFieldFrame>
  )
})
