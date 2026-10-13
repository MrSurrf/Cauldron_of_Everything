import { characterSheetActions } from '../../model'
import { ContentEditor } from '../../../../shared/ui'
import { createResourceMaximumEvaluator } from './resourceMaximumEvaluator'
import { SheetSection } from '../SheetSection'
import type { CharacterSheetViewModel } from './sheetViewModel'
import styles from './CharacterEquipmentSection.module.css'

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
    <SheetSection className={document.equipmentItems?.length ? styles.withItems : undefined} contentLayout="editor" title="Снаряжение">
      {(document.equipmentItems?.length ?? 0) > 0 && <ul className={styles.items} data-character-sheet-inventory="">
        {document.equipmentItems?.map(item => <li className={styles.item} key={item.id}>
          <span className={styles.itemName} title={item.description || item.name}>{item.name}</span>
          {item.quantity > 1 && <span className={styles.quantity}>×{item.quantity}</span>}
          <button type="button" className={styles.remove} aria-label={`Убрать ${item.name} из снаряжения`}
            onClick={() => dispatch(characterSheetActions.removeEquipmentItem(item.id))}>×</button>
        </li>)}
      </ul>}
      <ContentEditor
          evaluateResourceMaximum={createResourceMaximumEvaluator(sheet)}
          accessibleLabel="Снаряжение"
          fill={true}
          renderPreview={true}
          showStructureActions={true}
          placeholder="Перечислите снаряжение персонажа..."
          rows={10}
          value={document.equipmentContentText ?? ''}
          onValueChange={(value) => {
            dispatch(characterSheetActions.setEquipmentContentText(value))
          }}
        />
    </SheetSection>
  )
}
