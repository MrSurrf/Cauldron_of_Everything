import { useState, type DragEvent } from 'react'
import { characterSheetActions } from '../../model'
import { ContentEditor } from '../../../../shared/ui'
import { hasCharacterEncyclopediaDrag, hasCharacterEncyclopediaSpellDrag, readCharacterEncyclopediaDrag } from '../encyclopedia'
import { createResourceMaximumEvaluator } from './resourceMaximumEvaluator'
import { SheetSection } from '../SheetSection'
import type { CharacterSheetViewModel } from './sheetViewModel'
import styles from './CharacterEquipmentSection.module.css'

export type CharacterEquipmentSectionProps = {
  sheet: CharacterSheetViewModel
  onEncyclopediaItemDrop?: (transfer: DataTransfer) => void
}

export function CharacterEquipmentSection({
  sheet,
  onEncyclopediaItemDrop,
}: CharacterEquipmentSectionProps) {
  const [itemDragOver, setItemDragOver] = useState(false)
  const {
    dispatch,
    document,
  } = sheet

  return (
    <SheetSection className={styles.section} contentLayout="editor" title="Снаряжение"
      data-item-drop-target={itemDragOver}
      onDragOver={(event: DragEvent<HTMLElement>) => {
        if (!onEncyclopediaItemDrop || !hasCharacterEncyclopediaDrag(event.dataTransfer)
          || hasCharacterEncyclopediaSpellDrag(event.dataTransfer)
          || !(event.target instanceof Element)
          || !event.target.closest('[data-content-editor-frame]')) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
        if (!itemDragOver) setItemDragOver(true)
      }}
      onDragLeave={(event: DragEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setItemDragOver(false)
      }}
      onDrop={(event: DragEvent<HTMLElement>) => {
        setItemDragOver(false)
        if (!onEncyclopediaItemDrop || !(event.target instanceof Element)
          || !event.target.closest('[data-content-editor-frame]')
          || readCharacterEncyclopediaDrag(event.dataTransfer)?.entityType !== 'item') return
        event.preventDefault()
        event.stopPropagation()
        onEncyclopediaItemDrop(event.dataTransfer)
      }}>
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
