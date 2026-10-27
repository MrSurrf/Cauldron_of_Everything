import type {
  FocusEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
  ReactElement,
  ReactNode,
  Ref,
} from 'react'

import type { OverlayPlacement } from '../Overlay/useAnchoredPosition'

export type TooltipPlacement =
  OverlayPlacement

export type TooltipTriggerProps = {
  'aria-controls'?: string
  'aria-describedby'?: string
  'aria-disabled'?: boolean
  'aria-expanded'?: boolean
  'aria-haspopup'?: 'dialog'
  onBlur?: FocusEventHandler<HTMLElement>
  onClick?: MouseEventHandler<HTMLElement>
  onFocus?: FocusEventHandler<HTMLElement>
  onKeyDown?: KeyboardEventHandler<HTMLElement>
  onMouseEnter?: MouseEventHandler<HTMLElement>
  onMouseLeave?: MouseEventHandler<HTMLElement>
  ref?: Ref<HTMLElement>
  tabIndex?: number
}

export type TooltipProps = {
  'aria-controls'?: string
  'aria-disabled'?: boolean
  'aria-expanded'?: boolean
  'aria-haspopup'?: 'dialog'
  children: ReactElement<TooltipTriggerProps>
  className?: string
  closeDelay?: number
  content: ReactNode
  defaultOpen?: boolean
  disabled?: boolean
  id?: string
  offset?: number
  onClick?: MouseEventHandler<HTMLElement>
  onKeyDown?: KeyboardEventHandler<HTMLElement>
  onOpenChange?: (open: boolean) => void
  open?: boolean
  openDelay?: number
  placement?: TooltipPlacement
  portalContainer?: HTMLElement
  tabIndex?: number
}
