import type {
  CSSProperties,
  HTMLAttributes,
  ReactNode,
} from 'react'

export type IconFrameProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  'children'
> & {
  children?: ReactNode
  size?: CSSProperties['width']
  contentSize?: CSSProperties['width']
  glow?: boolean
  frameColor?: string
  squareBackgroundColor?: string
  circleBackgroundColor?: string
  circleBackgroundOpacity?: number
}
