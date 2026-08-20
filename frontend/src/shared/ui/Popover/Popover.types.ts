import type {
  FocusEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
  ReactElement,
  ReactNode,
  Ref,
} from 'react'

import type { OverlayPlacement } from '../Overlay/useAnchoredPosition'

export type PopoverPlacement = OverlayPlacement

export type PopoverTriggerProps = {
  'aria-controls'?: string
  'aria-disabled'?: boolean
  'aria-expanded'?: boolean
  'aria-haspopup'?: 'dialog'
  disabled?: boolean
  onBlur?: FocusEventHandler<HTMLElement>
  onClick?: MouseEventHandler<HTMLElement>
  onFocus?: FocusEventHandler<HTMLElement>
  onKeyDown?: KeyboardEventHandler<HTMLElement>
  ref?: Ref<HTMLElement>
  tabIndex?: number
}

export type PopoverProps = {
  'aria-label'?: string
  'aria-labelledby'?: string
  children: ReactElement<PopoverTriggerProps>
  className?: string
  content: ReactNode
  defaultOpen?: boolean
  disabled?: boolean
  id?: string
  matchTriggerWidth?: boolean
  offset?: number
  onOpenChange?: (open: boolean) => void
  open?: boolean
  placement?: PopoverPlacement
  portalContainer?: HTMLElement
}
