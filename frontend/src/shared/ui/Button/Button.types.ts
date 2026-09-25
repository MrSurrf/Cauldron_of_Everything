import type {
  ButtonHTMLAttributes,
  ReactNode,
} from 'react'

export type ButtonVariant = 'primary' | 'secondary'
export type ButtonDecoration = 'ornate' | 'minimal' | 'bare'
export type ButtonSize =
  | 'sm'
  | 'md'
  | 'lg'
  | 'hero'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  decoration?: ButtonDecoration
  fullWidth?: boolean
  icon?: ReactNode
}
