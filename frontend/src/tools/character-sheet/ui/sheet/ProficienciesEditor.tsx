import {
  characterSheetActions,
  useCharacterSheet,
} from '../../model'
import type { CharacterProficiencies } from '../../model'
import { CharacterNotesEditor } from '../notes'
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
        <CharacterNotesEditor
          accessibleLabel="Языки и владения"
          className={styles.proficiencyContentEditor}
          fill={true}
          placeholder="Опишите известные языки и владения персонажа..."
          rows={11}
          showStructureActions={true}
          value={adaptContentToText(
            document.proficiencies,
          )}
          onValueChange={(value) => {
            dispatch(
              characterSheetActions.patchProficiencies({
                contentText: value,
              }),
            )
          }}
        />
      </div>
    </SheetSection>
  )
}
