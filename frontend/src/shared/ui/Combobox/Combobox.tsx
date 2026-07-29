import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { createPortal } from 'react-dom'

import { FieldShell } from '../internal/field/FieldShell'
import { FieldFrame } from '../internal/field/FieldFrame'
import fieldFrameStyles from '../internal/field/FieldFrame.module.css'
import { isAriaInvalid } from '../internal/aria'
import { setRef } from '../internal/react'
import { resolvePortalContainer } from '../Overlay/portal'
import { useAnchoredPosition } from '../Overlay/useAnchoredPosition'
import { ScrollArea } from '../ScrollArea'
import styles from './Combobox.module.css'
import type {
  ComboboxFilter,
  ComboboxOption,
  ComboboxProps,
} from './Combobox.types'

type QueryState = {
  query: string
  selectionValue: string | null
}

type PopupStyle = CSSProperties & {
  '--combobox-visible-options': number
}

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('ru-RU')
}

const defaultFilterOption: ComboboxFilter = (
  option,
  query,
) => {
  const normalizedQuery =
    normalizeSearchText(query)

  if (normalizedQuery.length === 0) {
    return true
  }

  return [
    option.label,
    ...(option.keywords ?? []),
  ].some((value) =>
    normalizeSearchText(value).includes(
      normalizedQuery,
    ),
  )
}

function findEnabledOption(
  options: readonly ComboboxOption[],
  direction: 1 | -1,
  currentValue: string | null,
) {
  if (options.length === 0) {
    return null
  }

  const currentIndex = options.findIndex(
    (option) => option.value === currentValue,
  )
  let index =
    currentIndex >= 0
      ? currentIndex + direction
      : direction === 1
        ? 0
        : options.length - 1

  while (
    index >= 0 &&
    index < options.length
  ) {
    if (!options[index].disabled) {
      return options[index]
    }

    index += direction
  }

  return null
}

function findEdgeOption(
  options: readonly ComboboxOption[],
  edge: 'first' | 'last',
) {
  return findEnabledOption(
    options,
    edge === 'first' ? 1 : -1,
    null,
  )
}

export const Combobox = forwardRef<
  HTMLInputElement,
  ComboboxProps
