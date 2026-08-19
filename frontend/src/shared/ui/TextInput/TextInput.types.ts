import type {
  InputHTMLAttributes,
} from 'react'

import type {
  FieldControlProps,
  FieldPresentationProps,
} from '../internal/field/field.types'

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
> &
  FieldControlProps &
  FieldPresentationProps & {
    type?: TextInputType
  }
