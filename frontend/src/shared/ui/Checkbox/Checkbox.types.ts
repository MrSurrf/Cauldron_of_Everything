import type {
  ChangeEvent,
  InputHTMLAttributes,
  ReactNode,
} from 'react'

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'children' | 'size' | 'type'
> & {
  description?: ReactNode
  indeterminate?: boolean
  label?: ReactNode
  onCheckedChange?: (
    checked: boolean,
    event: ChangeEvent<HTMLInputElement>,
  ) => void
  rootClassName?: string
}
