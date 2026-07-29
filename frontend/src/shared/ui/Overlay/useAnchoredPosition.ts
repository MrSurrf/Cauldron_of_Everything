import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'

export type OverlayPlacement =
  | 'bottom'
  | 'left'
  | 'right'
  | 'top'

type OverlayPosition = {
  placement: OverlayPlacement
  style: CSSProperties
}

type UseAnchoredPositionOptions = {
  anchorRef: RefObject<HTMLElement | null>
  constrainHeight?: boolean
  matchAnchorWidth?: boolean
  offset?: number
  open: boolean
  overlayRef: RefObject<HTMLElement | null>
  placement?: OverlayPlacement
  viewportPadding?: number
}

const hiddenPosition: OverlayPosition = {
  placement: 'bottom',
  style: {
    position: 'fixed',
    top: 0,
    left: 0,
    visibility: 'hidden',
  },
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
) {
  return Math.min(
    Math.max(value, minimum),
    Math.max(minimum, maximum),
  )
}

function positionsAreEqual(
  current: OverlayPosition,
  next: OverlayPosition,
) {
  const currentStyle = current.style
  const nextStyle = next.style

  return (
    current.placement === next.placement &&
    currentStyle.top === nextStyle.top &&
    currentStyle.left === nextStyle.left &&
    currentStyle.width === nextStyle.width &&
    currentStyle.maxHeight === nextStyle.maxHeight &&
    currentStyle.maxWidth === nextStyle.maxWidth &&
    currentStyle.visibility === nextStyle.visibility
  )
}

function getOppositePlacement(
  placement: OverlayPlacement,
): OverlayPlacement {
  switch (placement) {
    case 'bottom':
      return 'top'
    case 'left':
      return 'right'
    case 'right':
      return 'left'
    case 'top':
      return 'bottom'
  }
}

function getAvailableSpace(
  placement: OverlayPlacement,
  anchor: DOMRect,
  viewportLeft: number,
  viewportTop: number,
  viewportWidth: number,
  viewportHeight: number,
  offset: number,
  padding: number,
) {
  switch (placement) {
    case 'bottom':
      return (
        viewportTop +
        viewportHeight -
        anchor.bottom -
        offset -
        padding
      )
    case 'left':
      return (
        anchor.left -
        viewportLeft -
        offset -
        padding
      )
    case 'right':
      return (
        viewportLeft +
        viewportWidth -
        anchor.right -
        offset -
        padding
      )
    case 'top':
      return (
        anchor.top -
        viewportTop -
        offset -
        padding
      )
  }
}

function choosePlacement(
  preferred: OverlayPlacement,
  anchor: DOMRect,
  overlay: DOMRect,
  viewportLeft: number,
  viewportTop: number,
  viewportWidth: number,
  viewportHeight: number,
  offset: number,
  padding: number,
) {
  const opposite = getOppositePlacement(preferred)
  const preferredSpace = getAvailableSpace(
    preferred,
    anchor,
    viewportLeft,
    viewportTop,
    viewportWidth,
    viewportHeight,
    offset,
    padding,
  )
  const oppositeSpace = getAvailableSpace(
    opposite,
    anchor,
    viewportLeft,
    viewportTop,
    viewportWidth,
    viewportHeight,
    offset,
    padding,
  )
  const overlaySize =
    preferred === 'bottom' || preferred === 'top'
      ? overlay.height
      : overlay.width

  return preferredSpace < overlaySize &&
    oppositeSpace > preferredSpace
    ? opposite
    : preferred
}

