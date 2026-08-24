import { TextArea } from '../../../../shared/ui'
import {
  characterSheetActions,
  useCharacterSheet,
} from '../../model'
import type { CharacterProficiencies } from '../../model'
import { SheetSection } from '../SheetSection'
import styles from '../../CharacterSheetTool.module.css'

const legacyProficiencyGroups = [
  { key: 'armor', title: 'Доспехи' },
  { key: 'weapons', title: 'Оружие' },
  { key: 'tools', title: 'Инструменты' },
] as const

function adaptLanguagesToText(
  proficiencies: CharacterProficiencies,
) {
  return proficiencies.languagesText ??
    proficiencies.languages.join('\n')
}

function adaptProficienciesToText(
  proficiencies: CharacterProficiencies,
) {
  if (proficiencies.proficienciesText != null) {
    return proficiencies.proficienciesText
  }

  const structuredText = legacyProficiencyGroups
    .filter(({ key }) => proficiencies[key].length > 0)
    .map(({ key, title }) =>
      `${title}: ${proficiencies[key].join(', ')}`,
    )
    .join('\n')

  if (!structuredText) return proficiencies.notes
  if (!proficiencies.notes) return structuredText

  return `${structuredText}\n\n${proficiencies.notes}`
}

function adaptContentToText(
  proficiencies: CharacterProficiencies,
) {
  if (proficiencies.contentText != null) {
    return proficiencies.contentText
  }

  const languages = adaptLanguagesToText(proficiencies)
  const otherProficiencies =
    adaptProficienciesToText(proficiencies)
  const sections = [
    languages ? `Языки:\n${languages}` : '',
    otherProficiencies
      ? `Владения:\n${otherProficiencies}`
      : '',
  ].filter(Boolean)

  return sections.join('\n\n')
}

export function ProficienciesEditor() {
  const { dispatch, document } = useCharacterSheet()

  return (
    <SheetSection
      className={styles.proficiencySection}
      title="Языки и владения"
    >
      <div className={styles.proficiencyTextBlock}>
        <TextArea
          aria-label="Языки и владения"
          className={styles.proficiencyTextArea}
          fieldClassName={styles.proficiencyTextField}
          placeholder="Опишите известные языки и владения персонажа..."
          rootClassName={styles.proficiencyTextFrame}
          rows={11}
          value={adaptContentToText(
            document.proficiencies,
          )}
          onChange={(event) => {
            dispatch(
              characterSheetActions.patchProficiencies({
                contentText: event.currentTarget.value,
              }),
            )
          }}
        />
      </div>
    </SheetSection>
  )
}
