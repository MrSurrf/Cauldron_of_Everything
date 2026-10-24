import type {
  HTMLAttributes,
  ReactNode,
} from 'react'

export type SegmentedControlOption = {
  ariaLabel?: string
  disabled?: boolean
  label: ReactNode
  value: string
}

export type SegmentedControlProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'defaultValue' | 'onChange'
> & {
  defaultValue?: string | null
  disabled?: boolean
  name?: string
  onValueChange?: (value: string) => void
  options: readonly SegmentedControlOption[]
  value?: string | null
}
