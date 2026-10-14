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
    mounted: open,
    open,
  }))

  if (open !== visibility.open) {
    setVisibility({
      mounted: open || visibility.mounted,
      open,
    })
  }

  const reducedMotion = typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!open && (!visibility.mounted || reducedMotion)) return null

  function finishClosing(event: AnimationEvent<HTMLDivElement>) {
    if (
      event.target === event.currentTarget &&
      !event.pseudoElement &&
      !open
    ) {
      setVisibility({ mounted: false, open: false })
    }
  }

  return (
    <div
      {...props}
      aria-hidden={open ? undefined : true}
      className={[styles.root, className].filter(Boolean).join(' ')}
      data-animated-disclosure
      data-state={open ? 'open' : 'closing'}
      inert={open ? undefined : true}
      onAnimationEnd={finishClosing}
    >
      <div className={styles.clip}>
        <div className={contentClassName}>{children}</div>
      </div>
    </div>
  )
}