>(function Combobox(
  {
    'aria-describedby': describedBy,
    'aria-errormessage': errorMessage,
    'aria-invalid': ariaInvalid,
    'aria-label': ariaLabel,
    autoComplete = 'off',
    className,
    defaultOpen = false,
    defaultValue = null,
    dir,
    disabled = false,
    emptyText = 'Ничего не найдено',
    error,
    fieldClassName,
    filterOption = defaultFilterOption,
    form,
    hint,
    id,
    invalid = false,
    invalidSelectionMessage =
      'Выберите значение из списка.',
    label,
    listboxLabel = 'Доступные варианты',
    name,
    onBlur,
    onClick,
    onFocus,
    onKeyDown,
    onOpenChange,
    onQueryChange,
    onValueChange,
    open,
    options,
    placeholder = 'Выберите значение...',
    portalContainer: providedPortalContainer,
    readOnly = false,
    required = false,
    rootClassName,
    value,
    ...inputProps
  },
  ref,
) {
  const generatedId = useId()
  const controlId =
    id ?? `combobox-${generatedId}`
  const listboxId = `${controlId}-listbox`
  const controlledValue = value !== undefined
  const controlledOpen = open !== undefined
  const [internalValue, setInternalValue] =
    useState<string | null>(defaultValue)
  const [internalOpen, setInternalOpen] =
    useState(defaultOpen)
  const [inputNode, setInputNode] =
    useState<HTMLInputElement | null>(null)
  const [queryState, setQueryState] =
    useState<QueryState | null>(null)
  const [activeValue, setActiveValue] =
    useState<string | null>(null)
  const requestedOpenRef = useRef(false)
  const queryRef = useRef<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const selectedValue = controlledValue
    ? value ?? null
    : internalValue
  const isOpen =
    !disabled &&
    !readOnly &&
    (controlledOpen ? open : internalOpen)
  requestedOpenRef.current = isOpen
  queryRef.current = queryState?.query ?? null
  const selectedOption = useMemo(
    () =>
      options.find(
        (option) =>
          option.value === selectedValue,
      ) ?? null,
    [options, selectedValue],
  )
  const validQueryState =
    isOpen &&
    queryState?.selectionValue === selectedValue
      ? queryState
      : null
  const inputValue =
    validQueryState?.query ??
    selectedOption?.label ??
    ''
  const hasUncommittedQuery =
    selectedValue === null &&
    validQueryState !== null &&
    validQueryState.query.length > 0
  const filterQuery =
    validQueryState?.query ?? ''
  const filteredOptions = useMemo(
    () =>
      options.filter((option) =>
        filterOption(option, filterQuery),
      ),
    [filterOption, filterQuery, options],
  )
  const explicitActiveOption =
    filteredOptions.find(
      (option) => option.value === activeValue,
    ) ?? null
  const activeOption =
    explicitActiveOption ??
    (isOpen
      ? findEdgeOption(
          filteredOptions,
          'first',
        )
      : null)
  const activeIndex = activeOption
    ? filteredOptions.indexOf(activeOption)
    : -1
  const activeOptionId =
    activeIndex >= 0
      ? `${listboxId}-option-${activeIndex}`
      : undefined
  const portalContainer =
    resolvePortalContainer(
      inputNode,
      providedPortalContainer,
    )
  const position = useAnchoredPosition({
    anchorRef: frameRef,
    matchAnchorWidth: true,
    offset: 4,
    open: isOpen,
    overlayRef: popupRef,
    placement: 'bottom',
    viewportPadding: 8,
  })
  const popupStyle = {
    ...position.style,
    '--combobox-visible-options': Math.max(
      1,
      Math.min(filteredOptions.length, 6),
    ),
  } as PopupStyle

  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node
      setInputNode((current) =>
        current === node ? current : node,
      )
      setRef(ref, node)
    },
    [ref],
  )

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        if (queryRef.current) {
          queryRef.current = null
          onQueryChange?.('')
        }

        setQueryState(null)
        setActiveValue(null)
      }

      if (!controlledOpen) {
        setInternalOpen(nextOpen)
      }

      if (
        requestedOpenRef.current ===
        nextOpen
      ) {
        return
      }

      requestedOpenRef.current = nextOpen

      onOpenChange?.(nextOpen)
    },
    [
      controlledOpen,
      onOpenChange,
      onQueryChange,
    ],
  )

  const openList = useCallback(() => {
    if (disabled || readOnly) {
      return
    }

    const preferred =
      filteredOptions.find(
        (option) =>
          option.value === selectedValue &&
          !option.disabled,
      ) ?? null

    setActiveValue(
      preferred?.value ?? null,
    )
    setOpen(true)
  }, [
    disabled,
    filteredOptions,
    readOnly,
    selectedValue,
    setOpen,
  ])

  const commitOption = useCallback(
    (option: ComboboxOption) => {
      if (option.disabled) {
        return
      }

      if (!controlledValue) {
        setInternalValue(option.value)
      }

      onValueChange?.(option.value, option)
      setOpen(false)
      inputRef.current?.focus({
        preventScroll: true,
      })
    },
    [
      controlledValue,
      onValueChange,
      setOpen,
    ],
  )

  const clearSelection = useCallback(() => {
    if (selectedValue === null) {
      return
    }

    if (!controlledValue) {
      setInternalValue(null)
    }

    onValueChange?.(null, null)
  }, [
    controlledValue,
    onValueChange,
    selectedValue,
  ])

  function handleChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const nextQuery = event.currentTarget.value
    const clearsSelection =
      selectedValue !== null

    if (clearsSelection) {
      clearSelection()
    }

    setQueryState({
      query: nextQuery,
      selectionValue: clearsSelection
        ? null
        : selectedValue,
    })
    onQueryChange?.(nextQuery)

    setActiveValue(null)
    setOpen(true)
  }

  function handleInputClick(
    event: MouseEvent<HTMLInputElement>,
  ) {
    onClick?.(event)

    if (!event.defaultPrevented) {
      if (selectedOption) {
        event.currentTarget.select()
      }

      openList()
    }
  }

  function handleInputFocus(
    event: FocusEvent<HTMLInputElement>,
  ) {
    onFocus?.(event)

    if (
      !event.defaultPrevented &&
      selectedOption
    ) {
      event.currentTarget.select()
    }
  }

  function handleInputBlur(
    event: FocusEvent<HTMLInputElement>,
  ) {
    onBlur?.(event)

    const nextTarget = event.relatedTarget

    if (
      nextTarget instanceof Node &&
      popupRef.current?.contains(nextTarget)
    ) {
      return
    }

    setOpen(false)
  }

  function handleInputKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    onKeyDown?.(event)

    if (event.defaultPrevented) {
      return
    }

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault()

        if (!isOpen) {
          openList()
          return
        }

        const next = findEnabledOption(
          filteredOptions,
          1,
          activeOption?.value ?? null,
        )

        if (next) {
          setActiveValue(next.value)
        }
        break
      }
      case 'ArrowUp': {
        event.preventDefault()

        if (!isOpen) {
          openList()
          return
        }

        const previous = findEnabledOption(
          filteredOptions,
          -1,
          activeOption?.value ?? null,
        )

        if (previous) {
          setActiveValue(previous.value)
        }
        break
      }
      case 'End':
      case 'Home': {
        if (!isOpen) {
          return
        }

        event.preventDefault()
        const edgeOption = findEdgeOption(
          filteredOptions,
          event.key === 'Home'
            ? 'first'
            : 'last',
        )

        setActiveValue(
          edgeOption?.value ?? null,
        )
        break
      }
      case 'Enter': {
        if (!isOpen) {
          return
        }

        event.preventDefault()

        if (activeOption) {
          commitOption(activeOption)
        } else {
          inputRef.current?.reportValidity()
        }
        break
      }
      case 'Escape': {
        if (!isOpen) {
          return
        }

        event.preventDefault()
        event.stopPropagation()
        setOpen(false)
        break
      }
      case 'Tab':
        setOpen(false)
        break
    }
  }

  function handlePopupKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
  ) {
    if (event.key !== 'Escape') {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    setOpen(false)
    inputRef.current?.focus({
      preventScroll: true,
    })
  }

  useLayoutEffect(() => {
    inputRef.current?.setCustomValidity(
      hasUncommittedQuery
        ? invalidSelectionMessage
        : '',
    )
  }, [
    hasUncommittedQuery,
    invalidSelectionMessage,
  ])

  useLayoutEffect(() => {
    if (isOpen) {
      return
    }

    inputRef.current?.setCustomValidity('')

    if (queryRef.current !== null) {
      const shouldNotify =
        queryRef.current.length > 0

      queryRef.current = null
      setQueryState(null)

      if (shouldNotify) {
        onQueryChange?.('')
      }
    }

    setActiveValue(null)
  }, [isOpen, onQueryChange])

  useEffect(() => {
    const ownerForm = inputRef.current?.form

    if (!ownerForm) {
      return
    }

    function handleFormReset() {
      if (!controlledValue) {
        setInternalValue(defaultValue)
      }

      setOpen(false)
    }

    ownerForm.addEventListener(
      'reset',
      handleFormReset,
    )

    return () => {
      ownerForm.removeEventListener(
        'reset',
        handleFormReset,
      )
    }
  }, [
    controlledValue,
    defaultValue,
    form,
    setOpen,
  ])

  useLayoutEffect(() => {
    if (!isOpen || !activeOptionId) {
      return
    }

    const activeElement =
      inputRef.current?.ownerDocument.getElementById(
        activeOptionId,
      )

    activeElement?.scrollIntoView({
      block: 'nearest',
    })
  }, [activeOptionId, isOpen])

  useLayoutEffect(() => {
    const input = inputRef.current
    const popup = popupRef.current
    const view = input?.ownerDocument.defaultView

    if (!isOpen || !input || !popup || !view) {
      return
    }

    popup.dir =
      dir ??
      (view.getComputedStyle(input).direction ===
      'rtl'
        ? 'rtl'
        : 'ltr')
  }, [dir, isOpen])

  useLayoutEffect(() => {
    if (!isOpen) {
      return
    }

    const ownerDocument =
      inputRef.current?.ownerDocument

    if (!ownerDocument) {
      return
    }

    function handleOutsideInteraction(
      event: Event,
    ) {
      const target = event.target

      if (
        !(target instanceof Node) ||
        frameRef.current?.contains(target) ||
        popupRef.current?.contains(target)
      ) {
        return
      }

      setOpen(false)
    }

    ownerDocument.addEventListener(
      'pointerdown',
      handleOutsideInteraction,
      true,
    )
    ownerDocument.addEventListener(
      'focusin',
      handleOutsideInteraction,
      true,
    )

    return () => {
      ownerDocument.removeEventListener(
        'pointerdown',
        handleOutsideInteraction,
        true,
      )
      ownerDocument.removeEventListener(
        'focusin',
        handleOutsideInteraction,
        true,
      )
    }
  }, [isOpen, setOpen])

  const fieldClassNames = [
    styles.field,
    isOpen && styles.open,
    fieldClassName,
  ]
    .filter(Boolean)
    .join(' ')
  const frameClassNames = [
    styles.frame,
    rootClassName,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <FieldShell
        ariaInvalid={ariaInvalid}
        className={fieldClassNames}
        controlId={controlId}
        describedBy={describedBy}
        disabled={disabled}
        error={error}
        errorMessage={errorMessage}
        filled={inputValue.length > 0 || isOpen}
        hasIcon={true}
        hint={hint}
        invalid={invalid}
        label={label}
        readOnly={readOnly}
        required={required}
      >
        {({
          controlClassName,
          controlProps,
          frameClassName,
        }) => {
          const inputClassName = [
            fieldFrameStyles.control,
            fieldFrameStyles.singleLine,
            controlClassName,
            styles.input,
            className,
          ]
            .filter(Boolean)
            .join(' ')
          const combinedFrameClassName = [
            frameClassName,
            frameClassNames,
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <FieldFrame
              ref={frameRef}
              disabled={disabled}
              icon={
                <span
                  className={styles.arrow}
                  data-open={
                    isOpen || undefined
                  }
                />
              }
              invalid={isAriaInvalid(
                controlProps['aria-invalid'],
              )}
              rootClassName={
                combinedFrameClassName
              }
            >
              <input
                {...inputProps}
                {...controlProps}
                ref={setInputRef}
                aria-activedescendant={
                  isOpen
                    ? activeOptionId
                    : undefined
                }
                aria-autocomplete="list"
                aria-controls={listboxId}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label={ariaLabel}
                autoComplete={autoComplete}
                className={inputClassName}
                disabled={disabled}
                dir={dir}
                form={form}
                placeholder={placeholder}
                readOnly={readOnly}
                required={required}
                role="combobox"
                type="text"
                value={inputValue}
                onBlur={handleInputBlur}
                onChange={handleChange}
                onClick={handleInputClick}
                onFocus={handleInputFocus}
                onKeyDown={handleInputKeyDown}
              />
            </FieldFrame>
          )
        }}
      </FieldShell>

      {name && (
        <input
          type="hidden"
          disabled={disabled}
          form={form}
          name={name}
          value={selectedValue ?? ''}
        />
      )}

      {isOpen &&
        portalContainer &&
        createPortal(
          <div
            ref={popupRef}
            className={styles.popup}
            data-placement={position.placement}
            dir={dir}
            style={popupStyle}
            onKeyDown={handlePopupKeyDown}
          >
            <div className={styles.popupSurface}>
              <ScrollArea
                aria-label={listboxLabel}
                className={styles.listbox}
                contentClassName={
                  styles.listContent
                }
                orientation="vertical"
                rootClassName={
                  styles.scrollArea
                }
                role="listbox"
                id={listboxId}
              >
                {filteredOptions.length > 0 ? (
                  filteredOptions.map(
                    (option, index) => {
                      const selected =
                        option.value ===
                        selectedValue
                      const active =
                        option.value ===
                        activeOption?.value
                      const optionId =
                        `${listboxId}-option-${index}`

                      return (
                        <button
                          key={option.value}
                          id={optionId}
                          type="button"
                          role="option"
                          className={
                            styles.option
                          }
                          tabIndex={-1}
                          aria-selected={
                            selected
                          }
                          data-active={
                            active ||
                            undefined
                          }
                          disabled={
                            option.disabled
                          }
                          onClick={() => {
                            commitOption(
                              option,
                            )
                          }}
                          onMouseDown={(
                            event,
                          ) => {
                            event.preventDefault()
                          }}
                          onMouseMove={() => {
                            if (
                              !option.disabled
                            ) {
                              setActiveValue(
                                option.value,
                              )
                            }
                          }}
                        >
                          {option.icon && (
                            <span
                              className={
                                styles.optionIcon
                              }
                              aria-hidden={true}
                            >
                              {option.icon}
                            </span>
                          )}

                          <span
                            className={
                              styles.optionCopy
                            }
                          >
                            <span
                              className={
                                styles.optionLabel
                              }
                            >
                              {option.label}
                            </span>

                            {option.description && (
                              <span
                                className={
                                  styles.optionDescription
                                }
                              >
                                {
                                  option.description
                                }
                              </span>
                            )}
                          </span>

                          {selected && (
                            <span
                              className={
                                styles.selectionMark
                              }
                              aria-hidden={true}
                            />
                          )}
                        </button>
                      )
                    },
                  )
                ) : (
                  <div
                    className={styles.empty}
                    role={'status'}
                    aria-live={'polite'}
                  >
                    {emptyText}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>,
          portalContainer,
        )}
    </>
  )
})
