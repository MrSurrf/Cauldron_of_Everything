import type {
  InputHTMLAttributes,
  ReactNode,
} from 'react'

export type TextInputType =
  | 'text'
  | 'search'
  | 'email'
  | 'password'
  | 'url'
  | 'tel'

export type TextInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'children' | 'type'
> & {
  icon?: ReactNode
  rootClassName?: string
  type?: TextInputType
}
