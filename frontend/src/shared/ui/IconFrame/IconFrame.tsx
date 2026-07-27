import {
  forwardRef,
  type CSSProperties,
} from 'react'

import frameAssetUrl from './assets/icon-frame.svg?url&no-inline'
import type { IconFrameProps } from './IconFrame.types'
import styles from './IconFrame.module.css'

type IconFrameStyle = CSSProperties & {
  '--icon-frame-circle-background'?: string
  '--icon-frame-circle-opacity'?: string
  '--icon-frame-color'?: string
  '--icon-frame-content-size'?: string
  '--icon-frame-size'?: string
  '--icon-frame-square-background'?: string
}

function toCssSize(
  value: CSSProperties['width'],
): string | undefined {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return undefined
    }

    return `${Math.max(value, 0)}px`
  }

  return value
}

function toContentCssSize(
  contentSize: CSSProperties['width'],
  frameSize: CSSProperties['width'],
): string | undefined {
  if (
    typeof contentSize === 'number' &&
    Number.isFinite(contentSize) &&
    typeof frameSize === 'number' &&
    Number.isFinite(frameSize) &&
    frameSize > 0
  ) {
    const ratio =
      Math.max(contentSize, 0) /
      frameSize

    return `${Math.min(ratio, 1) * 100}%`
  }

  return toCssSize(contentSize)
}

function normalizeOpacity(
  value: number | undefined,
): string | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!Number.isFinite(value)) {
    return '0.1'
  }

  return String(
    Math.min(
      Math.max(value, 0),
      1,
    ),
  )
}

export const IconFrame = forwardRef<
  HTMLSpanElement,
  IconFrameProps
>(function IconFrame(
  {
    children,
    circleBackgroundColor,
    circleBackgroundOpacity,
    className,
    contentSize,
    frameColor,
    glow = true,
    size,
    squareBackgroundColor,
    style,
    ...spanProps
  },
  ref,
) {
  const rootClassName = [
    styles.iconFrame,
    className,
  ]
    .filter(Boolean)
    .join(' ')
  const rootStyle = {
    ...style,
    '--icon-frame-circle-background':
      circleBackgroundColor,
    '--icon-frame-circle-opacity':
      normalizeOpacity(
        circleBackgroundOpacity,
      ),
    '--icon-frame-color': frameColor,
    '--icon-frame-content-size':
      toContentCssSize(contentSize, size),
    '--icon-frame-size': toCssSize(size),
    '--icon-frame-square-background':
      squareBackgroundColor,
  } as IconFrameStyle

  return (
    <span
      {...spanProps}
      ref={ref}
      className={rootClassName}
      style={rootStyle}
      data-glow={glow}
    >
      <svg
        className={styles.frame}
        viewBox="0 0 1121 1135"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        <use
          className={styles.squareSurface}
          href={`${frameAssetUrl}#icon-frame-outer-shape`}
        />

        <use
          className={styles.circleSurface}
          href={`${frameAssetUrl}#icon-frame-circle`}
        />

        <g className={styles.frameLines}>
          <use
            className={[
              styles.stroke,
              styles.outerStroke,
            ].join(' ')}
            href={`${frameAssetUrl}#icon-frame-outer-shape`}
          />
          <use
            className={[
              styles.stroke,
              styles.detailStroke,
            ].join(' ')}
            href={`${frameAssetUrl}#icon-frame-circle`}
          />
          <use
            className={[
              styles.stroke,
              styles.detailStroke,
            ].join(' ')}
            href={`${frameAssetUrl}#icon-frame-corner-top-left`}
          />
          <use
            className={[
              styles.stroke,
              styles.detailStroke,
            ].join(' ')}
            href={`${frameAssetUrl}#icon-frame-corner-top-right`}
          />
          <use
            className={[
              styles.stroke,
              styles.detailStroke,
            ].join(' ')}
            href={`${frameAssetUrl}#icon-frame-corner-bottom-right`}
          />
          <use
            className={[
              styles.stroke,
              styles.detailStroke,
            ].join(' ')}
            href={`${frameAssetUrl}#icon-frame-corner-bottom-left`}
          />
        </g>
      </svg>

      {children !== undefined &&
        children !== null && (
          <span className={styles.content}>
            <span className={styles.contentSize}>
              {children}
            </span>
          </span>
        )}
    </span>
  )
})
