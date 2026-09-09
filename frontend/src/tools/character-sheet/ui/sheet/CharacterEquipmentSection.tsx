import { characterSheetActions } from '../../model'
import styles from '../../CharacterSheetTool.module.css'
import { SheetSection } from '../SheetSection'
import type { CharacterSheetViewModel } from './sheetViewModel'

export type CharacterEquipmentSectionProps = {
  sheet: CharacterSheetViewModel
}

export function CharacterEquipmentSection({
  sheet,
}: CharacterEquipmentSectionProps) {
  const {
    dispatch,
    document,
  } = sheet

  return (
    <SheetSection title="Снаряжение">
      <div className={styles.equipmentTextBlock}>
        <textarea
          aria-label="Снаряжение"
          className={styles.equipmentTextArea}
          placeholder="Перечислите снаряжение персонажа..."
          rows={10}
          value={document.equipmentContentText ?? ''}
          onChange={(event) => {
            dispatch(
              characterSheetActions.setEquipmentContentText(
                event.currentTarget.value,
              ),
            )
          }}
        />
      </div>
    </SheetSection>
  )
}
