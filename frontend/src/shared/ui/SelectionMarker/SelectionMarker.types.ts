import type { HTMLAttributes } from 'react'

export type SelectionMarkerState =
  | 'unchecked'
  | 'checked'
  | 'mixed'
  | 'diamond'

export type SelectionMarkerProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  'children'
> & {
  state?: SelectionMarkerState
}
