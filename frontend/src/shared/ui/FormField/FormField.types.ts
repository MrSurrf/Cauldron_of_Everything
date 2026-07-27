import type {
  ReactElement,
  ReactNode,
  RefAttributes,
} from 'react'

import type { TextAreaProps } from '../TextArea'
import type { TextInputProps } from '../TextInput'

type FormFieldSharedProps = {
  error?: ReactNode
  fieldClassName?: string
  hint?: ReactNode
  invalid?: boolean
  label?: ReactNode
  showCharacterCount?: boolean
  validationKey?: number | string
}

export type FormFieldInputProps =
  FormFieldSharedProps &
    TextInputProps & {
      as?: 'input'
    }

export type FormFieldTextAreaProps =
  FormFieldSharedProps &
    TextAreaProps & {
      as: 'textarea'
    }

export type FormFieldProps =
  | FormFieldInputProps
  | FormFieldTextAreaProps

type FormFieldComponentProps =
  | (FormFieldInputProps &
      RefAttributes<HTMLInputElement>)
  | (FormFieldTextAreaProps &
      RefAttributes<HTMLTextAreaElement>)

export type FormFieldComponent = (
  props: FormFieldComponentProps,
) => ReactElement | null
