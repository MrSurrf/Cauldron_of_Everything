import type { HTMLAttributes } from 'react'

export type PanelPadding =
  | 'none'
  | 'compact'
  | 'normal'

export type PanelProps =
  HTMLAttributes<HTMLDivElement> & {
    padding?: PanelPadding
  }
