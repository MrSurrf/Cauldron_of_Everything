import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type FormEventHandler,
  type ForwardedRef,
} from 'react'

import { setRef } from '../react'

type TextControl =
  | HTMLInputElement
  | HTMLTextAreaElement

type UseTextControlStateOptions<
  Control extends TextControl,
> = {
  defaultValue: unknown
  form?: string
  forwardedRef: ForwardedRef<Control>
  id?: string
  idPrefix: string
  maxLength?: number
  onInput?: FormEventHandler<Control>
  value: unknown
}

function getValueLength(value: unknown) {
  return value === undefined || value === null
    ? 0
    : String(value).length
}

export function useTextControlState<
  Control extends TextControl,
>({
  defaultValue,
  form,
  forwardedRef,
  id,
  idPrefix,
  maxLength,
  onInput,
  value,
}: UseTextControlStateOptions<Control>) {
  const generatedId = useId()
  const controlRef = useRef<Control>(null)
  const controlled = value !== undefined
  const [uncontrolledCount, setUncontrolledCount] =
    useState(() => getValueLength(defaultValue))
  const characterCount = controlled
    ? getValueLength(value)
    : uncontrolledCount
  const overCharacterLimit =
    typeof maxLength === 'number' &&
    Number.isFinite(maxLength) &&
    maxLength >= 0 &&
    characterCount > maxLength
  const controlId =
    id ?? `${idPrefix}-${generatedId}`

  const setControlRef = useCallback(
    (node: Control | null) => {
      controlRef.current = node
      setRef(forwardedRef, node)
    },
    [forwardedRef],
  )

  const handleInput = useCallback(
    (event: FormEvent<Control>) => {
      if (!controlled) {
        setUncontrolledCount(
          event.currentTarget.value.length,
        )
      }

      onInput?.(event)
    },
    [controlled, onInput],
  )

  useEffect(() => {
    if (controlled) {
      return
    }

    const ownerForm = controlRef.current?.form

    if (!ownerForm) {
      return
    }

    let resetTimer:
      | ReturnType<typeof setTimeout>
      | undefined

    function handleReset() {
      clearTimeout(resetTimer)
      resetTimer = setTimeout(() => {
        setUncontrolledCount(
          controlRef.current?.value.length ?? 0,
        )
      }, 0)
    }

    ownerForm.addEventListener('reset', handleReset)

    return () => {
      ownerForm.removeEventListener(
        'reset',
        handleReset,
      )
      clearTimeout(resetTimer)
    }
  }, [controlled, form])

  return {
    characterCount,
    controlId,
    controlRef,
    handleInput,
    overCharacterLimit,
    setControlRef,
  }
}
