import { TextInput } from '../../../../shared/ui'
import type { ReactNode } from 'react'

import sheetFieldStyles from '../fields/SheetFields.module.css'
import { NumericEditor } from '../fields'
import { SheetSection } from '../SheetSection'
import styles from './CharacterIdentity.module.css'
import { CharacterPortrait } from './CharacterPortrait'

export type CharacterIdentityValue = {
  alignment: string
  background: string
  characterClass: string
  experience: number | null
  level: number | null
  name: string
  playerName: string
  portraitUrl: string | null
  race: string
  subclass: string
}

export type CharacterIdentityProps = {
  onPortraitFileSelect?: (file: File) => void
  onPortraitRemove?: () => void
  onValueChange: (value: CharacterIdentityValue) => void
  renderNumericField?: (
    field: 'experience' | 'level',
    label: string,
  ) => ReactNode
  value: CharacterIdentityValue
}

type TextIdentityKey = Exclude<
  keyof CharacterIdentityValue,
  'experience' | 'level' | 'portraitUrl'
>

const detailFields: ReadonlyArray<{
  key: Exclude<TextIdentityKey, 'name'>
  label: string
}> = [
  { key: 'characterClass', label: 'Класс' },
  { key: 'subclass', label: 'Подкласс' },
  { key: 'background', label: 'Происхождение' },
  { key: 'playerName', label: 'Имя игрока' },
  { key: 'race', label: 'Раса' },
  { key: 'alignment', label: 'Мировоззрение' },
]

export function CharacterIdentity({
  onPortraitFileSelect,
  onPortraitRemove,
  onValueChange,
  renderNumericField,
  value,
}: CharacterIdentityProps) {
  return (
    <SheetSection
      aria-label="Основные сведения о персонаже"
      className={styles.section}
    >
      <div className={styles.layout}>
        <div className={styles.portrait}>
          <CharacterPortrait
            characterName={value.name}
            portraitUrl={value.portraitUrl}
            onFileSelect={onPortraitFileSelect}
            onRemove={() => {
              onValueChange({
                ...value,
                portraitUrl: null,
              })
              onPortraitRemove?.()
            }}
          />
        </div>

        <div className={styles.identityBody}>
          <TextInput
            className={styles.nameInput}
            fieldClassName={styles.nameField}
            label="Имя персонажа"
            placeholder="Имя персонажа"
            rootClassName={styles.nameFrame}
            value={value.name}
            onChange={(event) => {
              onValueChange({
                ...value,
                name: event.currentTarget.value,
              })
            }}
          />

          <div className={styles.details}>
            {detailFields.map((field) => (
              <TextInput
                key={field.key}
                fieldClassName={`${sheetFieldStyles.compactField} ${styles.detailField}`}
                label={field.label}
                rootClassName={`${sheetFieldStyles.compactFrame} ${styles.detailFrame}`}
                value={value[field.key]}
                onChange={(event) => {
                  onValueChange({
                    ...value,
                    [field.key]: event.currentTarget.value,
                  })
                }}
              />
            ))}

            <div className={styles.experienceField}>
              {renderNumericField ? (
                renderNumericField('experience', 'Опыт')
              ) : (
                <>
                  <span className={styles.numericLabel}>Опыт</span>
                  <NumericEditor
                    aria-label="Опыт"
                    min={0}
                    value={value.experience}
                    onValueChange={(experience) => {
                      onValueChange({ ...value, experience })
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        <div className={styles.levelCard}>
          {renderNumericField ? (
            renderNumericField('level', 'Уровень')
          ) : (
            <>
              <span className={styles.numericLabel}>Уровень</span>
              <NumericEditor
                aria-label="Уровень"
                min={1}
                max={20}
                value={value.level}
                onValueChange={(level) => {
                  onValueChange({ ...value, level })
                }}
              />
            </>
          )}
        </div>
      </div>
    </SheetSection>
  )
}
