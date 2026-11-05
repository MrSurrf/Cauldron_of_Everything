import { useId, useState } from 'react'

import { Button } from '../Button'
import { Checkbox } from '../Checkbox'
import { Combobox, type ComboboxOption } from '../Combobox'
import { IconButton } from '../IconButton'
import {
  AttunementIcon,
  EquippedIcon,
} from '../icons'
import { Popover } from '../Popover'
import { TextArea } from '../TextArea'
import { TextInput } from '../TextInput'
import { Tooltip } from '../Tooltip'
import type { ContentWidgetContextValue } from './ContentWidgetContext'
import type { ContentItemValue } from './itemContent'
import panelStyles from './ResourceWidget.module.css'
import styles from './ItemWidget.module.css'

const rarityOptions: readonly ComboboxOption[] = [
  'Обычный', 'Необычный', 'Редкий', 'Очень редкий',
  'Легендарный', 'Артефакт',
].map((label) => ({ label, value: label }))

const itemTypeOptions: readonly ComboboxOption[] = [
  'Оружие', 'Боеприпасы', 'Доспех', 'Щит', 'Зелье',
  'Свиток', 'Кольцо', 'Жезл', 'Посох', 'Волшебная палочка',
  'Чудесный предмет', 'Инструмент', 'Снаряжение',
  'Контейнер', 'Сокровище',
].map((label) => ({ label, value: label }))

const costOptions: readonly ComboboxOption[] = [
  'Бесплатно', '1 зм', '5 зм', '10 зм', '50 зм',
  '100 зм', '500 зм', '1 000 зм',
].map((label) => ({ label, value: label }))

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

type ItemWidgetProps = ContentWidgetContextValue & {
  value: ContentItemValue
  onChange: (value: ContentItemValue) => void
  onRemove: () => void
}

