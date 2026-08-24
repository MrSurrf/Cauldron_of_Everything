import {
  useRef,
  useState,
  type FocusEvent,
} from 'react'

import {
  Button,
  TextArea,
} from '../../../../shared/ui'
import { CharacterNotesPreview } from './CharacterNotesPreview'
import styles from './CharacterNotesEditor.module.css'

export type CharacterNotesInsertAction =
  | 'resource'
  | 'collapsible'
  | 'divider'

export type CharacterNotesEditorProps = {
  accessibleLabel: string
  className?: string
  fill?: boolean
  placeholder?: string
  renderPreview?: boolean
  rows?: number
  showStructureActions?: boolean
  value: string
  onStructuredResourceChange?: (
    source: string,
    current: number,
    nextValue: string,
  ) => void
  onValueChange: (value: string) => void
}

const insertTemplates: Readonly<
  Record<CharacterNotesInsertAction, string>
> = {
  resource: [
    ':::resource[Новый ресурс]{current=0 maximum=1 recovery=long}',
    'Описание ресурса',
    ':::',
  ].join('\n'),
  collapsible: [
    ':::collapsible[Название блока]',
    'Содержимое раскрывающегося блока',
    ':::',
  ].join('\n'),
  divider: '---',
}

const MIN_TEXT_SCALE = 0.75
const MAX_TEXT_SCALE = 1.5
const TEXT_SCALE_STEP = 0.125

function withParagraphSpacing(
  value: string,
  insertion: string,
  start: number,
  end: number,
) {
  const before = value.slice(0, start)
  const after = value.slice(end)
  const prefix =
    before.length > 0 && !before.endsWith('\n\n')
      ? before.endsWith('\n')
        ? '\n'
        : '\n\n'
      : ''
  const suffix =
    after.length > 0 && !after.startsWith('\n\n')
      ? after.startsWith('\n')
        ? '\n'
        : '\n\n'
      : ''

  return {
    nextValue: `${before}${prefix}${insertion}${suffix}${after}`,
    selectionEnd:
      before.length + prefix.length + insertion.length,
  }
}

export function CharacterNotesEditor({
  accessibleLabel,
  className,
  fill = false,
  placeholder = 'Введите текст...',
  renderPreview = true,
  rows = 5,
  showStructureActions = false,
  value,
  onStructuredResourceChange,
  onValueChange,
}: CharacterNotesEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [editing, setEditing] = useState(false)
  const [textScale, setTextScale] = useState(1)

  function beginEditing() {
    setEditing(true)

    requestAnimationFrame(() => {
      textareaRef.current?.focus()
    })
  }

  function changeTextScale(direction: -1 | 1) {
    setTextScale((current) =>
      Math.min(
        MAX_TEXT_SCALE,
        Math.max(
          MIN_TEXT_SCALE,
          Math.round(
            (current + direction * TEXT_SCALE_STEP) * 1000,
          ) / 1000,
        ),
      ),
    )
  }

  function finishEditing(
    event: FocusEvent<HTMLDivElement>,
  ) {
    const nextTarget = event.relatedTarget

    if (
      nextTarget instanceof Node &&
      rootRef.current?.contains(nextTarget)
    ) {
      return
    }

    setEditing(false)
  }

  function insert(action: CharacterNotesInsertAction) {
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? value.length
    const end = textarea?.selectionEnd ?? start
    const { nextValue, selectionEnd } = withParagraphSpacing(
      value,
      insertTemplates[action],
      start,
      end,
    )

    onValueChange(nextValue)

    requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(selectionEnd, selectionEnd)
    })
  }

  const rootClassName = [
    styles.editor,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={rootRef}
      className={rootClassName}
      data-fill={fill || undefined}
      onBlurCapture={finishEditing}
    >
      {renderPreview && !editing ? (
        <CharacterNotesPreview
          accessibleLabel={accessibleLabel}
          onTextScaleChange={changeTextScale}
          onRequestEdit={beginEditing}
          onStructuredResourceChange={onStructuredResourceChange}
          onValueChange={onValueChange}
          placeholder={placeholder}
          rows={rows}
          textScale={textScale}
          value={value}
        />
      ) : (
        <TextArea
          ref={textareaRef}
          aria-label={accessibleLabel}
          className={styles.textarea}
          formatting="markdown"
          placeholder={placeholder}
          rootClassName={styles.frame}
          rows={rows}
          showTextScaleControls={true}
          textScale={textScale}
          topToolbar={showStructureActions ? (
            <div
              className={styles.structureActions}
              onMouseDown={(event) => event.preventDefault()}
            >
              <Button
                size="sm"
                variant="secondary"
                onClick={() => insert('resource')}
              >
                Ресурс
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => insert('collapsible')}
              >
                Сворачиваемый блок
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => insert('divider')}
              >
                Разделитель
              </Button>
            </div>
          ) : undefined}
          value={value}
          onChange={(event) => {
            onValueChange(event.currentTarget.value)
          }}
          onFocus={() => setEditing(true)}
          onTextScaleChange={setTextScale}
        />
      )}
    </div>
  )
}
