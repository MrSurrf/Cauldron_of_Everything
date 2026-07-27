import type {
  TextareaHTMLAttributes,
} from 'react'

import type { TextFieldControlProps } from '../TextField/TextField.types'

export type TextAreaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'children'
> &
  TextFieldControlProps
