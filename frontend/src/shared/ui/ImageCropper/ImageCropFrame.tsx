import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react'
import { moveCrop, resizeCrop, normalizeCrop } from './cropGeometry'
import type { CropHandle, CropRect } from './cropGeometry'
import styles from './ImageCropFrame.module.css'

const handles: { handle: CropHandle; label: string }[] = [
  { handle: 'nw', label: 'верхний левый угол' }, { handle: 'n', label: 'верхняя граница' },
  { handle: 'ne', label: 'верхний правый угол' }, { handle: 'e', label: 'правая граница' },
  { handle: 'se', label: 'нижний правый угол' }, { handle: 's', label: 'нижняя граница' },
  { handle: 'sw', label: 'нижний левый угол' }, { handle: 'w', label: 'левая граница' },
]

type Gesture = {
  pointerId: number; handle: CropHandle | 'move'; start: CropRect; current: CropRect
  x: number; y: number; bounds: DOMRect; target: HTMLElement
}

/** Координаты всегда относительно полного повёрнутого фото, без полей object-fit. */
export function ImageCropFrame({ crop: value, dimensions, onCropChange, aspectRatio, children, articleSelectors = false }: {
  crop: CropRect; dimensions: { width: number; height: number }; children: ReactNode
  onCropChange: (crop: CropRect) => void; aspectRatio?: number; articleSelectors?: boolean
}) {
  const stageRef = useRef<HTMLDivElement>(null)
  const instructionsId = useId()
  const surfaceRef = useRef<HTMLDivElement>(null)
  const gestureRef = useRef<Gesture | null>(null)
  const animationRef = useRef(0)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const [movingCrop, setMovingCrop] = useState<CropRect | null>(null)
  const naturalWidth = dimensions.width
  const naturalHeight = dimensions.height
  const normalizedAspect = aspectRatio ? aspectRatio / (naturalWidth / naturalHeight) : undefined
  const crop = movingCrop ?? normalizeCrop(value)
  const availableWidth = Math.max(0, stageSize.width - 28)
  const availableHeight = Math.max(0, stageSize.height - 28)
  const scale = Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight)
  const photoWidth = naturalWidth * scale
  const photoHeight = naturalHeight * scale

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const measure = () => setStageSize(current => current.width === stage.clientWidth && current.height === stage.clientHeight
      ? current : { width: stage.clientWidth, height: stage.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  useEffect(() => () => {
    cancelAnimationFrame(animationRef.current)
    const gesture = gestureRef.current
    gestureRef.current = null
    if (gesture?.target.hasPointerCapture(gesture.pointerId)) gesture.target.releasePointerCapture(gesture.pointerId)
  }, [])

  function endGesture(commit: boolean) {
    const gesture = gestureRef.current
    if (!gesture) return
    gestureRef.current = null
    cancelAnimationFrame(animationRef.current); animationRef.current = 0
    if (gesture.target.hasPointerCapture(gesture.pointerId)) gesture.target.releasePointerCapture(gesture.pointerId)
    setMovingCrop(null)
    if (commit) onCropChange(gesture.current)
  }

  function begin(event: PointerEvent<HTMLElement>, handle: CropHandle | 'move') {
    if (gestureRef.current || (event.pointerType === 'mouse' && event.button !== 0)) return
    const bounds = surfaceRef.current?.getBoundingClientRect()
    if (!bounds?.width || !bounds.height) return
    event.preventDefault(); event.stopPropagation()
    event.currentTarget.focus({ preventScroll: true })
    const start = normalizeCrop(value)
    gestureRef.current = { pointerId: event.pointerId, handle, start, current: start, x: event.clientX, y: event.clientY, bounds, target: event.currentTarget }
    setMovingCrop(start)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function pointerMove(event: PointerEvent<HTMLElement>) {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    const dx = (event.clientX - gesture.x) / gesture.bounds.width
    const dy = (event.clientY - gesture.y) / gesture.bounds.height
    gesture.current = gesture.handle === 'move' ? moveCrop(gesture.start, dx, dy)
      : resizeCrop(gesture.start, gesture.handle, dx, dy, {
        aspectRatio: normalizedAspect,
        minWidth: Math.min(1, 24 / gesture.bounds.width), minHeight: Math.min(1, 24 / gesture.bounds.height),
      })
    if (!animationRef.current) animationRef.current = requestAnimationFrame(() => {
      animationRef.current = 0
      if (gestureRef.current === gesture) setMovingCrop(gesture.current)
    })
  }

  function keyboard(event: KeyboardEvent<HTMLElement>, handle: CropHandle | 'move') {
    if (event.key === 'Escape' && gestureRef.current) { event.preventDefault(); event.stopPropagation(); endGesture(false); return }
    const direction: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    const delta = direction[event.key]
    const bounds = surfaceRef.current?.getBoundingClientRect()
    if (!delta || !bounds?.width || !bounds.height) return
    event.preventDefault(); event.stopPropagation()
    if (gestureRef.current) return
    const step = event.shiftKey ? 10 : 1
    const dx = delta[0] * step / bounds.width, dy = delta[1] * step / bounds.height
    const start = normalizeCrop(value)
    onCropChange(handle === 'move' ? moveCrop(start, dx, dy) : resizeCrop(start, handle, dx, dy, {
      aspectRatio: normalizedAspect, minWidth: Math.min(1, 24 / bounds.width), minHeight: Math.min(1, 24 / bounds.height),
    }))
  }

  const eventHandlers = {
    onPointerMove: pointerMove,
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerId !== gestureRef.current?.pointerId) return
      pointerMove(event)
      endGesture(true)
    },
    onPointerCancel: (event: PointerEvent<HTMLElement>) => { if (event.pointerId === gestureRef.current?.pointerId) endGesture(false) },
    onLostPointerCapture: (event: PointerEvent<HTMLElement>) => { if (event.pointerId === gestureRef.current?.pointerId) endGesture(false) },
  }

  return <div className={styles.stage} ref={stageRef} data-crop-stage data-article-crop-stage={articleSelectors ? true : undefined}>
    {scale > 0 && <div className={styles.surface} ref={surfaceRef} data-crop-surface data-article-crop-surface={articleSelectors ? true : undefined}
      style={{ width: photoWidth, height: photoHeight, left: (stageSize.width - photoWidth) / 2, top: (stageSize.height - photoHeight) / 2 }}>
      <div className={styles.photo}>{children}</div>
      <div className={styles.frame} data-crop-frame data-article-crop-frame={articleSelectors ? true : undefined} data-dragging={movingCrop ? 'true' : undefined}
        role="group" tabIndex={0} aria-label="Рамка кадрирования. Переместить кадр" aria-describedby={instructionsId}
        style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.width * 100}%`, height: `${crop.height * 100}%` }}
        onPointerDown={event => { if (event.target === event.currentTarget) begin(event, 'move') }}
        onKeyDown={event => { if (event.target === event.currentTarget) keyboard(event, 'move') }} {...eventHandlers}>
        <span className={styles.grid} aria-hidden="true" />
        <span className={styles.badge} aria-hidden="true">{aspectRatio
          ? Math.abs(aspectRatio - 16 / 9) < 0.001 ? '16:9' : Math.abs(aspectRatio - 9 / 16) < 0.001 ? '9:16' : `${Math.round(naturalWidth * crop.width)} × ${Math.round(naturalHeight * crop.height)}`
          : `${Math.round(naturalWidth * crop.width)} × ${Math.round(naturalHeight * crop.height)}`}</span>
        {handles.map(({ handle, label }) => <button type="button" key={handle} className={styles.handle}
          data-crop-handle={handle} data-article-crop-handle={articleSelectors ? handle : undefined} aria-label={`Изменить кадр: ${label}`} aria-describedby={instructionsId}
          onPointerDown={event => begin(event, handle)} onKeyDown={event => keyboard(event, handle)} {...eventHandlers}><span aria-hidden="true" /></button>)}
      </div>
    </div>}
    <span className={styles.instructions} id={instructionsId}>Перемещайте рамку или тяните за её углы и границы. Стрелки — точная настройка, Shift — крупный шаг. Escape отменяет текущий жест.</span>
  </div>
}
