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
  'aria-describedby'?: string
  onBlur?: FocusEventHandler<HTMLElement>
  onFocus?: FocusEventHandler<HTMLElement>
  onKeyDown?: KeyboardEventHandler<HTMLElement>
  onMouseEnter?: MouseEventHandler<HTMLElement>
  onMouseLeave?: MouseEventHandler<HTMLElement>
  ref?: Ref<HTMLElement>
}

export type TooltipProps = {
  children: ReactElement<TooltipTriggerProps>
  className?: string
  closeDelay?: number
  content: ReactNode
  defaultOpen?: boolean
  disabled?: boolean
  id?: string
  offset?: number
  onOpenChange?: (open: boolean) => void
  open?: boolean
  openDelay?: number
  placement?: TooltipPlacement
  portalContainer?: HTMLElement
}
