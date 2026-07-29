import type {
  ForwardedRef,
  ReactNode,
  Ref,
} from 'react'

export function hasRenderableContent(
  value: ReactNode,
) {
  if (typeof value === 'string') {
    return value.trim().length > 0
  }

  return (
    value !== undefined &&
    value !== null &&
    value !== false
  )
}

export function setRef<T>(
  ref: ForwardedRef<T> | Ref<T> | undefined,
  value: T | null,
) {
  if (typeof ref === 'function') {
    ref(value)
  } else if (ref) {
    ref.current = value
  }
}
