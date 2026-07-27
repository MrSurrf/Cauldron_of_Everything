import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type InputEvent as ReactInputEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react'

export type FormFieldControl =
  | HTMLInputElement
  | HTMLTextAreaElement

export type ValidationFeedbackPhase =
  | 'idle'
  | 'shaking'
  | 'shaking-danger'
  | 'danger'

const insertionEventWindowMs = 250

type UseFormFieldStateOptions = {
  controlKind: 'input' | 'textarea'
  controlRef: RefObject<FormFieldControl | null>
  defaultValue: unknown
  disabled: boolean
  form?: string
  invalid: boolean
  maxLength?: number
  readOnly: boolean
  validationKey?: number | string
  value: unknown
}

function getValueLength(value: unknown): number {
  if (value === undefined || value === null) {
    return 0
  }

  return String(value).length
}

function normalizeCharacterLimit(
  maxLength: number | undefined,
): number | undefined {
  return (
      typeof maxLength === 'number' &&
      Number.isFinite(maxLength) &&
      maxLength >= 0
    )
    ? maxLength
    : undefined
}

function getInsertedText(
  event: ReactInputEvent<FormFieldControl>,
): string | undefined {
  const nativeEvent =
    event.nativeEvent as globalThis.InputEvent
  const inputType = nativeEvent.inputType

  if (
    nativeEvent.isComposing ||
    !inputType?.startsWith('insert')
  ) {
    return undefined
  }

  if (
    nativeEvent.inputType ===
      'insertLineBreak' ||
    nativeEvent.inputType ===
      'insertParagraph'
  ) {
    return '\n'
  }

  return (
    nativeEvent.data ??
    nativeEvent.dataTransfer?.getData(
      'text/plain',
    ) ??
    undefined
  )
}

function wouldExceedCharacterLimit(
  control: FormFieldControl,
  insertedText: string,
  characterLimit: number,
): boolean | 'unknown' {
  const selectionStart = control.selectionStart
  const selectionEnd = control.selectionEnd

  if (
    selectionStart === null ||
    selectionEnd === null
  ) {
    return insertedText.length >
      characterLimit
      ? true
      : 'unknown'
  }

  const nextLength =
    control.value.length -
    (selectionEnd - selectionStart) +
    insertedText.length

  return nextLength > characterLimit
}

