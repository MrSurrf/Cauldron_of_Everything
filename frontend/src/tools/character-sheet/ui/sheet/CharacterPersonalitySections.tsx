import {
  createClientId,
  type PersonalitySectionKey,
  type RepeatableTextEntry,
} from '../../model'
import { CharacterNotesEditor } from '../notes'
import { SheetSection } from '../SheetSection'
import styles from '../../CharacterSheetTool.module.css'
import { personalityLabels } from './sheet.constants'
import type { CharacterSheetViewModel } from './sheetViewModel'

export type CharacterPersonalitySectionsProps = {
  sheet: CharacterSheetViewModel
}

function compactedEntry(
  entries: readonly RepeatableTextEntry[],
  section: PersonalitySectionKey,
) {
  return entries.find((entry) =>
    entry.id.startsWith(`${section}-notes-`),
  )
}

function entriesToText(
  entries: readonly RepeatableTextEntry[],
  section: PersonalitySectionKey,
) {
  const compacted = compactedEntry(entries, section)

  if (compacted) return compacted.text

  return entries
    .map((entry) => {
      const title = entry.title.trim()
      const text = entry.text

      if (!title) return text
      if (!text.trim()) return `### ${title}`

      return `### ${title}\n${text}`
    })
    .filter(Boolean)
    .join('\n\n')
}

export function CharacterPersonalitySections({
  sheet,
}: CharacterPersonalitySectionsProps) {
  const { dispatch, document } = sheet

  function updateSection(
    section: PersonalitySectionKey,
    value: string,
  ) {
    const entries = document.personality[section]
    const compacted = compactedEntry(entries, section)

    if (!compacted) {
      dispatch({
        type: 'personality/add',
        section,
        value: {
          id: createClientId(`${section}-notes`),
          text: value,
          title: '',
        },
      })
      return
    }

    dispatch({
      type: 'personality/update',
      id: compacted.id,
      patch: { text: value },
      section,
    })
  }

  return (
    <div
      aria-label="Характер и заметки"
      className={styles.personalityGrid}
      role="group"
    >
      {(Object.keys(personalityLabels) as PersonalitySectionKey[])
        .map((section) => {
          const label = personalityLabels[section]

          return (
            <SheetSection key={section} title={label}>
              <CharacterNotesEditor
                accessibleLabel={label}
                placeholder={`${label}...`}
                rows={3}
                showStructureActions={true}
                value={entriesToText(
                  document.personality[section],
                  section,
                )}
                onValueChange={(value) => {
                  updateSection(section, value)
                }}
              />
            </SheetSection>
          )
        })}
    </div>
  )
}
