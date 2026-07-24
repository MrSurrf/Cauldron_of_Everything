import type {
  ReactNode,
  TextareaHTMLAttributes,
} from 'react'

export type TextAreaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'children'
> & {
  icon?: ReactNode
  rootClassName?: string
}
