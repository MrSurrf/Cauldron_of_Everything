import type { CSSProperties, MouseEvent } from 'react'
import type { ContentResourceValue, ResourceFormulaResult } from './ResourceWidget'

export type ContentViewerAudience = 'master' | 'players' | 'public'

export type ContentSectionVisibility =
  | ContentViewerAudience
  | 'inherit'

export type ContentLinkActivateHandler = (
  target: string,
  event: MouseEvent<HTMLAnchorElement>,
) => void

export type ContentEditorProps = {
  accessibleLabel: string
  allowSections?: boolean
  autoFocus?: boolean
  autoGrow?: boolean
  className?: string
  defaultTextScale?: number
  disabled?: boolean
  fill?: boolean
  inheritedVisibility?: ContentViewerAudience
  maxTextScale?: number
  minTextScale?: number
  onLinkActivate?: ContentLinkActivateHandler
  onTextScaleChange?: (textScale: number) => void
  onValueChange: (value: string) => void
  evaluateResourceMaximum?: (expression: string) => ResourceFormulaResult
  onStructuredResourceChange?: (
    source: string,
    current: number,
    nextValue: string,
    resource?: ContentResourceValue,
  ) => void
  placeholder?: string
  readOnly?: boolean
  renderPreview?: boolean
  rootClassName?: string
  rows?: number
  showStructureActions?: boolean
  showTextScaleControls?: boolean
  style?: CSSProperties
  textScale?: number
  textScaleStep?: number
  value: string
  viewerAudience?: ContentViewerAudience
}
