import {
  createClientId,
  type PersonalitySectionKey,
  type RepeatableTextEntry,
} from '../../model'
import { CollapsibleSection } from '../CollapsibleSection'
import { CharacterNotesEditor } from '../notes'
import { personalityLabels } from './sheet.constants'
import type { CharacterSheetViewModel } from './sheetViewModel'

export type CharacterPersonalitySectionProps = {
  className?: string
  defaultOpen?: boolean
  editorClassName?: string
  rows?: number
  section: PersonalitySectionKey
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

export function CharacterPersonalitySection({
  className,
  defaultOpen = false,
  editorClassName,
  rows = 3,
  section,
  sheet,
}: CharacterPersonalitySectionProps) {
  const { dispatch, document } = sheet
  const entries = document.personality[section]
  const label = personalityLabels[section]

  function updateSection(value: string) {
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
    <CollapsibleSection
      className={className}
      data-character-sheet-personality={section}
      defaultOpen={defaultOpen}
      headingLevel={2}
      title={label}
    >
      <CharacterNotesEditor
        accessibleLabel={label}
        className={editorClassName}
        placeholder={`${label}...`}
        rows={rows}
        showStructureActions={true}
        value={entriesToText(entries, section)}
        onValueChange={updateSection}
      />
    </CollapsibleSection>
  )
}
