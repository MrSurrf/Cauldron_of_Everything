import { Combobox, type ComboboxOption } from '../../../shared/ui'

const CHARACTER_CLASS_NAMES = [
  'Бард',
  'Варвар',
  'Воин',
  'Волшебник',
  'Друид',
  'Жрец',
  'Изобретатель',
  'Колдун',
  'Монах',
  'Паладин',
  'Плут',
  'Следопыт',
  'Чародей',
] as const

const SPELLCASTER_CLASS_NAMES = [
  'Бард',
  'Волшебник',
  'Друид',
  'Жрец',
  'Изобретатель',
  'Колдун',
  'Паладин',
  'Следопыт',
  'Чародей',
] as const

const toOptions = (names: readonly string[]): readonly ComboboxOption[] =>
  names.map((name) => ({ label: name, value: name }))

const CHARACTER_CLASS_OPTIONS = toOptions(CHARACTER_CLASS_NAMES)
const SPELLCASTER_CLASS_OPTIONS = toOptions(SPELLCASTER_CLASS_NAMES)

export type ClassNameFieldProps = {
  'aria-label'?: string
  className?: string
  fieldClassName?: string
  label?: string
  onValueChange: (value: string) => void
  placeholder?: string
  rootClassName?: string
  spellcasterOnly?: boolean
  value: string
}

/** Единый выбор класса: варианты ускоряют ввод, но домашний класс можно написать вручную. */
export function ClassNameField({
  'aria-label': ariaLabel,
  className,
  fieldClassName,
  label,
  onValueChange,
  placeholder = 'Выберите или введите класс',
  rootClassName,
  spellcasterOnly = false,
  value,
}: ClassNameFieldProps) {
  return <Combobox
    allowCustomValue
    aria-label={ariaLabel}
    autoComplete="off"
    className={className}
    fieldClassName={fieldClassName}
    label={label}
    listboxLabel={spellcasterOnly ? 'Классы заклинателей' : 'Классы персонажей'}
    options={spellcasterOnly ? SPELLCASTER_CLASS_OPTIONS : CHARACTER_CLASS_OPTIONS}
    placeholder={placeholder}
    rootClassName={rootClassName}
    value={value || null}
    onValueChange={(nextValue) => onValueChange(nextValue ?? '')}
  />
}
