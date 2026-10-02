import {
  FORMULA_FIELD_KEYS,
  characterSheetActions,
} from '../../model'
import { FormulaField } from '../fields'
import {
  CharacterIdentity,
  type CharacterIdentityValue,
} from '../identity'
import type { CharacterSheetViewModel } from './sheetViewModel'

export type CharacterIdentitySectionProps = {
  onPortraitFileSelect?: (
    file: File,
    characterId: string,
  ) => void
  onPortraitRemove?: (characterId: string) => void
  sheet: CharacterSheetViewModel
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