export function ItemWidget({
  value,
  onChange,
  onRemove,
  editorId,
  disabled = false,
  readOnly = false,
}: ItemWidgetProps) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const locked = disabled || readOnly
  const title = value.title.trim() || 'Предмет'
  const details = [value.itemType, value.rarity]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' · ')

  function update(patch: Partial<ContentItemValue>) {
    if (!locked) onChange({ ...value, ...patch })
  }

  function remove() {
    if (locked) return
    setOpen(false)
    onRemove()
  }

  return (
    <div
      className={styles.row}
      data-item-widget-row
      data-attuned={value.attuned || undefined}
      data-equipped={value.equipped || undefined}
      onClick={(event) => event.stopPropagation()}
    >
      <Popover
        modal
        aria-label={`Настройки предмета: ${title}`}
        className={panelStyles.popover}
        disabled={disabled}
        open={open}
        onOpenChange={setOpen}
        content={(
          <div
            className={panelStyles.panel}
            data-content-editor-owner={editorId}
            onClick={(event) => event.stopPropagation()}
          >
            <header className={panelStyles.header}>
              <div className={panelStyles.heading}>
                <h3 title={title}>{title}</h3>
                {details && <span className={styles.popupMeta}>{details}</span>}
              </div>
              <div className={panelStyles.currentDisplay}>
                <strong>{value.quantity || 0}</strong>
                <span>Количество</span>
              </div>
              <IconButton
                aria-label="Закрыть настройки предмета"
                className={panelStyles.close}
                decoration="bare"
                icon={<CloseIcon />}
                size="sm"
                onClick={() => setOpen(false)}
              />
            </header>

            <fieldset className={panelStyles.section}>
              <legend>Основное</legend>
              <div className={styles.mainGrid}>
                <div className={panelStyles.field}>
                  <label htmlFor={`${id}-name`}>Название предмета</label>
                  <TextInput
                    id={`${id}-name`}
                    className={panelStyles.input}
                    rootClassName={panelStyles.inputFrame}
                    placeholder="Название предмета"
                    value={value.title}
                    readOnly={locked}
                    onChange={(event) => update({ title: event.currentTarget.value })}
                  />
                </div>
                <div className={panelStyles.field}>
                  <label htmlFor={`${id}-quantity`}>Количество</label>
                  <TextInput
                    id={`${id}-quantity`}
                    className={panelStyles.input}
                    rootClassName={panelStyles.inputFrame}
                    inputMode="numeric"
                    placeholder="1"
                    value={value.quantity}
                    readOnly={locked}
                    onChange={(event) => {
                      const text = event.currentTarget.value
                      if (/^\d*$/.test(text) && Number.isSafeInteger(Number(text))) {
                        update({ quantity: text })
                      }
                    }}
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className={panelStyles.section}>
              <legend>Свойства</legend>
              <div className={styles.propertyGrid}>
                <Combobox
                  allowCustomValue
                  id={`${id}-type`}
                  label="Вид"
                  listboxLabel="Виды предметов"
                  options={itemTypeOptions}
                  placeholder="Выберите или впишите"
                  readOnly={locked}
                  value={value.itemType || null}
                  onValueChange={(itemType) => update({ itemType: itemType ?? '' })}
                />
                <Combobox
                  allowCustomValue
                  id={`${id}-rarity`}
                  label="Редкость"
                  listboxLabel="Редкость предмета"
                  options={rarityOptions}
                  placeholder="Выберите или впишите"
                  readOnly={locked}
                  value={value.rarity || null}
                  onValueChange={(rarity) => update({ rarity: rarity ?? '' })}
                />
                <Combobox
                  allowCustomValue
                  id={`${id}-cost`}
                  label="Стоимость"
                  listboxLabel="Варианты стоимости"
                  options={costOptions}
                  placeholder="Выберите или впишите"
                  readOnly={locked}
                  value={value.cost || null}
                  onValueChange={(cost) => update({ cost: cost ?? '' })}
                />
              </div>
            </fieldset>

            <div className={panelStyles.field}>
              <label htmlFor={`${id}-description`}>Описание предмета</label>
              <TextArea
                id={`${id}-description`}
                className={panelStyles.notesInput}
                rootClassName={panelStyles.inputFrame}
                rows={4}
                placeholder="Свойства, эффекты и заметки…"
                value={value.description}
                readOnly={locked}
                onChange={(event) => update({ description: event.currentTarget.value })}
              />
            </div>

            <footer className={`${panelStyles.footer} ${styles.footer}`}>
              <Button
                className={`${panelStyles.action} ${panelStyles.remove}`}
                variant="secondary"
                decoration="minimal"
                size="sm"
                disabled={locked}
                onClick={remove}
              >
                Удалить предмет
              </Button>
              <Button
                className={panelStyles.action}
                variant="secondary"
                decoration="minimal"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Готово
              </Button>
            </footer>
          </div>
        )}
      >
        <button
          type="button"
          className={styles.summary}
          data-item-widget
          aria-label={`Предмет: ${title}, количество ${value.quantity || 0}`}
          disabled={disabled}
          onClick={(event) => event.stopPropagation()}
        >
          <span className={styles.title}>{title}</span>
          {details && <span className={styles.meta} title={details}>{details}</span>}
          {value.cost && <span className={styles.cost}>{value.cost}</span>}
          <span className={styles.quantity}>× {value.quantity || 0}</span>
        </button>
      </Popover>

      <div className={styles.quickActions} aria-label="Состояние предмета">
        <Tooltip content="Настройка" openDelay={0}>
          <span className={styles.quickAction}>
            <Checkbox
              aria-label="Настройка"
              checked={value.attuned}
              disabled={locked}
              indicator={<AttunementIcon className={styles.quickIcon} />}
              rootClassName={styles.checkbox}
              onCheckedChange={(attuned) => update({ attuned })}
            />
          </span>
        </Tooltip>
        <Tooltip content="Надето" openDelay={0}>
          <span className={styles.quickAction}>
            <Checkbox
              aria-label="Надето"
              checked={value.equipped}
              disabled={locked}
              indicator={<EquippedIcon className={styles.quickIcon} />}
              rootClassName={styles.checkbox}
              onCheckedChange={(equipped) => update({ equipped })}
            />
          </span>
        </Tooltip>
      </div>
    </div>
  )
}
