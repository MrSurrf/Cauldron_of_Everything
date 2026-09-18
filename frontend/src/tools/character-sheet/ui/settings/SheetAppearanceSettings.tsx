import {
  Combobox,
  SegmentedControl,
} from '../../../../shared/ui'
import sheetFieldStyles from '../fields/SheetFields.module.css'
import styles from './SheetAppearanceSettings.module.css'

export type SheetAppearanceValue = {
  bodySize: 'small' | 'medium' | 'large'
  density: 'compact' | 'comfortable' | 'spacious'
  fontFamily: 'body' | 'heading' | 'system'
  headingSize: 'small' | 'medium' | 'large'
}

export type SheetAppearanceSettingsProps = {
  onValueChange: (value: SheetAppearanceValue) => void
  value: SheetAppearanceValue
}

const fontOptions = [
  { value: 'body', label: 'Gilroy' },
  { value: 'heading', label: 'Greengoth Regular' },
  { value: 'system', label: 'Системный' },
]

const sizeOptions = [
  { value: 'small', label: 'Мелкий' },
  { value: 'medium', label: 'Средний' },
  { value: 'large', label: 'Крупный' },
]

const densityOptions = [
  { value: 'compact', label: 'Плотно' },
  { value: 'comfortable', label: 'Обычно' },
  { value: 'spacious', label: 'Свободно' },
]

export function SheetAppearanceSettings({
  onValueChange,
  value,
}: SheetAppearanceSettingsProps) {
  return (
    <div className={styles.settings}>
      <Combobox
        fieldClassName={sheetFieldStyles.compactField}
        label="Шрифт листа"
        options={fontOptions}
        rootClassName={sheetFieldStyles.compactFrame}
        value={value.fontFamily}
        onValueChange={(fontFamily) => {
          if (
            fontFamily === 'body' ||
            fontFamily === 'heading' ||
            fontFamily === 'system'
          ) {
            onValueChange({ ...value, fontFamily })
          }
        }}
      />

      <div className={styles.optionGroup}>
        <span>Основной текст</span>
        <SegmentedControl
          aria-label="Размер основного текста"
          options={sizeOptions}
          value={value.bodySize}
          onValueChange={(bodySize) => {
            if (
              bodySize === 'small' ||
              bodySize === 'medium' ||
              bodySize === 'large'
            ) {
              onValueChange({ ...value, bodySize })
            }
          }}
        />
      </div>

      <div className={styles.optionGroup}>
        <span>Заголовки</span>
        <SegmentedControl
          aria-label="Размер заголовков"
          options={sizeOptions}
          value={value.headingSize}
          onValueChange={(headingSize) => {
            if (
              headingSize === 'small' ||
              headingSize === 'medium' ||
              headingSize === 'large'
            ) {
              onValueChange({ ...value, headingSize })
            }
          }}
        />
      </div>

      <div className={styles.optionGroup}>
        <span>Плотность</span>
        <SegmentedControl
          aria-label="Плотность интерфейса"
          options={densityOptions}
          value={value.density}
          onValueChange={(density) => {
            if (
              density === 'compact' ||
              density === 'comfortable' ||
              density === 'spacious'
            ) {
              onValueChange({ ...value, density })
            }
          }}
        />
      </div>
    </div>
  )
}
