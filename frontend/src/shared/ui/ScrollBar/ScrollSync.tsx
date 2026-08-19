import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

import { ScrollBar } from './ScrollBar'

type ScrollAxis =
  | 'horizontal'
  | 'vertical'

type ScrollAxisMetrics = {
  max: number
  step: number
  value: number
}

type ScrollMetrics = {
  horizontal: ScrollAxisMetrics
  vertical: ScrollAxisMetrics
}

type ScrollLayout = {
  isRtl: boolean
  step: number
}

type ElementRef = {
  readonly current: HTMLElement | null
}

type ScrollSyncBarConfig = {
  ariaLabel: string
  className?: string
  decrementLabel?: string
  disabled?: boolean
  incrementLabel?: string
  slotClassName?: string
}

type ScrollSyncProps = {
  contentRef?: ElementRef
  formOwnerKey?: unknown
  horizontal?: ScrollSyncBarConfig
  observeFormReset?: boolean
  observeInput?: boolean
  refreshKey?: unknown
  vertical?: ScrollSyncBarConfig
  viewportId: string
  viewportRef: ElementRef
}

const emptyAxisMetrics: ScrollAxisMetrics = {
  max: 0,
  step: 1,
  value: 0,
}

const emptyScrollMetrics: ScrollMetrics = {
  horizontal: emptyAxisMetrics,
  vertical: emptyAxisMetrics,
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
) {
  if (!Number.isFinite(value)) {
    return minimum
  }

  return Math.min(
    Math.max(value, minimum),
    maximum,
  )
}

function readScrollLayout(
  viewport: HTMLElement,
): ScrollLayout {
  const computedStyle = getComputedStyle(viewport)
  const lineHeight = Number.parseFloat(
    computedStyle.lineHeight,
  )
  const fontSize = Number.parseFloat(
    computedStyle.fontSize,
  )
  const step =
    Number.isFinite(lineHeight) && lineHeight > 0
      ? Math.max(1, Math.round(lineHeight))
      : Number.isFinite(fontSize) && fontSize > 0
        ? Math.max(
            1,
            Math.round(fontSize * 1.2),
          )
        : 16

  return {
    isRtl: computedStyle.direction === 'rtl',
    step,
  }
}

function readHorizontalPosition(
  viewport: HTMLElement,
  isRtl: boolean,
  maximum: number,
) {
  return isRtl
    ? maximum + viewport.scrollLeft
    : viewport.scrollLeft
}

function readAxisMetrics(
  value: number,
  scrollSize: number,
  clientSize: number,
  step: number,
): ScrollAxisMetrics {
  const max = Math.max(
    0,
    Math.round(scrollSize - clientSize),
  )

  return {
    max,
    step,
    value: clamp(Math.round(value), 0, max),
  }
}

function readScrollMetrics(
  viewport: HTMLElement,
  layout: ScrollLayout,
): ScrollMetrics {
  const horizontalMaximum = Math.max(
    0,
    viewport.scrollWidth - viewport.clientWidth,
  )

  return {
    horizontal: readAxisMetrics(
      readHorizontalPosition(
        viewport,
        layout.isRtl,
        horizontalMaximum,
      ),
      viewport.scrollWidth,
      viewport.clientWidth,
      layout.step,
    ),
    vertical: readAxisMetrics(
      viewport.scrollTop,
      viewport.scrollHeight,
      viewport.clientHeight,
      layout.step,
    ),
  }
}

function readScrollPositions(
  viewport: HTMLElement,
  current: ScrollMetrics,
  isRtl: boolean,
): ScrollMetrics {
  return {
    horizontal: {
      ...current.horizontal,
      value: clamp(
        Math.round(
          readHorizontalPosition(
            viewport,
            isRtl,
            current.horizontal.max,
          ),
        ),
        0,
        current.horizontal.max,
      ),
    },
    vertical: {
      ...current.vertical,
      value: clamp(
        Math.round(viewport.scrollTop),
        0,
        current.vertical.max,
      ),
    },
  }
}

function axisMetricsAreEqual(
  current: ScrollAxisMetrics,
  next: ScrollAxisMetrics,
) {
  return (
    current.max === next.max &&
    current.step === next.step &&
    current.value === next.value
  )
}

