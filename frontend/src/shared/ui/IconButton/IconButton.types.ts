import type { ReactElement } from 'react'

import type {
  ButtonProps,
  ButtonSize,
  ButtonVariant,
} from '../Button'

export type IconButtonSize = Exclude<
  ButtonSize,
  'hero'
>
export type IconButtonVariant = ButtonVariant

export type IconButtonProps = Omit<
  ButtonProps,
  | 'aria-label'
  | 'children'
  | 'fullWidth'
  | 'icon'
  | 'size'
  | 'variant'
> & {
  'aria-label': string
  icon: ReactElement
  loading?: boolean
  size?: IconButtonSize
  variant?: IconButtonVariant
}