export function useFormFieldState({
  controlKind,
  controlRef,
  defaultValue,
  disabled,
  form,
  invalid,
  maxLength,
  readOnly,
  validationKey,
  value,
}: UseFormFieldStateOptions) {
  const controlled =
    value !== undefined && value !== null
  const characterLimit =
    normalizeCharacterLimit(maxLength)
  const [
    uncontrolledState,
    setUncontrolledState,
  ] = useState(() => ({
    controlKind,
    length: getValueLength(defaultValue),
  }))
  let uncontrolledLength =
    uncontrolledState.length

  if (
    uncontrolledState.controlKind !==
    controlKind
  ) {
    uncontrolledLength =
      getValueLength(defaultValue)
    setUncontrolledState({
      controlKind,
      length: uncontrolledLength,
    })
  }

  const characterCount = controlled
    ? getValueLength(value)
    : uncontrolledLength
  const overCharacterLimit =
    characterLimit !== undefined &&
    characterCount > characterLimit
  const semanticInvalid =
    invalid || overCharacterLimit
  const feedbackEnabled =
    !disabled && !readOnly
  const [
    limitAnnouncementLimit,
    setLimitAnnouncementLimit,
  ] = useState<number | undefined>()
  const [
    limitAnnouncementVersion,
    setLimitAnnouncementVersion,
  ] = useState(0)
  const [
    feedbackPhase,
    setFeedbackPhase,
  ] = useState<ValidationFeedbackPhase>(
    () =>
      semanticInvalid ? 'danger' : 'idle',
  )
  const semanticInvalidRef =
    useRef(semanticInvalid)
  const limitFeedbackRef =
    useRef(false)
  const previousSemanticInvalidRef =
    useRef(semanticInvalid)
  const previousValidationKeyRef =
    useRef(validationKey)
  const previousCharacterLimitRef =
    useRef(characterLimit)
  const previousControlledValueRef =
    useRef(value)
  const ignoreNextBeforeInputRef =
    useRef(false)
  const retainFeedbackDuringInputRef =
    useRef(false)
  const preserveControlledFeedbackRef =
    useRef(false)
  const inputAttemptStartedFeedbackRef =
    useRef(false)
  const pendingUnknownInsertionRef =
    useRef<
      | {
          insertedLength: number
          timer: ReturnType<
            typeof setTimeout
          >
        }
      | undefined
    >(undefined)
  const ignoreBeforeInputTimerRef =
    useRef<
      ReturnType<typeof setTimeout> | undefined
    >(undefined)
  const retainFeedbackTimerRef =
    useRef<
      ReturnType<typeof setTimeout> | undefined
    >(undefined)

  const beginFeedback = useCallback(() => {
    if (!feedbackEnabled) {
      setFeedbackPhase(
        semanticInvalidRef.current ||
          limitFeedbackRef.current
          ? 'danger'
          : 'idle',
      )
      return
    }

    setFeedbackPhase((current) => {
      if (
        current === 'shaking' ||
        current === 'shaking-danger'
      ) {
        return current
      }

      return current === 'danger'
        ? 'shaking-danger'
        : 'shaking'
    })
  }, [feedbackEnabled])

  const completeFeedback =
    useCallback(() => {
      setFeedbackPhase((current) => {
        if (
          current !== 'shaking' &&
          current !== 'shaking-danger'
        ) {
          return current
        }

        return (
            semanticInvalidRef.current ||
            limitFeedbackRef.current
          )
          ? 'danger'
          : 'idle'
      })
    }, [])

  const clearLimitFeedback =
    useCallback(() => {
      limitFeedbackRef.current = false
      retainFeedbackDuringInputRef.current =
        false
      preserveControlledFeedbackRef.current =
        false
      inputAttemptStartedFeedbackRef.current =
        false
      ignoreNextBeforeInputRef.current = false

      if (
        pendingUnknownInsertionRef.current
      ) {
        clearTimeout(
          pendingUnknownInsertionRef.current
            .timer,
        )
        pendingUnknownInsertionRef.current =
          undefined
      }

      if (
        ignoreBeforeInputTimerRef.current !==
        undefined
      ) {
        clearTimeout(
          ignoreBeforeInputTimerRef.current,
        )
        ignoreBeforeInputTimerRef.current =
          undefined
      }

      if (
        retainFeedbackTimerRef.current !==
        undefined
      ) {
        clearTimeout(
          retainFeedbackTimerRef.current,
        )
        retainFeedbackTimerRef.current =
          undefined
      }

      setLimitAnnouncementLimit(undefined)

      if (!semanticInvalidRef.current) {
        setFeedbackPhase('idle')
      }
    }, [])

  const reportCharacterLimit =
    useCallback(() => {
      if (
        !feedbackEnabled ||
        limitFeedbackRef.current
      ) {
        return false
      }

      limitFeedbackRef.current = true
      setLimitAnnouncementLimit(
        characterLimit,
      )
      setLimitAnnouncementVersion(
        (current) => current + 1,
      )
      beginFeedback()
      return true
    }, [
      beginFeedback,
      characterLimit,
      feedbackEnabled,
    ])

  const ignoreNextBeforeInput =
    useCallback(() => {
      inputAttemptStartedFeedbackRef.current =
        false
      ignoreNextBeforeInputRef.current = true

      if (
        ignoreBeforeInputTimerRef.current !==
        undefined
      ) {
        clearTimeout(
          ignoreBeforeInputTimerRef.current,
        )
      }

      ignoreBeforeInputTimerRef.current =
        setTimeout(() => {
          ignoreNextBeforeInputRef.current =
            false
          inputAttemptStartedFeedbackRef.current =
            false
          ignoreBeforeInputTimerRef.current =
            undefined
        }, 0)
    }, [])

  const retainFeedbackDuringInput =
    useCallback(() => {
      retainFeedbackDuringInputRef.current =
        true

      if (
        retainFeedbackTimerRef.current !==
        undefined
      ) {
        clearTimeout(
          retainFeedbackTimerRef.current,
        )
      }

      retainFeedbackTimerRef.current =
        setTimeout(() => {
          retainFeedbackDuringInputRef.current =
            false
          retainFeedbackTimerRef.current =
            undefined
        }, insertionEventWindowMs)
    }, [])

  const deferUnknownInsertion =
    useCallback(
      (insertedText: string) => {
        if (
          pendingUnknownInsertionRef.current
        ) {
          clearTimeout(
            pendingUnknownInsertionRef.current
              .timer,
          )
        }

        const pendingInsertion = {
          insertedLength:
            insertedText.length,
          timer: setTimeout(() => {
            if (
              pendingUnknownInsertionRef.current !==
              pendingInsertion
            ) {
              return
            }

            pendingUnknownInsertionRef.current =
              undefined
            reportCharacterLimit()
          }, 0),
        }

        pendingUnknownInsertionRef.current =
          pendingInsertion
      },
      [reportCharacterLimit],
    )

  const cancelInputAttempt =
    useCallback(() => {
      const startedFeedback =
        inputAttemptStartedFeedbackRef.current

      inputAttemptStartedFeedbackRef.current =
        false
      ignoreNextBeforeInputRef.current = false
      retainFeedbackDuringInputRef.current =
        false

      if (
        pendingUnknownInsertionRef.current
      ) {
        clearTimeout(
          pendingUnknownInsertionRef.current
            .timer,
        )
        pendingUnknownInsertionRef.current =
          undefined
      }

      if (
        ignoreBeforeInputTimerRef.current !==
        undefined
      ) {
        clearTimeout(
          ignoreBeforeInputTimerRef.current,
        )
        ignoreBeforeInputTimerRef.current =
          undefined
      }

      if (
        retainFeedbackTimerRef.current !==
        undefined
      ) {
        clearTimeout(
          retainFeedbackTimerRef.current,
        )
        retainFeedbackTimerRef.current =
          undefined
      }

      if (!startedFeedback) {
        return
      }

      limitFeedbackRef.current = false
      setLimitAnnouncementLimit(undefined)
      setFeedbackPhase(
        semanticInvalidRef.current
          ? 'danger'
          : 'idle',
      )
    }, [])

  useLayoutEffect(() => {
    const wasInvalid =
      previousSemanticInvalidRef.current

    previousSemanticInvalidRef.current =
      semanticInvalid
    semanticInvalidRef.current =
      semanticInvalid

    if (!feedbackEnabled) {
      return
    }

    if (!wasInvalid && semanticInvalid) {
      beginFeedback()
    } else if (
      wasInvalid &&
      !semanticInvalid &&
      !limitFeedbackRef.current
    ) {
      setFeedbackPhase('idle')
    }
  }, [
    beginFeedback,
    feedbackEnabled,
    semanticInvalid,
  ])

  useEffect(() => {
    if (feedbackEnabled) {
      return
    }

    limitFeedbackRef.current = false
    const clearTimer = setTimeout(() => {
      setLimitAnnouncementLimit(undefined)
      setFeedbackPhase(
        semanticInvalid ? 'danger' : 'idle',
      )
    }, 0)

    return () => {
      clearTimeout(clearTimer)
    }
  }, [feedbackEnabled, semanticInvalid])

  useEffect(() => {
    const characterLimitChanged =
      previousCharacterLimitRef.current !==
      characterLimit
    const controlledValueChanged =
      controlled &&
      !Object.is(
        previousControlledValueRef.current,
        value,
      )
    const valueIsBelowLimit =
      characterLimit !== undefined &&
      characterCount < characterLimit
    const preserveControlledFeedback =
      controlledValueChanged &&
      preserveControlledFeedbackRef.current

    if (controlledValueChanged) {
      preserveControlledFeedbackRef.current =
        false
    }

    const shouldClearFeedback =
      characterLimitChanged ||
      (controlledValueChanged &&
        !preserveControlledFeedback) ||
      characterLimit === undefined ||
      (valueIsBelowLimit &&
        !preserveControlledFeedback)

    previousCharacterLimitRef.current =
      characterLimit
    previousControlledValueRef.current = value

    if (
      !limitFeedbackRef.current ||
      !shouldClearFeedback
    ) {
      return
    }

    const clearTimer = setTimeout(
      clearLimitFeedback,
      0,
    )

    return () => {
      clearTimeout(clearTimer)
    }
  }, [
    characterCount,
    characterLimit,
    clearLimitFeedback,
    controlled,
    value,
  ])

  useLayoutEffect(() => {
    const previousValidationKey =
      previousValidationKeyRef.current

    previousValidationKeyRef.current =
      validationKey

    if (
      previousValidationKey === validationKey ||
      !semanticInvalid ||
      !feedbackEnabled
    ) {
      return
    }

    beginFeedback()
  }, [
    beginFeedback,
    feedbackEnabled,
    semanticInvalid,
    validationKey,
  ])

  useEffect(() => {
    if (
      feedbackPhase !== 'shaking' &&
      feedbackPhase !== 'shaking-danger'
    ) {
      return
    }

    if (
      window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
    ) {
      completeFeedback()
      return
    }

    const fallbackTimer = window.setTimeout(
      completeFeedback,
      700,
    )

    return () => {
      window.clearTimeout(fallbackTimer)
    }
  }, [completeFeedback, feedbackPhase])

  useEffect(
    () => () => {
      if (
        ignoreBeforeInputTimerRef.current !==
        undefined
      ) {
        clearTimeout(
          ignoreBeforeInputTimerRef.current,
        )
      }

      if (
        retainFeedbackTimerRef.current !==
        undefined
      ) {
        clearTimeout(
          retainFeedbackTimerRef.current,
        )
      }

      if (
        pendingUnknownInsertionRef.current
      ) {
        clearTimeout(
          pendingUnknownInsertionRef.current
            .timer,
        )
      }
    },
    [],
  )

  useEffect(() => {
    const control = controlRef.current
    const ownerForm = control?.form

    if (!control || !ownerForm || controlled) {
      return
    }

    const uncontrolledControl = control
    let resetTimer:
      | ReturnType<typeof setTimeout>
      | undefined

    function handleReset() {
      if (resetTimer !== undefined) {
        clearTimeout(resetTimer)
      }

      resetTimer = setTimeout(() => {
        setUncontrolledState({
          controlKind,
          length:
            uncontrolledControl.value.length,
        })
        clearLimitFeedback()
      }, 0)
    }

    ownerForm.addEventListener(
      'reset',
      handleReset,
    )

    return () => {
      ownerForm.removeEventListener(
        'reset',
        handleReset,
      )

      if (resetTimer !== undefined) {
        clearTimeout(resetTimer)
      }
    }
  }, [
    clearLimitFeedback,
    controlKind,
    controlRef,
    controlled,
    form,
  ])

  const handleValueInput = useCallback(
    (
      event: ReactInputEvent<FormFieldControl>,
    ) => {
      const nextLength =
        event.currentTarget.value.length
      const nativeEvent =
        event.nativeEvent as globalThis.InputEvent
      const pendingUnknownInsertion =
        pendingUnknownInsertionRef.current

      if (pendingUnknownInsertion) {
        clearTimeout(
          pendingUnknownInsertion.timer,
        )
        pendingUnknownInsertionRef.current =
          undefined
      }

      if (!controlled) {
        setUncontrolledState({
          controlKind,
          length: nextLength,
        })
      }

      if (
        retainFeedbackDuringInputRef.current
      ) {
        retainFeedbackDuringInputRef.current =
          false
        const inputType =
          nativeEvent.inputType

        if (
          retainFeedbackTimerRef.current !==
          undefined
        ) {
          clearTimeout(
            retainFeedbackTimerRef.current,
          )
          retainFeedbackTimerRef.current =
            undefined
        }

        if (inputType?.startsWith('insert')) {
          preserveControlledFeedbackRef.current =
            controlled
          return
        }
      }

      if (
        pendingUnknownInsertion &&
        nativeEvent.inputType?.startsWith(
          'insert',
        )
      ) {
        const acceptedText =
          nativeEvent.data ??
          nativeEvent.dataTransfer?.getData(
            'text/plain',
          )

        if (
          acceptedText !== null &&
          acceptedText !== undefined &&
          acceptedText.length <
            pendingUnknownInsertion.insertedLength
        ) {
          preserveControlledFeedbackRef.current =
            controlled
          reportCharacterLimit()
          return
        }
      }

      if (
        characterLimit === undefined ||
        nextLength <= characterLimit
      ) {
        clearLimitFeedback()
      }
    },
    [
      characterLimit,
      clearLimitFeedback,
      controlKind,
      controlled,
      reportCharacterLimit,
    ],
  )

  const handleBeforeInput = useCallback(
    (
      event: ReactInputEvent<FormFieldControl>,
    ) => {
      if (
        !feedbackEnabled ||
        characterLimit === undefined
      ) {
        return
      }

      const insertedText =
        getInsertedText(event)

      if (insertedText === undefined) {
        return
      }

      const control = event.currentTarget

      if (
        ignoreNextBeforeInputRef.current
      ) {
        ignoreNextBeforeInputRef.current =
          false

        if (
          ignoreBeforeInputTimerRef.current !==
          undefined
        ) {
          clearTimeout(
            ignoreBeforeInputTimerRef.current,
          )
          ignoreBeforeInputTimerRef.current =
            undefined
        }

        inputAttemptStartedFeedbackRef.current =
          false
        return
      }

      const prediction =
        wouldExceedCharacterLimit(
          control,
          insertedText,
          characterLimit,
        )

      if (prediction === 'unknown') {
        deferUnknownInsertion(insertedText)
      } else if (prediction) {
        retainFeedbackDuringInput()
        reportCharacterLimit()
      }
    },
    [
      characterLimit,
      deferUnknownInsertion,
      feedbackEnabled,
      reportCharacterLimit,
      retainFeedbackDuringInput,
    ],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<FormFieldControl>) => {
      if (
        !feedbackEnabled ||
        characterLimit === undefined ||
        event.nativeEvent.isComposing ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return
      }

      const isSingleCharacter =
        Array.from(event.key).length === 1
      const isTextAreaLineBreak =
        event.key === 'Enter' &&
        event.currentTarget instanceof
          HTMLTextAreaElement

      if (
        !isSingleCharacter &&
        !isTextAreaLineBreak
      ) {
        return
      }

      const insertedText =
        isTextAreaLineBreak ? '\n' : event.key

      const prediction =
        wouldExceedCharacterLimit(
          event.currentTarget,
          insertedText,
          characterLimit,
        )

      if (prediction === 'unknown') {
        deferUnknownInsertion(insertedText)
        return
      }

      if (!prediction) {
        return
      }

      ignoreNextBeforeInput()
      inputAttemptStartedFeedbackRef.current =
        reportCharacterLimit()
    },
    [
      characterLimit,
      deferUnknownInsertion,
      feedbackEnabled,
      ignoreNextBeforeInput,
      reportCharacterLimit,
    ],
  )

  const handlePaste = useCallback(
    (event: ClipboardEvent<FormFieldControl>) => {
      if (
        !feedbackEnabled ||
        characterLimit === undefined
      ) {
        return
      }

      const insertedText =
        event.clipboardData.getData('text/plain')

      const prediction =
        wouldExceedCharacterLimit(
          event.currentTarget,
          insertedText,
          characterLimit,
        )

      if (prediction === 'unknown') {
        deferUnknownInsertion(insertedText)
        return
      }

      if (!prediction) {
        return
      }

      ignoreNextBeforeInput()
      retainFeedbackDuringInput()
      inputAttemptStartedFeedbackRef.current =
        reportCharacterLimit()
    },
    [
      characterLimit,
      deferUnknownInsertion,
      feedbackEnabled,
      ignoreNextBeforeInput,
      reportCharacterLimit,
      retainFeedbackDuringInput,
    ],
  )

  return {
    characterCount,
    characterLimit,
    cancelInputAttempt,
    clearLimitFeedback,
    completeFeedback,
    feedbackPhase,
    handleBeforeInput,
    handleKeyDown,
    handlePaste,
    handleValueInput,
    limitAnnouncement:
      limitAnnouncementLimit !== undefined
        ? `Достигнут лимит ${limitAnnouncementLimit} символов.`
        : undefined,
    limitAnnouncementVersion,
    semanticInvalid,
  }
}
