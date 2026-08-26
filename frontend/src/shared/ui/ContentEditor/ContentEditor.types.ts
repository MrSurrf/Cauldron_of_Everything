import type { CSSProperties } from 'react'

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
  placeholder?: string
  readOnly?: boolean
  rootClassName?: string
  rows?: number
  showStructureActions?: boolean
  showTextScaleControls?: boolean
  style?: CSSProperties
  textScale?: number
  textScaleStep?: number
  value: string
}
