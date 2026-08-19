import type {
  TextareaHTMLAttributes,
} from 'react'

import type {
  FieldControlProps,
  FieldPresentationProps,
} from '../internal/field/field.types'

export type TextAreaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'children'
> &
  FieldControlProps &
  FieldPresentationProps
