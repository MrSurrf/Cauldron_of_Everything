import { TextInput } from '../../../../shared/ui'
import type { CSSProperties, ReactNode } from 'react'

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
  traits?: ReactNode
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
  { key: 'background', label: 'Предыстория' },
  { key: 'race', label: 'Раса' },
  { key: 'alignment', label: 'Мировоззрение' },
  { key: 'playerName', label: 'Имя игрока' },
]

const experienceThresholds = [
  0,
  300,
  900,
  2700,
  6500,
  14000,
  23000,
  34000,
  48000,
  64000,
  85000,
  100000,
  120000,
  140000,
  165000,
  195000,
  225000,
  265000,
  305000,
  355000,
] as const

function getExperienceProgress(
  experience: number | null,
  level: number | null,
) {
  const normalizedLevel = Math.min(
    20,
    Math.max(1, Math.trunc(level ?? 1)),
  )
  const minimum = experienceThresholds[normalizedLevel - 1]
  const maximum =
    experienceThresholds[normalizedLevel] ?? minimum
  const current = Math.min(
    maximum,
    Math.max(minimum, experience ?? minimum),
  )
  const progress =
    maximum === minimum
      ? 100
      : ((Math.min(current, maximum) - minimum) /
          (maximum - minimum)) *
        100

  return {
    current,
    maximum,
    minimum,
    progress,
  }
}

export function CharacterIdentity({
  onPortraitFileSelect,
  onPortraitRemove,
  onValueChange,
  renderNumericField,
  traits,
  value,
}: CharacterIdentityProps) {
  const experienceProgress = getExperienceProgress(
    value.experience,
    value.level,
  )

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
          </div>
        </div>

        <div className={styles.progressColumn}>
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

          <div className={styles.experienceCard}>
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
            <div
              aria-label={`Опыт до следующего уровня: ${experienceProgress.current} из ${experienceProgress.maximum}`}
              aria-valuemax={experienceProgress.maximum}
              aria-valuemin={experienceProgress.minimum}
              aria-valuenow={experienceProgress.current}
              className={styles.experienceProgress}
              role="progressbar"
              style={{
                '--identity-experience-progress':
                  `${experienceProgress.progress}%`,
              } as CSSProperties}
            />
          </div>
        </div>

        {traits && (
          <div
            className={styles.traitsCard}
            data-character-sheet-identity-traits={true}
          >
            <span className={styles.traitsLabel}>
              Черты характера
            </span>
            {traits}
          </div>
        )}
      </div>
    </SheetSection>
  )
}
