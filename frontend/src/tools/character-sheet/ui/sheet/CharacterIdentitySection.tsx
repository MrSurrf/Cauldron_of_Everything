import {
  FORMULA_FIELD_KEYS,
  characterSheetActions,
  createClientId,
  type RepeatableTextEntry,
} from '../../model'
import { FormulaField } from '../fields'
import {
  CharacterIdentity,
  type CharacterIdentityValue,
} from '../identity'
import { CharacterNotesEditor } from '../notes'
import type { CharacterSheetViewModel } from './sheetViewModel'

export type CharacterIdentitySectionProps = {
  onPortraitFileSelect?: (
    file: File,
    characterId: string,
  ) => void
  onPortraitRemove?: (characterId: string) => void
  sheet: CharacterSheetViewModel
}

function compactedTraitsEntry(
  entries: readonly RepeatableTextEntry[],
) {
  return entries.find((entry) =>
    entry.id.startsWith('traits-notes-'),
  )
}

function traitsToText(
  entries: readonly RepeatableTextEntry[],
) {
  const compacted = compactedTraitsEntry(entries)

  if (compacted) return compacted.text

  return entries
    .map((entry) => {
      const title = entry.title.trim()

      if (!title) return entry.text
      if (!entry.text.trim()) return `### ${title}`

      return `### ${title}\n${entry.text}`
    })
    .filter(Boolean)
    .join('\n\n')
}

export function CharacterIdentitySection({
  onPortraitFileSelect,
  onPortraitRemove,
  sheet,
}: CharacterIdentitySectionProps) {
  const {
    dispatch,
    document,
    resultFor,
    updateNumericField,
    valueFor,
    variables,
  } = sheet
  const identityValue: CharacterIdentityValue = {
    alignment: document.identity.alignment,
    background: document.identity.background,
    characterClass: document.identity.className,
    experience: valueFor(FORMULA_FIELD_KEYS.experience),
    level: valueFor(FORMULA_FIELD_KEYS.level),
    name: document.identity.name,
    playerName: document.identity.playerName,
    portraitUrl: document.identity.portraitUrl,
    race: document.identity.race,
    subclass: document.identity.subclass,
  }
  const traitEntries = document.personality.traits

  function updateTraits(value: string) {
    const compacted = compactedTraitsEntry(traitEntries)

    if (!compacted) {
      dispatch({
        type: 'personality/add',
        section: 'traits',
        value: {
          id: createClientId('traits-notes'),
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
      section: 'traits',
    })
  }

  return (
    <CharacterIdentity
      key={document.id}
      value={identityValue}
      onPortraitFileSelect={(file) => {
        onPortraitFileSelect?.(file, document.id)
      }}
      onPortraitRemove={() => {
        onPortraitRemove?.(document.id)
      }}
      traits={(
        <CharacterNotesEditor
          accessibleLabel="Черты характера"
          fill={true}
          placeholder="Черты характера..."
          rows={3}
          showStructureActions={true}
          value={traitsToText(traitEntries)}
          onValueChange={updateTraits}
        />
      )}
      renderNumericField={(field, label) => {
        const key =
          field === 'level'
            ? FORMULA_FIELD_KEYS.level
            : FORMULA_FIELD_KEYS.experience

        return (
          <FormulaField
            label={label}
            presentation={
              field === 'level' ? 'stat' : 'list'
            }
            result={resultFor(key)}
            value={document.identity[field]}
            variables={variables}
            onValueChange={(value) => {
              updateNumericField(
                { kind: 'identity', field },
                value,
              )
            }}
          />
        )
      }}
      onValueChange={(value) => {
        dispatch(
          characterSheetActions.patchIdentity({
            alignment: value.alignment,
            background: value.background,
            className: value.characterClass,
            name: value.name,
            playerName: value.playerName,
            portraitUrl: value.portraitUrl,
            race: value.race,
            subclass: value.subclass,
          }),
        )
      }}
    />
  )
}