function calculatePosition(
  anchor: DOMRect,
  overlay: DOMRect,
  viewportLeft: number,
  viewportTop: number,
  viewportWidth: number,
  viewportHeight: number,
  preferredPlacement: OverlayPlacement,
  offset: number,
  padding: number,
  matchAnchorWidth: boolean,
  constrainHeight: boolean,
): OverlayPosition {
  const placement = choosePlacement(
    preferredPlacement,
    anchor,
    overlay,
    viewportLeft,
    viewportTop,
    viewportWidth,
    viewportHeight,
    offset,
    padding,
  )
  const vertical =
    placement === 'bottom' || placement === 'top'
  const available = Math.max(
    0,
    getAvailableSpace(
      placement,
      anchor,
      viewportLeft,
      viewportTop,
      viewportWidth,
      viewportHeight,
      offset,
      padding,
    ),
  )
  const width = matchAnchorWidth
    ? Math.min(
        anchor.width,
        viewportWidth - padding * 2,
      )
    : undefined
  const measuredWidth = width ?? overlay.width
  const measuredHeight = Math.min(
    overlay.height,
    vertical ? available : overlay.height,
  )
  let left = anchor.left
  let top = anchor.bottom + offset

  switch (placement) {
    case 'bottom':
      left =
        anchor.left +
        (anchor.width - measuredWidth) / 2
      top = anchor.bottom + offset
      break
    case 'left':
      left =
        anchor.left -
        offset -
        Math.min(overlay.width, available)
      top =
        anchor.top +
        (anchor.height - overlay.height) / 2
      break
    case 'right':
      left = anchor.right + offset
      top =
        anchor.top +
        (anchor.height - overlay.height) / 2
      break
    case 'top':
      left =
        anchor.left +
        (anchor.width - measuredWidth) / 2
      top =
        anchor.top -
        offset -
        measuredHeight
      break
  }

  const maxWidth = vertical
    ? viewportWidth - padding * 2
    : available
  const clampedLeft = clamp(
    left,
    viewportLeft + padding,
    viewportLeft +
      viewportWidth -
      padding -
      Math.min(measuredWidth, maxWidth),
  )
  const clampedTop = clamp(
    top,
    viewportTop + padding,
    viewportTop +
      viewportHeight -
      padding -
      Math.min(
        measuredHeight,
        vertical
          ? available
          : viewportHeight - padding * 2,
      ),
  )

  return {
    placement,
    style: {
      position: 'fixed',
      top: clampedTop,
      left: clampedLeft,
      width,
      maxHeight: constrainHeight
        ? vertical
          ? available
          : viewportHeight - padding * 2
        : undefined,
      maxWidth,
      visibility: 'visible',
    },
  }
}

export function useAnchoredPosition({
  anchorRef,
  constrainHeight = true,
  matchAnchorWidth = false,
  offset = 8,
  open,
  overlayRef,
  placement = 'bottom',
  viewportPadding = 8,
}: UseAnchoredPositionOptions) {
  const [position, setPosition] =
    useState<OverlayPosition>({
      ...hiddenPosition,
      placement,
    })
  const animationFrameRef = useRef<
    number | null
  >(null)

  const measure = useCallback(() => {
    animationFrameRef.current = null

    const anchor = anchorRef.current
    const overlay = overlayRef.current

    if (!open || !anchor || !overlay) {
      return
    }

    const view =
      anchor.ownerDocument.defaultView

    if (!view) {
      return
    }

    const visualViewport = view.visualViewport
    const next = calculatePosition(
      anchor.getBoundingClientRect(),
      overlay.getBoundingClientRect(),
      visualViewport?.offsetLeft ?? 0,
      visualViewport?.offsetTop ?? 0,
      visualViewport?.width ?? view.innerWidth,
      visualViewport?.height ?? view.innerHeight,
      placement,
      offset,
      viewportPadding,
      matchAnchorWidth,
      constrainHeight,
    )

    setPosition((current) =>
      positionsAreEqual(current, next)
        ? current
        : next,
    )
  }, [
    anchorRef,
    constrainHeight,
    matchAnchorWidth,
    offset,
    open,
    overlayRef,
    placement,
    viewportPadding,
  ])

  const scheduleMeasure = useCallback(() => {
    if (animationFrameRef.current !== null) {
      return
    }

    animationFrameRef.current =
      requestAnimationFrame(measure)
  }, [measure])

  useLayoutEffect(() => {
    if (!open) {
      return
    }

    measure()

    const anchor = anchorRef.current
    const overlay = overlayRef.current
    const view =
      anchor?.ownerDocument.defaultView

    if (!anchor || !overlay || !view) {
      return
    }

    const resizeObserver =
      typeof view.ResizeObserver === 'undefined'
        ? null
        : new view.ResizeObserver(
            scheduleMeasure,
          )

    resizeObserver?.observe(anchor)
    resizeObserver?.observe(overlay)

    view.addEventListener(
      'resize',
      scheduleMeasure,
    )
    view.addEventListener(
      'scroll',
      scheduleMeasure,
      true,
    )
    view.visualViewport?.addEventListener(
      'resize',
      scheduleMeasure,
    )
    view.visualViewport?.addEventListener(
      'scroll',
      scheduleMeasure,
    )

    return () => {
      resizeObserver?.disconnect()
      view.removeEventListener(
        'resize',
        scheduleMeasure,
      )
      view.removeEventListener(
        'scroll',
        scheduleMeasure,
        true,
      )
      view.visualViewport?.removeEventListener(
        'resize',
        scheduleMeasure,
      )
      view.visualViewport?.removeEventListener(
        'scroll',
        scheduleMeasure,
      )
    }
  }, [
    anchorRef,
    measure,
    open,
    overlayRef,
    placement,
    scheduleMeasure,
  ])

  useLayoutEffect(
    () => () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(
          animationFrameRef.current,
        )
      }
    },
    [],
  )

  return position
}
