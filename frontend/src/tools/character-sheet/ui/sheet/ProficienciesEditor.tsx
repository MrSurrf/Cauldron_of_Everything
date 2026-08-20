import { TextArea } from '../../../../shared/ui'
import {
  characterSheetActions,
  useCharacterSheet,
} from '../../model'
import { SheetSection } from '../SheetSection'
import styles from '../../CharacterSheetTool.module.css'

function serializeEntries(entries: readonly string[]) {
  return entries.join(', ')
}

function parseEntries(value: string) {
  return value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function ProficienciesEditor() {
  const { dispatch, document } = useCharacterSheet()
  const sections = [
    { key: 'languages', title: 'Языки' },
    { key: 'armor', title: 'Доспехи' },
    { key: 'weapons', title: 'Оружие' },
    { key: 'tools', title: 'Инструменты' },
  ] as const

  return (
    <SheetSection
      className={styles.proficiencySection}
      title="Языки и владения"
    >
      <div className={styles.proficiencyLists}>
        {sections.map((section) => (
          <TextArea
            key={section.key}
            className={styles.compactProficiencyArea}
            label={section.title}
            rootClassName={styles.compactProficiencyFrame}
            rows={1}
            value={serializeEntries(
              document.proficiencies[section.key],
            )}
            onChange={(event) => {
              dispatch(
                characterSheetActions.patchProficiencies({
                  [section.key]: parseEntries(
                    event.currentTarget.value,
                  ),
                }),
              )
            }}
          />
        ))}

        <TextArea
          className={styles.compactProficiencyArea}
          label="Прочие владения"
          rootClassName={styles.compactProficiencyFrame}
          rows={3}
          value={document.proficiencies.notes}
          onChange={(event) => {
            dispatch(
              characterSheetActions.patchProficiencies({
                notes: event.currentTarget.value,
              }),
            )
          }}
        />
      </div>
    </SheetSection>
  )
}
