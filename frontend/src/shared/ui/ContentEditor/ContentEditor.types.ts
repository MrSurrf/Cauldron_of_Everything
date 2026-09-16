import type { CSSProperties } from 'react'
import type { ContentResourceValue, ResourceFormulaResult } from './ResourceWidget'

export type ContentEditorProps = {
  accessibleLabel: string
  autoFocus?: boolean
  className?: string
  defaultTextScale?: number
  disabled?: boolean
  fill?: boolean
  maxTextScale?: number
  minTextScale?: number
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
}
