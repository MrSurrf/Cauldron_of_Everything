import type { DragEvent } from 'react'
import { characterSheetActions } from '../../model'
import { ContentEditor } from '../../../../shared/ui'
import { hasCharacterEncyclopediaTypeDrag, readCharacterEncyclopediaDrag } from '../encyclopedia'
import { useCharacterEncyclopediaDropTarget } from '../encyclopedia/useCharacterEncyclopediaDrag'
import dragStyles from '../encyclopedia/characterEncyclopediaDragFeedback.module.css'
import { createResourceMaximumEvaluator } from './resourceMaximumEvaluator'
import { SheetSection } from '../SheetSection'
import type { CharacterSheetViewModel } from './sheetViewModel'

export type CharacterEquipmentSectionProps = {
  sheet: CharacterSheetViewModel
  onEncyclopediaItemDrop?: (transfer: DataTransfer) => void
}

export function CharacterEquipmentSection({
  sheet,
  onEncyclopediaItemDrop,
}: CharacterEquipmentSectionProps) {
  const feedback = useCharacterEncyclopediaDropTarget('item', Boolean(onEncyclopediaItemDrop))
  const {
    dispatch,
    document,
  } = sheet

  function handleDragOver(event: DragEvent<HTMLElement>) {
    if (!onEncyclopediaItemDrop || !hasCharacterEncyclopediaTypeDrag(event.dataTransfer, 'item')) return
    const matches = event.target instanceof Element && Boolean(event.target.closest('[data-content-editor-frame]'))
    event.preventDefault()
    event.dataTransfer.dropEffect = matches ? 'copy' : 'none'
    feedback.setActive(matches)
  }

  return (
    <SheetSection className={[dragStyles.target, feedback.available && dragStyles.available,
      feedback.active && dragStyles.active, feedback.received && dragStyles.received].filter(Boolean).join(' ')}
      contentLayout="editor" frame="none" title="Снаряжение"
      data-encyclopedia-drop-zone="item"
      data-encyclopedia-drop-available={feedback.available || undefined}
      data-item-drop-target={feedback.active}
      data-drop-active={feedback.active || undefined}
      data-drop-received={feedback.received || undefined}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={(event: DragEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) feedback.setActive(false)
      }}
      onDrop={(event: DragEvent<HTMLElement>) => {
        feedback.setActive(false)
        if (!onEncyclopediaItemDrop || !(event.target instanceof Element)
          || !event.target.closest('[data-content-editor-frame]')
          || readCharacterEncyclopediaDrag(event.dataTransfer)?.entityType !== 'item') return
        event.preventDefault()
        event.stopPropagation()
        onEncyclopediaItemDrop(event.dataTransfer)
        feedback.receive()
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
