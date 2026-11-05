import {
  useState,
  type AnimationEvent,
  type HTMLAttributes,
  type ReactNode,
} from 'react'

import styles from './AnimatedDisclosure.module.css'

export type AnimatedDisclosureProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'inert'
> & {
  children: ReactNode
  contentClassName?: string
  open: boolean
}

/**
 * Сохраняет содержимое в DOM на время закрытия, чтобы обе стороны перехода
 * были плавными. После анимации закрытый контент удаляется и не участвует в
 * навигации с клавиатуры.
 */
export function AnimatedDisclosure({
  children,
  className,
  contentClassName,
  open,
  ...props
}: AnimatedDisclosureProps) {
  const [visibility, setVisibility] = useState(() => ({
    animating: false,
    mounted: open,
    open,
  }))
  const reducedMotion = typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (open !== visibility.open) {
    setVisibility({
      animating: !reducedMotion,
      mounted: open || (!reducedMotion && visibility.mounted),
      open,
    })
  }

  if (!open && (!visibility.mounted || reducedMotion)) return null

  function finishAnimation(event: AnimationEvent<HTMLDivElement>) {
    if (
      event.target === event.currentTarget &&
      !event.pseudoElement
    ) {
      setVisibility({
        animating: false,
        mounted: open,
        open,
      })
    }
  }

  const state = visibility.animating
    ? open ? 'opening' : 'closing'
    : 'open'

  return (
    <div
      {...props}
      aria-hidden={open ? undefined : true}
      className={[styles.root, className].filter(Boolean).join(' ')}
      data-animated-disclosure
      data-state={state}
      inert={open ? undefined : true}
      onAnimationEnd={finishAnimation}
    >
      <div className={styles.clip}>
        <div className={contentClassName}>{children}</div>
      </div>
    </div>
  )
}
