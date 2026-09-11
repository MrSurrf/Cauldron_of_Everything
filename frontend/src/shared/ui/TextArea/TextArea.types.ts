import type {
  ReactNode,
  TextareaHTMLAttributes,
} from 'react'

import type {
  FieldControlProps,
  FieldPresentationProps,
} from '../internal/field/field.types'
import type { TextFormatAction } from '../internal/content/TextFormattingToolbar'

export type TextAreaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'children'
> &
  FieldControlProps &
  FieldPresentationProps & {
    /**
     * Включает компактную панель Markdown-подобного форматирования,
     * которая появляется только при выделении текста.
     */
    formatting?: 'markdown'
    /**
     * Дополнительная панель действий конкретного инструмента. Панель
     * показывается внутри поля только пока фокус находится в редакторе.
     */
    topToolbar?: ReactNode
    /** Показывает компактные кнопки уменьшения и увеличения текста. */
    showTextScaleControls?: boolean
    /** Управляемый масштаб текста. `1` соответствует 100%. */
    textScale?: number
    /** Начальный масштаб для неуправляемого режима. */
    defaultTextScale?: number
    /** Вызывается при изменении масштаба кнопками `−` и `+`. */
    onTextScaleChange?: (textScale: number) => void
    /** Минимальный доступный масштаб. По умолчанию `0.75`. */
    minTextScale?: number
    /** Максимальный доступный масштаб. По умолчанию `1.5`. */
    maxTextScale?: number
    /** Шаг изменения масштаба. По умолчанию `0.125`. */
    textScaleStep?: number
    /** Уведомляет инструмент о применённой команде форматирования. */
    onFormat?: (
      action: TextAreaFormatAction,
      value: string,
    ) => void
  }

export type TextAreaFormatAction = TextFormatAction
