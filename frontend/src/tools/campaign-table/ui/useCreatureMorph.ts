import { useLayoutEffect, useRef } from 'react'

type Size = { width: number; height: number }

/** Анимируется тот же DOM-узел; React Flow измеряет его и перестраивает контур связей. */
export function useCreatureMorph(enabled: boolean, expanded: boolean) {
  const nodeRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const previousSize = useRef<Size | null>(null)
  const sizeAnimation = useRef<Animation | null>(null)
  const contentAnimation = useRef<Animation | null>(null)
  const glowAnimation = useRef<Animation | null>(null)

  useLayoutEffect(() => {
    const node = nodeRef.current
    const content = contentRef.current
    const flowNode = node?.closest<HTMLElement>('.react-flow__node')
    if (!enabled || !node || !content || !flowNode) return

    const measure = () => {
      const next = { width: content.offsetWidth, height: Math.max(content.offsetHeight, parseFloat(getComputedStyle(node).minHeight) || 0) }
      const previous = previousSize.current
      if (!next.width || !next.height || (previous?.width === next.width && previous.height === next.height)) return
      const start = sizeAnimation.current?.playState === 'running'
        ? { width: flowNode.offsetWidth, height: flowNode.offsetHeight } : previous
      sizeAnimation.current?.cancel()
      contentAnimation.current?.cancel()
      glowAnimation.current?.cancel()
      previousSize.current = next
      if (!start || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const duration = parseFloat(getComputedStyle(node).getPropertyValue('--motion-duration-normal')) || 240
      sizeAnimation.current = flowNode.animate([
        { width: `${start.width}px`, height: `${start.height}px` },
        { width: `${next.width}px`, height: `${next.height}px` },
      ], { duration: duration * 1.5, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' })
      contentAnimation.current = content.animate([
        { opacity: 0, transform: 'translateY(8px) scale(0.94)', filter: 'blur(3px)' },
        { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0)' },
      ], { duration, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' })
      glowAnimation.current = node.animate([
        { filter: 'drop-shadow(0 0 0 transparent)' },
        { filter: 'drop-shadow(0 0 12px var(--color-brand-muted))', offset: 0.35 },
        { filter: 'drop-shadow(0 0 0 transparent)' },
      ], { duration: duration * 2, easing: 'ease-out' })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    return () => observer.disconnect()
  }, [enabled, expanded])

  useLayoutEffect(() => () => {
    sizeAnimation.current?.cancel()
    contentAnimation.current?.cancel()
    glowAnimation.current?.cancel()
  }, [])

  return { nodeRef, contentRef }
}
