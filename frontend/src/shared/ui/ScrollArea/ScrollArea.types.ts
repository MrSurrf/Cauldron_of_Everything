import type {
  CSSProperties,
  HTMLAttributes,
  ReactNode,
} from 'react'

export type ScrollAreaOrientation =
  | 'horizontal'
  | 'vertical'
  | 'both'

export type ScrollAreaProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> & {
  children?: ReactNode
  contentClassName?: string
  horizontalScrollBarLabel?: string
  orientation?: ScrollAreaOrientation
  rootClassName?: string
  rootStyle?: CSSProperties
  verticalScrollBarLabel?: string
}
