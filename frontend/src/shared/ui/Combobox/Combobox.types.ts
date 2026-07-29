import type {
  InputHTMLAttributes,
  ReactNode,
} from 'react'

export type ComboboxOption = {
  description?: ReactNode
  disabled?: boolean
  icon?: ReactNode
  keywords?: readonly string[]
  label: string
  value: string
}

export type ComboboxFilter = (
  option: ComboboxOption,
  query: string,
) => boolean

export type ComboboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | 'children'
  | 'defaultValue'
  | 'onChange'
  | 'size'
  | 'value'
> & {
  defaultOpen?: boolean
  defaultValue?: string | null
  emptyText?: ReactNode
  error?: ReactNode
  fieldClassName?: string
  filterOption?: ComboboxFilter
  hint?: ReactNode
  invalid?: boolean
  invalidSelectionMessage?: string
  label?: ReactNode
  listboxLabel?: string
  onOpenChange?: (open: boolean) => void
  onQueryChange?: (query: string) => void
  onValueChange?: (
    value: string | null,
    option: ComboboxOption | null,
  ) => void
  open?: boolean
  options: readonly ComboboxOption[]
  portalContainer?: HTMLElement
  rootClassName?: string
  value?: string | null
}
