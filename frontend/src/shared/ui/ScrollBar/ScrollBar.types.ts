import type {
  CSSProperties,
  InputHTMLAttributes,
} from 'react'

export type ScrollBarOrientation =
  | 'horizontal'
  | 'vertical'

export type ScrollBarProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | 'className'
  | 'defaultValue'
  | 'max'
  | 'min'
  | 'onChange'
  | 'step'
  | 'style'
  | 'type'
  | 'value'
> & {
  orientation?: ScrollBarOrientation
  min?: number
  max?: number
  step?: number
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  decrementLabel?: string
  incrementLabel?: string
  className?: string
  style?: CSSProperties
}
