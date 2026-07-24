import type {
  ButtonHTMLAttributes,
  ReactNode,
} from 'react'

export type MenuButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  | 'aria-controls'
  | 'aria-expanded'
  | 'aria-haspopup'
  | 'children'
> & {
  children: ReactNode
  icon?: ReactNode
  active?: boolean
  dropdown?: ReactNode
  expanded?: boolean
  defaultExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
}
