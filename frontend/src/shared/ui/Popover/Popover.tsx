import {
  cloneElement,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'

import { hasRenderableContent, setRef } from '../internal/react'
import { resolvePortalContainer } from '../Overlay/portal'
import { useAnchoredPosition } from '../Overlay/useAnchoredPosition'
import type {
  PopoverProps,
  PopoverTriggerProps,
} from './Popover.types'
import styles from './Popover.module.css'

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusableElements(root: HTMLElement) {
  return Array.from(
    root.querySelectorAll<HTMLElement>(focusableSelector),
  ).filter(
    (element) =>
      !element.hidden &&
      element.getAttribute('aria-hidden') !== 'true',
  )
}

export const Popover = forwardRef<
  HTMLElement,
  PopoverProps
>(function Popover(
  {
    'aria-label': ariaLabel = 'Дополнительные настройки',
    'aria-labelledby': ariaLabelledBy,
    children,
    className,
    content,
    defaultOpen = false,
    disabled = false,
    id,
    matchTriggerWidth = false,
    modal = false,
    offset = 8,
    onOpenChange,
    open,
    placement = 'bottom',
    portalContainer: providedPortalContainer,
  },
  ref,
) {
  const generatedId = useId()
  const popoverId = id ?? `popover-${generatedId}`
  const triggerRef = useRef<HTMLElement>(null)
  const overlayRef = useRef<HTMLDivElement | HTMLDialogElement>(null)
  const Overlay = modal ? 'dialog' : 'div'
  const [internalOpen, setInternalOpen] =
    useState(defaultOpen)
  const [triggerNode, setTriggerNode] =
    useState<HTMLElement | null>(null)
  const controlled = open !== undefined
  const contentAvailable = hasRenderableContent(content)
  const requestedOpenRef = useRef(
    controlled ? Boolean(open) : internalOpen,
  )
  requestedOpenRef.current = controlled
    ? Boolean(open)
    : internalOpen
  const visible =
    !disabled &&
    contentAvailable &&
    (controlled ? Boolean(open) : internalOpen)
  const childProps = children.props
  const childRef = childProps.ref
  const portalContainer = resolvePortalContainer(
    triggerNode,
    providedPortalContainer,
  )
  const position = useAnchoredPosition({
    anchorRef: triggerRef,
    matchAnchorWidth: matchTriggerWidth,
    offset,
    open: visible,
    overlayRef,
    placement,
  })

  const updateOpen = useCallback(
    (nextOpen: boolean) => {
      if (
        (nextOpen && (disabled || !contentAvailable)) ||
        requestedOpenRef.current === nextOpen
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
      contentAvailable,
      controlled,
      disabled,
      onOpenChange,
    ],
  )

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

  function handleTriggerClick(
    event: MouseEvent<HTMLElement>,
  ) {
    childProps.onClick?.(event)

    if (!event.defaultPrevented) {
      updateOpen(!visible)
    }
  }

  function handleTriggerKeyDown(
    event: KeyboardEvent<HTMLElement>,
  ) {
    childProps.onKeyDown?.(event)

    if (
      !event.defaultPrevented &&
      event.key === 'Escape' &&
      visible
    ) {
      event.preventDefault()
      event.stopPropagation()
      updateOpen(false)
      triggerRef.current?.focus()
    }
  }

  function handleContentPointerDown(
    event: ReactPointerEvent<HTMLElement>,
  ) {
    event.stopPropagation()
  }

  function handleContentKeyDown(
    event: KeyboardEvent<HTMLElement>,
  ) {
    if (event.key !== 'Tab') return

    const overlay = overlayRef.current
    const triggerElement = triggerRef.current
    if (!overlay || !triggerElement) return

    const focusableElements = getFocusableElements(overlay)
    const first = focusableElements[0]
    const last = focusableElements[focusableElements.length - 1]
    const activeElement = overlay.ownerDocument.activeElement
    const leavingBackward =
      event.shiftKey &&
      (focusableElements.length === 0 || activeElement === first)
    const leavingForward =
      !event.shiftKey &&
      (focusableElements.length === 0 || activeElement === last)

    if (!leavingBackward && !leavingForward) return

    event.preventDefault()

    if (modal) {
      ;(leavingBackward ? last ?? overlay : first ?? overlay).focus()
      return
    }

    let focusTarget: HTMLElement | undefined = triggerElement
    if (leavingForward) {
      const documentElements = getFocusableElements(
        overlay.ownerDocument.body,
      ).filter((element) => !overlay.contains(element))
      const triggerIndex = documentElements.indexOf(triggerElement)
      focusTarget =
        documentElements[triggerIndex + 1] ?? triggerElement
    }

    updateOpen(false)
    overlay.ownerDocument.defaultView?.requestAnimationFrame(
      () => focusTarget?.focus(),
    )
  }

  useEffect(() => {
    if (!visible) {
      return
    }

    const ownerDocument =
      triggerRef.current?.ownerDocument

    if (!ownerDocument) {
      return
    }

    function handleOutsidePointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node)) {
        return
      }

      if (
        triggerRef.current?.contains(event.target) ||
        overlayRef.current?.contains(event.target)
      ) {
        return
      }

      updateOpen(false)
    }

    function handleDocumentKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') {
        return
      }

      event.preventDefault()
      updateOpen(false)
      triggerRef.current?.focus()
    }

    ownerDocument.addEventListener(
      'pointerdown',
      handleOutsidePointerDown,
    )
    ownerDocument.addEventListener(
      'keydown',
      handleDocumentKeyDown,
    )

    return () => {
      ownerDocument.removeEventListener(
        'pointerdown',
        handleOutsidePointerDown,
      )
      ownerDocument.removeEventListener(
        'keydown',
        handleDocumentKeyDown,
      )
    }
  }, [updateOpen, visible])

  useEffect(() => {
    if (!disabled && contentAvailable) {
      return
    }

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
    contentAvailable,
    controlled,
    disabled,
    internalOpen,
  ])

  useLayoutEffect(() => {
    const overlay = overlayRef.current
    if (!visible || !modal || position.style.visibility !== 'visible' || !(overlay instanceof HTMLDialogElement)) return
    overlay.showModal()
    return () => overlay.close()
  }, [modal, position.style.visibility, visible])

  useLayoutEffect(() => {
    const trigger = triggerRef.current
    const overlay = overlayRef.current
    const view = trigger?.ownerDocument.defaultView

    if (!visible || !trigger || !overlay || !view) {
      return
    }

    overlay.dir =
      view.getComputedStyle(trigger).direction === 'rtl'
        ? 'rtl'
        : 'ltr'
  }, [visible])

  useLayoutEffect(() => {
    const overlay = overlayRef.current
    if (!visible || !overlay) {
      return
    }

    const view = overlay.ownerDocument.defaultView
    if (!view) return

    const focusFrame = view.requestAnimationFrame(() => {
      const firstFocusable = getFocusableElements(overlay)[0]
      const focusTarget = firstFocusable ?? overlay
      focusTarget.focus()
    })

    return () => {
      view.cancelAnimationFrame(focusFrame)
    }
  }, [visible])

  const trigger = cloneElement<PopoverTriggerProps>(
    children,
    {
      ref: setTriggerRef,
      'aria-controls': popoverId,
      'aria-disabled':
        disabled && children.type !== 'button'
          ? true
          : childProps['aria-disabled'],
      'aria-expanded': visible,
      'aria-haspopup': 'dialog',
      disabled:
        disabled && children.type === 'button'
          ? true
          : childProps.disabled,
      onClick: handleTriggerClick,
      onKeyDown: handleTriggerKeyDown,
      tabIndex:
        disabled && children.type !== 'button'
          ? -1
          : childProps.tabIndex,
    },
  )
  const popoverClassName = [
    styles.popover,
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
          <Overlay
            ref={(node: HTMLDivElement | HTMLDialogElement | null) => { overlayRef.current = node }}
            id={popoverId}
            role="dialog"
            aria-modal={modal || undefined}
            data-modal={modal || undefined}
            className={popoverClassName}
            aria-label={ariaLabelledBy ? undefined : ariaLabel}
            aria-labelledby={ariaLabelledBy}
            data-placement={position.placement}
            tabIndex={-1}
            style={position.style}
            onKeyDown={handleContentKeyDown}
            onPointerDown={handleContentPointerDown}
            onClick={(event) => {
              if (!modal || event.target !== event.currentTarget) return
              const rect = event.currentTarget.getBoundingClientRect()
              if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
                event.preventDefault()
                event.stopPropagation()
                updateOpen(false)
              }
            }}
          >
            <div className={styles.content}>
              {content}
            </div>
          </Overlay>,
          portalContainer,
        )}
    </>
  )
})
