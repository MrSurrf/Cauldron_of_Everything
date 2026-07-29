import type { ReactNode } from 'react'

export type FieldControlProps = {
  icon?: ReactNode
  rootClassName?: string
}

export type FieldPresentationProps = {
  error?: ReactNode
  fieldClassName?: string
  hint?: ReactNode
  invalid?: boolean
  label?: ReactNode
  showCharacterCount?: boolean
}
