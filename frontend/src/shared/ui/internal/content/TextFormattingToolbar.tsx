import type { MouseEvent } from 'react'

import { IconButton } from '../../IconButton'
import { Tooltip } from '../../Tooltip'
import styles from './TextFormattingToolbar.module.css'

export type TextFormatAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'ordered-list'
  | 'unordered-list'
  | 'check-list'
  | 'link'
  | 'roll'

export type TextFormattingToolbarProps = {
  buttonClassName?: string
  className?: string
  disabled?: boolean
  onAction: (action: TextFormatAction) => void
}

type FormatCommand = {
  action: TextFormatAction
  label: string
}

const commands: FormatCommand[] = [
  { action: 'bold', label: 'Полужирный' },
  { action: 'italic', label: 'Курсив' },
  { action: 'underline', label: 'Подчёркнутый' },
  { action: 'ordered-list', label: 'Нумерованный список' },
  { action: 'unordered-list', label: 'Маркированный список' },
  { action: 'check-list', label: 'Список задач' },
  { action: 'link', label: 'Ссылка' },
  { action: 'roll', label: 'Бросок кубика' },
]

function FormatIcon({ action }: { action: TextFormatAction }) {
  if (
    action === 'bold' ||
    action === 'italic' ||
    action === 'underline'
  ) {
    const character =
      action === 'bold'
        ? 'B'
        : action === 'italic'
          ? 'I'
          : 'U'

    return (
      <span className={styles.letterIcon} data-format={action}>
        {character}
      </span>
    )
  }

  if (
    action === 'ordered-list' ||
    action === 'unordered-list' ||
    action === 'check-list'
  ) {
    const ordered = action === 'ordered-list'
    const checked = action === 'check-list'

    return (
      <svg viewBox="0 0 20 20" fill="none">
        {[5, 10, 15].map((y, index) => (
          <g key={y}>
            {ordered ? (
              <text
                x="1"
                y={y + 2}
                fill="currentColor"
                stroke="none"
                fontSize="5"
              >
                {index + 1}
              </text>
            ) : checked ? (
              <path
                d={`M1.5 ${y - 1.5}h3v3h-3z`}
                stroke="currentColor"
              />
            ) : (
              <circle cx="3" cy={y} r="1" fill="currentColor" />
            )}
            <path
              d={`M7 ${y}h11`}
              stroke="currentColor"
              strokeLinecap="round"
            />
          </g>
        ))}
      </svg>
    )
  }

  if (action === 'link') {
    return (
      <svg viewBox="0 0 20 20" fill="none">
        <path
          d="M8.2 12.8 6.7 14.3a3 3 0 0 1-4.2-4.2l2.4-2.4a3 3 0 0 1 4.2 0M11.8 7.2l1.5-1.5a3 3 0 1 1 4.2 4.2l-2.4 2.4a3 3 0 0 1-4.2 0M7.2 10h5.6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path
        d="m10 1.8 7.3 4.1v8.2L10 18.2l-7.3-4.1V5.9z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.25"
      />
      <circle cx="7" cy="7" r="1" fill="currentColor" />
      <circle cx="13" cy="7" r="1" fill="currentColor" />
      <circle cx="10" cy="12.5" r="1" fill="currentColor" />
    </svg>
  )
}

export function TextFormattingToolbar({
  buttonClassName,
  className,
  disabled = false,
  onAction,
}: TextFormattingToolbarProps) {
  function preserveSelection(event: MouseEvent<HTMLDivElement>) {
    event.preventDefault()
  }

  return (
    <div
      className={className}
      data-content-editor-toolbar="format"
      role="toolbar"
      aria-label="Форматирование выделенного текста"
      onMouseDown={preserveSelection}
    >
      {commands.map(({ action, label }) => (
        <Tooltip key={action} content={label} openDelay={250}>
          <IconButton
            aria-label={label}
            className={buttonClassName}
            decoration="bare"
            disabled={disabled}
            icon={<FormatIcon action={action} />}
            onClick={() => onAction(action)}
            size="sm"
            variant="secondary"
          />
        </Tooltip>
      ))}
    </div>
  )
}