function metricsAreEqual(
  current: ScrollMetrics,
  next: ScrollMetrics,
) {
  return (
    axisMetricsAreEqual(
      current.horizontal,
      next.horizontal,
    ) &&
    axisMetricsAreEqual(
      current.vertical,
      next.vertical,
    )
  )
}

function getOwnerForm(
  viewport: HTMLElement,
) {
  return 'form' in viewport
    ? (
        viewport as HTMLElement & {
          form: HTMLFormElement | null
        }
      ).form
    : null
}

function getPositionText(
  metrics: ScrollAxisMetrics,
) {
  const percentage =
    metrics.max === 0
      ? 0
      : Math.round(
          (metrics.value / metrics.max) * 100,
        )

  return `${percentage}%`
}

export function ScrollSync({
  contentRef,
  formOwnerKey,
  horizontal,
  observeFormReset = false,
  observeInput = false,
  refreshKey,
  vertical,
  viewportId,
  viewportRef,
}: ScrollSyncProps) {
  const [metrics, setMetrics] = useState(
    emptyScrollMetrics,
  )
  const animationFrameRef = useRef<
    number | null
  >(null)
  const fullMeasureRef = useRef(true)
  const resetTimerRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null)
  const layoutRef = useRef<
    ScrollLayout | null
  >(null)

  const measure = useCallback(() => {
    animationFrameRef.current = null

    const viewport = viewportRef.current

    if (!viewport) {
      return
    }

    const fullMeasure = fullMeasureRef.current
    fullMeasureRef.current = false

    if (fullMeasure) {
      if (layoutRef.current === null) {
        layoutRef.current = readScrollLayout(viewport)
      }

      const next = readScrollMetrics(
        viewport,
        layoutRef.current,
      )

      setMetrics((current) =>
        metricsAreEqual(current, next)
          ? current
          : next,
      )
      return
    }

    setMetrics((current) => {
      const next = readScrollPositions(
        viewport,
        current,
        layoutRef.current?.isRtl ?? false,
      )

      return metricsAreEqual(current, next)
        ? current
        : next
    })
  }, [viewportRef])

  const scheduleMeasure = useCallback(() => {
    if (animationFrameRef.current !== null) {
      return
    }

    animationFrameRef.current =
      requestAnimationFrame(measure)
  }, [measure])

  const invalidateAndSchedule =
    useCallback(() => {
      fullMeasureRef.current = true
      layoutRef.current = null
      scheduleMeasure()
    }, [scheduleMeasure])

  const scheduleFullMeasure =
    useCallback(() => {
      fullMeasureRef.current = true
      scheduleMeasure()
    }, [scheduleMeasure])

  const setPosition = useCallback(
    (axis: ScrollAxis, value: number) => {
      const viewport = viewportRef.current

      if (!viewport) {
        return
      }

      if (axis === 'vertical') {
        viewport.scrollTop = clamp(
          value,
          0,
          Math.max(
            0,
            viewport.scrollHeight -
              viewport.clientHeight,
          ),
        )
      } else {
        const nextValue = clamp(
          value,
          0,
          Math.max(
            0,
            viewport.scrollWidth -
              viewport.clientWidth,
          ),
        )
        const layout =
          layoutRef.current ??
          readScrollLayout(viewport)

        layoutRef.current = layout
        viewport.scrollLeft = layout.isRtl
          ? nextValue -
            Math.max(
              0,
              viewport.scrollWidth -
                viewport.clientWidth,
            )
          : nextValue
      }

      setMetrics((current) => {
        const next = readScrollPositions(
          viewport,
          current,
          layoutRef.current?.isRtl ?? false,
        )

        return metricsAreEqual(current, next)
          ? current
          : next
      })
      scheduleMeasure()
    },
    [scheduleMeasure, viewportRef],
  )

  useLayoutEffect(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(
        animationFrameRef.current,
      )
      animationFrameRef.current = null
    }

    fullMeasureRef.current = true
    measure()
  }, [measure, refreshKey])

  useEffect(() => {
    const viewport = viewportRef.current

    if (!viewport) {
      return
    }

    const content = contentRef?.current

    function handleScroll() {
      scheduleMeasure()
    }

    function handleInput() {
      scheduleFullMeasure()
    }

    function handleContentGeometryChange() {
      scheduleFullMeasure()
    }

    viewport.addEventListener(
      'scroll',
      handleScroll,
      { passive: true },
    )

    if (observeInput) {
      viewport.addEventListener(
        'input',
        handleInput,
      )
    }

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver((entries) => {
            const viewportChanged =
              entries.some(
                (entry) =>
                  entry.target === viewport,
              )

            if (viewportChanged) {
              invalidateAndSchedule()
            } else {
              scheduleFullMeasure()
            }
          })

    resizeObserver?.observe(viewport)

    if (content && content !== viewport) {
      resizeObserver?.observe(content)
    }

    const viewportMutationObserver =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(
            invalidateAndSchedule,
          )

    viewportMutationObserver?.observe(viewport, {
      attributes: true,
    })

    const contentMutationObserver =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(
            scheduleFullMeasure,
          )

    if (content && content !== viewport) {
      contentMutationObserver?.observe(content, {
        attributes: true,
        attributeFilter: [
          'class',
          'height',
          'hidden',
          'open',
          'src',
          'style',
          'width',
        ],
        characterData: true,
        childList: true,
        subtree: true,
      })

      content.addEventListener(
        'load',
        handleContentGeometryChange,
        true,
      )
      content.addEventListener(
        'transitionend',
        handleContentGeometryChange,
      )
      content.addEventListener(
        'animationend',
        handleContentGeometryChange,
      )
    }

    const fontSet = viewport.ownerDocument.fonts

    fontSet?.addEventListener(
      'loadingdone',
      invalidateAndSchedule,
    )

    return () => {
      viewport.removeEventListener(
        'scroll',
        handleScroll,
      )

      if (observeInput) {
        viewport.removeEventListener(
          'input',
          handleInput,
        )
      }

      resizeObserver?.disconnect()
      viewportMutationObserver?.disconnect()
      contentMutationObserver?.disconnect()

      if (content && content !== viewport) {
        content.removeEventListener(
          'load',
          handleContentGeometryChange,
          true,
        )
        content.removeEventListener(
          'transitionend',
          handleContentGeometryChange,
        )
        content.removeEventListener(
          'animationend',
          handleContentGeometryChange,
        )
      }

      fontSet?.removeEventListener(
        'loadingdone',
        invalidateAndSchedule,
      )
    }
  }, [
    contentRef,
    invalidateAndSchedule,
    observeInput,
    scheduleMeasure,
    scheduleFullMeasure,
    viewportRef,
  ])

  useEffect(() => {
    const viewport = viewportRef.current
    const ownerForm =
      viewport && observeFormReset
        ? getOwnerForm(viewport)
        : null

    if (!ownerForm) {
      return
    }

    function handleReset() {
      if (resetTimerRef.current !== null) {
        clearTimeout(resetTimerRef.current)
      }

      resetTimerRef.current = setTimeout(() => {
        resetTimerRef.current = null
        scheduleFullMeasure()
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

      if (resetTimerRef.current !== null) {
        clearTimeout(resetTimerRef.current)
        resetTimerRef.current = null
      }
    }
  }, [
    formOwnerKey,
    observeFormReset,
    scheduleFullMeasure,
    viewportRef,
  ])

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(
          animationFrameRef.current,
        )
      }

      if (resetTimerRef.current !== null) {
        clearTimeout(resetTimerRef.current)
      }
    },
    [],
  )

  function renderScrollBar(
    axis: ScrollAxis,
    config: ScrollSyncBarConfig,
  ) {
    const axisMetrics = metrics[axis]
    const scrollBar =
      axisMetrics.max > 0 ? (
        <ScrollBar
          aria-controls={viewportId}
          aria-label={config.ariaLabel}
          aria-valuetext={getPositionText(
            axisMetrics,
          )}
          className={config.className}
          controlStep={axisMetrics.step}
          decrementLabel={
            config.decrementLabel
          }
          disabled={config.disabled}
          incrementLabel={
            config.incrementLabel
          }
          max={axisMetrics.max}
          min={0}
          onValueChange={(value) => {
            setPosition(axis, value)
          }}
          orientation={axis}
          step={1}
          value={axisMetrics.value}
        />
      ) : null

    return config.slotClassName ? (
      <div
        className={config.slotClassName}
        data-visible={
          axisMetrics.max > 0 || undefined
        }
      >
        {scrollBar}
      </div>
    ) : (
      scrollBar
    )
  }

  return (
    <>
      {vertical &&
        renderScrollBar('vertical', vertical)}
      {horizontal &&
        renderScrollBar(
          'horizontal',
          horizontal,
        )}
    </>
  )
}
