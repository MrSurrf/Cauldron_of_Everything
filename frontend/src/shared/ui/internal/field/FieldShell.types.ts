import type {
  AriaAttributes,
  CSSProperties,
  ReactNode,
} from 'react'

export type FieldShellControlProps = {
  id: string
  'aria-describedby'?: string
  'aria-errormessage'?: string
  'aria-invalid'?: AriaAttributes['aria-invalid']
}

export type FieldShellRenderProps = {
  controlProps: FieldShellControlProps
  controlClassName: string
  frameClassName: string
}

export type FieldShellProps = {
  /** Рендер-функция получает готовую связь поля с label и сообщениями. */
  children: (
    props: FieldShellRenderProps,
  ) => ReactNode
  /** Исходный aria-describedby контрола. ID подсказки или ошибки добавятся к нему. */
  describedBy?: string
  /** Стабильный id контрола. Если не задан, FieldShell создаст его сам. */
  controlId?: string
  /** Дополнительный контент в позиции счётчика поля. */
  counter?: ReactNode
  counterId?: string
  disabled?: boolean
  error?: ReactNode
  /** Исходный aria-errormessage контрола. */
  errorMessage?: string
  filled?: boolean
  hasIcon?: boolean
  hint?: ReactNode
  invalid?: boolean
  label?: ReactNode
  multiline?: boolean
  readOnly?: boolean
  required?: boolean
  /** Исходный aria-invalid контрола. */
  ariaInvalid?: AriaAttributes['aria-invalid']
  className?: string
  style?: CSSProperties
}
