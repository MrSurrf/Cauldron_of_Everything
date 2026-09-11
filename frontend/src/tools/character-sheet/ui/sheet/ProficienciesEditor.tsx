import {
  characterSheetActions,
} from '../../model'
import type { CharacterProficiencies } from '../../model'
import { ContentEditor } from '../../../../shared/ui'
import { SheetSection } from '../SheetSection'
import { useCharacterSheetViewModel } from './sheetViewModel'
import { createResourceMaximumEvaluator } from './resourceMaximumEvaluator'

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
  const sheet = useCharacterSheetViewModel()
  const { dispatch, document } = sheet

  return (
    <SheetSection
      contentLayout="editor"
      title="Языки и владения"
    >
      <ContentEditor
        evaluateResourceMaximum={createResourceMaximumEvaluator(sheet)}
        accessibleLabel="Языки и владения"
        fill={true}
        renderPreview={true}
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
    </SheetSection>
  )
}
