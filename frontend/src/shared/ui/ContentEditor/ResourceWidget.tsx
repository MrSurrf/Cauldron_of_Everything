import { useId, useState } from 'react'

import { Button } from '../Button'
import { Checkbox } from '../Checkbox'
import { IconButton } from '../IconButton'
import { PlaceholderIcon } from '../icons/PlaceholderIcon'
import { Popover } from '../Popover'
import { TextArea } from '../TextArea'
import { TextInput } from '../TextInput'
import { Tooltip } from '../Tooltip'
import styles from './ResourceWidget.module.css'

export type ContentResourceValue = {
  title: string
  current: number | null
  maximum: string
  recovery: 'none' | 'short' | 'long' | 'either'
  notes: string
  showNotes: boolean
}

export type ResourceFormulaResult = {
  value: number | null
  error?: string
}

export type ResourceWidgetProps = {
  value: ContentResourceValue
  onChange: (value: ContentResourceValue) => void
  onRemove: () => void
  evaluateMaximum?: (expression: string) => ResourceFormulaResult
  disabled?: boolean
  readOnly?: boolean
  editorId?: string
}

function resolveMaximum(
  expression: string,
  evaluate?: ResourceWidgetProps['evaluateMaximum'],
): ResourceFormulaResult {
  const source = expression.trim()
  if (!source) return { value: null }

  try {
    const result = evaluate
      ? evaluate(source)
      : /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(source)
        ? { value: Number(source.replace(',', '.')) }
        : { value: null, error: 'Формулы недоступны в этом редакторе.' }

    if (result.error) return { value: null, error: result.error }
    if (result.value === null || !Number.isFinite(result.value)) {
      return { value: null, error: 'Не удалось вычислить максимум.' }
    }
    if (result.value < 0) {
      return { value: null, error: 'Максимум не может быть отрицательным.' }
    }
    return result
  } catch {
    return { value: null, error: 'Не удалось вычислить максимум.' }
  }
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20.3 14.5A8.6 8.6 0 0 1 9.5 3.7a8.7 8.7 0 1 0 10.8 10.8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function NotesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 10.5v6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function ResourceWidget({
  value,
  onChange,
  onRemove,
  evaluateMaximum,
  disabled = false,
  readOnly = false,
  editorId,
}: ResourceWidgetProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const maximum = resolveMaximum(value.maximum, evaluateMaximum)
  const shortRest = value.recovery === 'short' || value.recovery === 'either'
  const longRest = value.recovery === 'long' || value.recovery === 'either'
  const locked = disabled || readOnly
  const title = value.title.trim() || 'Ресурс'
  const recoveryLabel = value.recovery === 'either'
    ? 'Короткий или долгий отдых'
    : shortRest ? 'Короткий отдых' : 'Долгий отдых'

  function update(patch: Partial<ContentResourceValue>) {
    if (!locked) onChange({ ...value, ...patch })
  }

  function updateRecovery(short: boolean, long: boolean) {
    update({ recovery: short && long ? 'either' : short ? 'short' : long ? 'long' : 'none' })
  }

  return (
    <Popover
      modal
      aria-label={`Настройки ресурса: ${title}`}
      className={styles.popover}
      disabled={disabled}
      open={open}
      onOpenChange={setOpen}
      placement="bottom"
      content={(
        <div
          className={styles.panel}
          data-content-editor-owner={editorId}
          onClick={(event) => event.stopPropagation()}
        >
          <header className={styles.header}>
            <div className={styles.heading}>
              <h3 title={title}>{title}</h3>
              <Button
                className={styles.action}
                variant="secondary"
                decoration="minimal"
                size="sm"
                disabled={locked || maximum.value === null || Boolean(maximum.error)}
                onClick={() => update({ current: maximum.value })}
              >
                Восстановить
              </Button>
            </div>
            <div className={styles.currentDisplay}>
              <strong>{value.current ?? 0}</strong>
              <span>Текущее</span>
            </div>
            <IconButton
              aria-label="Закрыть настройки ресурса"
              className={styles.close}
              decoration="bare"
              icon={<CloseIcon />}
              size="sm"
              onClick={() => setOpen(false)}
            />
          </header>

          <div className={styles.field}>
            <label htmlFor={`${id}-title`}>Название</label>
            <TextInput
              id={`${id}-title`}
              className={styles.input}
              rootClassName={styles.inputFrame}
              placeholder=""
              value={value.title}
              readOnly={locked}
              onChange={(event) => update({ title: event.currentTarget.value })}
            />
          </div>

          <fieldset className={styles.section}>
            <legend>Значения</legend>
            <div className={styles.values}>
              <div className={styles.field}>
                <label htmlFor={`${id}-current`}>Текущее</label>
                <TextInput
                  id={`${id}-current`}
                  className={styles.input}
                  rootClassName={styles.inputFrame}
                  inputMode="numeric"
                  placeholder="0"
                  value={value.current ?? ''}
                  readOnly={locked}
                  onChange={(event) => {
                    const text = event.currentTarget.value
                    if (!/^\d*$/.test(text)) return
                    const next = text === '' ? null : Number(text)
                    if (next === null || Number.isSafeInteger(next)) update({ current: next })
                  }}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor={`${id}-maximum`}>Максимум</label>
                <TextInput
                  id={`${id}-maximum`}
                  className={styles.input}
                  rootClassName={styles.inputFrame}
                  placeholder="10 или [PROF]*2"
                  value={value.maximum}
                  error={maximum.error}
                  readOnly={locked}
                  onChange={(event) => update({ maximum: event.currentTarget.value })}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={styles.section}>
            <legend>Восстановление</legend>
            <Checkbox
              checked={shortRest}
              disabled={locked}
              label={<span className={styles.restLabel}><PlaceholderIcon />Короткий отдых</span>}
              onCheckedChange={(checked) => updateRecovery(checked, longRest)}
            />
            <Checkbox
              checked={longRest}
              disabled={locked}
              label={<span className={styles.restLabel}><MoonIcon />Долгий отдых</span>}
              onCheckedChange={(checked) => updateRecovery(shortRest, checked)}
            />
          </fieldset>

          <div className={styles.field}>
            <label htmlFor={`${id}-notes`}>Заметки</label>
            <TextArea
              id={`${id}-notes`}
              className={styles.notesInput}
              rootClassName={styles.inputFrame}
              rows={3}
              placeholder=""
              value={value.notes}
              readOnly={locked}
              onChange={(event) => update({ notes: event.currentTarget.value })}
            />
            <Checkbox
              checked={value.showNotes}
              disabled={locked}
              label="Отображать заметки"
              onCheckedChange={(showNotes) => update({ showNotes })}
            />
          </div>

          <footer className={styles.footer}>
            <Button
              className={`${styles.action} ${styles.remove}`}
              variant="secondary"
              decoration="minimal"
              size="sm"
              disabled={locked}
              onClick={() => {
                if (locked) return
                setOpen(false)
                onRemove()
              }}
            >
              Удалить ресурс
            </Button>
          </footer>
        </div>
      )}
    >
      <button
        type="button"
        className={styles.row}
        data-resource-widget="true"
        data-empty={!value.title && value.current === null && !value.maximum || undefined}
        aria-label={`${title}: ${value.current ?? 'не задано'} / ${maximum.value ?? 'не задано'}`}
        disabled={disabled}
        onClick={(event) => event.stopPropagation()}
      >
        <span className={styles.title}>{value.title}</span>
        {value.showNotes && value.notes.trim() && (
          <Tooltip content={value.notes} className={styles.notesTooltip}>
            <span className={styles.icon} aria-label="Заметки ресурса">
              <NotesIcon />
            </span>
          </Tooltip>
        )}
        <span className={styles.counter} data-invalid={Boolean(maximum.error) || undefined}>
          <span>{value.current}</span>
          <span className={styles.slash}>/</span>
          <span>{maximum.error ? '?' : maximum.value}</span>
        </span>
        {value.recovery !== 'none' && (
          <Tooltip content={recoveryLabel}>
            <span className={styles.recovery} aria-label={recoveryLabel}>
              {shortRest && <PlaceholderIcon />}
              {longRest && <MoonIcon />}
            </span>
          </Tooltip>
        )}
      </button>
    </Popover>
  )
}
