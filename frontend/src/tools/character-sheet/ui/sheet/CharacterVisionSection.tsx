import {
  VISION_TYPES,
  visionTypeLabels,
  type VisionSense,
  type VisionType,
} from '../../../../shared/model'
import {
  Combobox,
  IconButton,
  TextInput,
  Tooltip,
  TrashIcon,
  VisionIcon,
  type ComboboxOption,
} from '../../../../shared/ui'
import { characterSheetActions } from '../../model'
import sheetFieldStyles from '../fields/SheetFields.module.css'
import { PlusIcon } from '../icons'
import { SheetSection } from '../SheetSection'
import type { CharacterSheetViewModel } from './sheetViewModel'
import styles from './CharacterVisionSection.module.css'

export type CharacterVisionSectionProps = {
  sheet: CharacterSheetViewModel
}

const visionOptions: readonly ComboboxOption[] = VISION_TYPES.map((type) => ({
  icon: <VisionIcon type={type} />,
  label: visionTypeLabels[type],
  value: type,
}))

function parseRange(value: string) {
  if (value.trim() === '') return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : undefined
}

function isVisionType(value: string | null): value is VisionType {
  return VISION_TYPES.some((type) => type === value)
}

function replaceAt(
  senses: readonly VisionSense[],
  index: number,
  next: VisionSense,
) {
  return senses.map((sense, senseIndex) => senseIndex === index ? next : sense)
}

export function CharacterVisionSection({ sheet }: CharacterVisionSectionProps) {
  const senses = sheet.document.vision ?? []
  const usedTypes = new Set(senses.map((sense) => sense.type))
  const nextType = VISION_TYPES.find((type) => !usedTypes.has(type))

  return (
    <SheetSection
      title="Зрение и чувства"
      actions={(
        <Tooltip content={nextType ? 'Добавить вид зрения' : 'Все виды уже добавлены'}>
          <IconButton
            aria-label="Добавить вид зрения"
            disabled={!nextType}
            icon={<PlusIcon />}
            size="sm"
            variant="secondary"
            onClick={() => {
              if (!nextType) return
              sheet.dispatch(characterSheetActions.setVision([
                ...senses,
                { type: nextType },
              ]))
            }}
          />
        </Tooltip>
      )}
    >
      {senses.length > 0 ? (
        <div className={styles.list}>
          {senses.map((sense, index) => (
            <div className={styles.row} key={`${sense.type}-${index}`}>
              <VisionIcon className={styles.visionIcon} type={sense.type} />
              <Combobox
                aria-label={`Вид зрения ${index + 1}`}
                className={styles.comboboxInput}
                fieldClassName={sheetFieldStyles.compactField}
                options={visionOptions.map((option) => ({
                  ...option,
                  disabled: option.value !== sense.type && usedTypes.has(option.value as VisionType),
                }))}
                rootClassName={sheetFieldStyles.compactFrame}
                value={sense.type}
                onValueChange={(value) => {
                  if (!isVisionType(value)) return
                  sheet.dispatch(characterSheetActions.setVision(
                    replaceAt(senses, index, { ...sense, type: value }),
                  ))
                }}
              />
              <TextInput
                aria-label={`Дальность: ${visionTypeLabels[sense.type]}, футы`}
                className={styles.rangeInput}
                fieldClassName={sheetFieldStyles.compactField}
                inputMode="numeric"
                min={0}
                placeholder="0"
                rootClassName={sheetFieldStyles.compactFrame}
                value={sense.range ?? ''}
                onInput={(event) => {
                  const range = parseRange(event.currentTarget.value)
                  sheet.dispatch(characterSheetActions.setVision(
                    replaceAt(senses, index, {
                      type: sense.type,
                      ...(range === undefined ? {} : { range }),
                    }),
                  ))
                }}
              />
              <Tooltip content="Удалить вид зрения">
                <IconButton
                  aria-label={`Удалить ${visionTypeLabels[sense.type]}`}
                  icon={<TrashIcon />}
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    sheet.dispatch(characterSheetActions.setVision(
                      senses.filter((_, senseIndex) => senseIndex !== index),
                    ))
                  }}
                />
              </Tooltip>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>Виды зрения не добавлены.</p>
      )}
    </SheetSection>
  )
}
