import {
  useRef,
  useState,
  type FocusEvent,
} from 'react'

import { ContentEditor } from '../../../../shared/ui'
import { CharacterNotesPreview } from './CharacterNotesPreview'
import styles from './CharacterNotesEditor.module.css'

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

const MIN_TEXT_SCALE = 0.75
const MAX_TEXT_SCALE = 1.5
const TEXT_SCALE_STEP = 0.125

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
  const [editing, setEditing] = useState(!renderPreview)
  const [textScale, setTextScale] = useState(1)

  function beginEditing() {
    setEditing(true)
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

  function finishEditing(event: FocusEvent<HTMLDivElement>) {
    if (!renderPreview) return

    const nextTarget = event.relatedTarget

    if (
      nextTarget instanceof Node &&
      rootRef.current?.contains(nextTarget)
    ) {
      return
    }

    setEditing(false)
  }

  const rootClassName = [styles.editor, className]
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
        <ContentEditor
          accessibleLabel={accessibleLabel}
          autoFocus={renderPreview}
          fill={fill}
          placeholder={placeholder}
          rows={rows}
          showStructureActions={showStructureActions}
          textScale={textScale}
          value={value}
          onTextScaleChange={setTextScale}
          onValueChange={onValueChange}
        />
      )}
    </div>
  )
}
