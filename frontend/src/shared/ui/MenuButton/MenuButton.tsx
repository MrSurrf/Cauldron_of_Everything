import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'

import { PlaceholderIcon } from '../icons/PlaceholderIcon'
import type { MenuButtonProps } from './MenuButton.types'
import styles from './MenuButton.module.css'

export const MenuButton = forwardRef<
  HTMLButtonElement,
  MenuButtonProps
>(function MenuButton(
  {
    active = false,
    children,
    className,
    defaultExpanded = false,
    disabled,
    dropdown,
    expanded,
    icon,
    onClick,
    onExpandedChange,
    onKeyDown,
    type = 'button',
    ...buttonProps
  },
  ref,
) {
  const dropdownId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [internalExpanded, setInternalExpanded] =
    useState(defaultExpanded)

  const hasDropdown = dropdown !== undefined && dropdown !== null
  const isExpanded =
    hasDropdown && (expanded ?? internalExpanded)
  const renderedIcon =
    icon === undefined ? <PlaceholderIcon /> : icon

  const updateExpanded = useCallback(
    (nextExpanded: boolean) => {
      if (!hasDropdown) {
        return
      }

      if (expanded === undefined) {
        setInternalExpanded(nextExpanded)
      }

      onExpandedChange?.(nextExpanded)
    },
    [expanded, hasDropdown, onExpandedChange],
  )

  useEffect(() => {
    if (!isExpanded) {
      return
    }

    function handleOutsidePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        updateExpanded(false)
      }
    }

    document.addEventListener(
      'pointerdown',
      handleOutsidePointerDown,
    )

    return () => {
      document.removeEventListener(
        'pointerdown',
        handleOutsidePointerDown,
      )
    }
  }, [isExpanded, updateExpanded])

  function setButtonRef(node: HTMLButtonElement | null) {
    triggerRef.current = node

    if (typeof ref === 'function') {
      ref(node)
    } else if (ref) {
      ref.current = node
    }
  }

  function handleRootKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
  ) {
    if (
      event.key === 'Escape' &&
      isExpanded &&
      !event.defaultPrevented
    ) {
      event.preventDefault()
      updateExpanded(false)
      triggerRef.current?.focus()
    }
  }

  const buttonClassName = [
    styles.button,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={rootRef}
      className={styles.root}
      onKeyDown={handleRootKeyDown}
    >
      <button
        {...buttonProps}
        ref={setButtonRef}
        className={buttonClassName}
        type={type}
        disabled={disabled}
        data-active={active || isExpanded}
        aria-controls={hasDropdown ? dropdownId : undefined}
        aria-expanded={hasDropdown ? isExpanded : undefined}
        onClick={(event) => {
          onClick?.(event)

          if (!event.defaultPrevented && hasDropdown) {
            updateExpanded(!isExpanded)
          }
        }}
        onKeyDown={onKeyDown}
      >
        <span
          className={styles.innerFrame}
          aria-hidden={true}
        />

        <span
          className={styles.cornerShapes}
          aria-hidden={true}
        >
          <span className={styles.cornerShape} />
          <span className={styles.cornerShape} />
          <span className={styles.cornerShape} />
          <span className={styles.cornerShape} />
        </span>

        <span className={styles.content}>
          {renderedIcon && (
            <span
              className={styles.icon}
              aria-hidden={true}
            >
              {renderedIcon}
            </span>
          )}

          <span className={styles.label}>
            {children}
          </span>
        </span>

        {hasDropdown && (
          <span
            className={styles.chevron}
            aria-hidden={true}
          >
            ▾
          </span>
        )}
      </button>

      {isExpanded && (
        <div
          id={dropdownId}
          className={styles.dropdown}
          role={'group'}
        >
          {dropdown}
        </div>
      )}
    </div>
  )
})
