import {
  cloneElement,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { createPortal } from 'react-dom'

import { mergeAriaIds } from '../internal/aria'
import { setRef } from '../internal/react'
import { resolvePortalContainer } from '../Overlay/portal'
import { useAnchoredPosition } from '../Overlay/useAnchoredPosition'
import styles from './Tooltip.module.css'
import type {
  TooltipProps,
  TooltipTriggerProps,
} from './Tooltip.types'

function hasContent(
  content: TooltipProps['content'],
) {
  if (typeof content === 'string') {
    return content.trim().length > 0
  }

  return (
    content !== null &&
    content !== undefined &&
    content !== false
  )
}

export const Tooltip = forwardRef<
  HTMLElement,
  TooltipProps
>(function Tooltip(
  {
    children,
    className,
    closeDelay = 80,
    content,
    defaultOpen = false,
    disabled = false,
    id,
    offset = 8,
    onOpenChange,
    open,
    openDelay = 300,
    placement = 'top',
    portalContainer: providedPortalContainer,
  },
  ref,
) {
  const generatedId = useId()
  const tooltipId =
    id ?? `tooltip-${generatedId}`
  const triggerRef = useRef<HTMLElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [internalOpen, setInternalOpen] =
    useState(defaultOpen)
  const [triggerNode, setTriggerNode] =
    useState<HTMLElement | null>(null)
  const openTimerRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null)
  const closeTimerRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null)
  const hoveredRef = useRef(false)
  const focusedRef = useRef(false)
  const controlled = open !== undefined
  const contentAvailable = hasContent(content)
  const disabledRef = useRef(disabled)
  const contentAvailableRef = useRef(
    contentAvailable,
  )
  const requestedOpenRef = useRef(
    controlled ? Boolean(open) : internalOpen,
  )
  disabledRef.current = disabled
  contentAvailableRef.current =
    contentAvailable
  requestedOpenRef.current = controlled
    ? Boolean(open)
    : internalOpen
  const visible =
    !disabled &&
    contentAvailable &&
    (controlled ? open : internalOpen)
  const childProps = children.props
  const childRef = childProps.ref
  const portalContainer =
    resolvePortalContainer(
      triggerNode,
      providedPortalContainer,
    )
  const position = useAnchoredPosition({
    anchorRef: triggerRef,
    constrainHeight: false,
    offset,
    open: visible,
    overlayRef,
    placement,
  })

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current !== null) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
  }, [])

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const setVisible = useCallback(
    (nextOpen: boolean) => {
      if (
        requestedOpenRef.current ===
        nextOpen
      ) {
        return
      }

      requestedOpenRef.current = nextOpen

      if (!controlled) {
        setInternalOpen(nextOpen)
      }

      onOpenChange?.(nextOpen)
    },
    [
      controlled,
      onOpenChange,
    ],
  )

  const scheduleOpen = useCallback(() => {
    clearCloseTimer()
    clearOpenTimer()

    if (disabled || !hasContent(content)) {
      return
    }

    if (openDelay <= 0) {
      setVisible(true)
      return
    }

    openTimerRef.current = setTimeout(() => {
      openTimerRef.current = null

      if (
        disabledRef.current ||
        !contentAvailableRef.current
      ) {
        return
      }

      setVisible(true)
    }, openDelay)
  }, [
    clearCloseTimer,
    clearOpenTimer,
    content,
    disabled,
    openDelay,
    setVisible,
  ])

  const scheduleClose = useCallback(() => {
    clearOpenTimer()
    clearCloseTimer()

    if (closeDelay <= 0) {
      setVisible(false)
      return
    }

    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null
      setVisible(false)
    }, closeDelay)
  }, [
    clearCloseTimer,
    clearOpenTimer,
    closeDelay,
    setVisible,
  ])

  const setTriggerRef = useCallback(
    (node: HTMLElement | null) => {
      triggerRef.current = node
      setTriggerNode((current) =>
        current === node ? current : node,
      )
      setRef(childRef, node)
      setRef(ref, node)
    },
    [childRef, ref],
  )

  function handleMouseEnter(
    event: MouseEvent<HTMLElement>,
  ) {
    childProps.onMouseEnter?.(event)
    hoveredRef.current = true
    scheduleOpen()
  }

  function handleMouseLeave(
    event: MouseEvent<HTMLElement>,
  ) {
    childProps.onMouseLeave?.(event)
    hoveredRef.current = false

    if (!focusedRef.current) {
      scheduleClose()
    }
  }

  function handleFocus(
    event: FocusEvent<HTMLElement>,
  ) {
    childProps.onFocus?.(event)
    focusedRef.current = true
    clearOpenTimer()
    clearCloseTimer()

    if (!disabled && hasContent(content)) {
      setVisible(true)
    }
  }

  function handleBlur(
    event: FocusEvent<HTMLElement>,
  ) {
    childProps.onBlur?.(event)
    focusedRef.current = false

    if (!hoveredRef.current) {
      scheduleClose()
    }
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLElement>,
  ) {
    childProps.onKeyDown?.(event)

    if (event.key === 'Escape' && visible) {
      event.preventDefault()
      event.stopPropagation()
      clearOpenTimer()
      clearCloseTimer()
      setVisible(false)
    }
  }

  useEffect(
    () => () => {
      clearOpenTimer()
      clearCloseTimer()
    },
    [clearCloseTimer, clearOpenTimer],
  )

  useEffect(() => {
    if (!disabled && contentAvailable) {
      return
    }

    clearOpenTimer()
    clearCloseTimer()
    requestedOpenRef.current = false

    if (!controlled && internalOpen) {
      const closeTimer = setTimeout(() => {
        setInternalOpen(false)
      }, 0)

      return () => {
        clearTimeout(closeTimer)
      }
    }
  }, [
    clearCloseTimer,
    clearOpenTimer,
    contentAvailable,
    controlled,
    disabled,
    internalOpen,
  ])

  useLayoutEffect(() => {
    const trigger = triggerRef.current
    const overlay = overlayRef.current
    const view =
      trigger?.ownerDocument.defaultView

    if (!visible || !trigger || !overlay || !view) {
      return
    }

    overlay.dir =
      view.getComputedStyle(trigger).direction ===
      'rtl'
        ? 'rtl'
        : 'ltr'
  }, [visible])

  const trigger = cloneElement<
    TooltipTriggerProps
  >(children, {
    ref: setTriggerRef,
    'aria-describedby': mergeAriaIds(
      childProps['aria-describedby'],
      visible ? tooltipId : undefined,
    ),
    onBlur: handleBlur,
    onFocus: handleFocus,
    onKeyDown: handleKeyDown,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  })
  const tooltipClassName = [
    styles.tooltip,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      {trigger}

      {visible &&
        portalContainer &&
        createPortal(
          <div
            ref={overlayRef}
            id={tooltipId}
            role="tooltip"
            className={tooltipClassName}
            data-placement={position.placement}
            style={position.style}
          >
            <span className={styles.content}>
              {content}
            </span>
          </div>,
          portalContainer,
        )}
    </>
  )
})
