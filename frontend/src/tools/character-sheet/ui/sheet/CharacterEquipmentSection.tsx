import { characterSheetActions } from '../../model'
import { ContentEditor } from '../../../../shared/ui'
import { createResourceMaximumEvaluator } from './resourceMaximumEvaluator'
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
    <SheetSection contentLayout="editor" title="Снаряжение">
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
          dispatch(
            characterSheetActions.setEquipmentContentText(
              value,
            ),
          )
        }}
      />
    </SheetSection>
  )
}
