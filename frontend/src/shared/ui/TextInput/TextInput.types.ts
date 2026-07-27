import type {
  InputHTMLAttributes,
} from 'react'

import type { TextFieldControlProps } from '../TextField/TextField.types'

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
  type?: TextInputType
} & TextFieldControlProps
