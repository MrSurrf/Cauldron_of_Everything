import type { DragEvent } from 'react'
import { TextInput, type TextInputProps } from '../../../../shared/ui'
import {
  hasCharacterEncyclopediaDrag,
  hasCharacterEncyclopediaTypeDrag,
  readCharacterEncyclopediaDrag,
  type CharacterIdentityEncyclopediaMode,
} from './characterEncyclopediaDrag'
import { useCharacterEncyclopediaDropTarget } from './useCharacterEncyclopediaDrag'
import dragStyles from './characterEncyclopediaDragFeedback.module.css'

type EncyclopediaIdentityFieldProps = Omit<TextInputProps, 'onChange' | 'value'> & {
  entityType: CharacterIdentityEncyclopediaMode
  onValueChange: (value: string) => void
  value: string
}

/** Поле принимает только свой тип записи; ручной ввод остаётся доступен. */
export function EncyclopediaIdentityField({
  entityType,
  onValueChange,
  rootClassName,
  value,
  ...props
}: EncyclopediaIdentityFieldProps) {
  const enabled = !props.disabled && !props.readOnly
  const feedback = useCharacterEncyclopediaDropTarget(entityType, enabled)

  function handleDragOver(event: DragEvent<HTMLInputElement>) {
    if (!enabled || !hasCharacterEncyclopediaDrag(event.dataTransfer)) return
    event.preventDefault()
    const matches = hasCharacterEncyclopediaTypeDrag(event.dataTransfer, entityType)
    event.dataTransfer.dropEffect = matches ? 'copy' : 'none'
    feedback.setActive(matches)
  }

  return <TextInput
    {...props}
    autoComplete="off"
    rootClassName={[rootClassName, dragStyles.target, feedback.available && dragStyles.available,
      feedback.active && dragStyles.active, feedback.received && dragStyles.received].filter(Boolean).join(' ')}
    data-encyclopedia-drop-zone={entityType}
    data-encyclopedia-drop-available={feedback.available || undefined}
    data-drop-active={feedback.active || undefined}
    data-drop-received={feedback.received || undefined}
    value={value}
    onChange={(event) => onValueChange(event.currentTarget.value)}
    onDragEnter={handleDragOver}
    onDragOver={handleDragOver}
    onDragLeave={() => feedback.setActive(false)}
    onDrop={(event) => {
      feedback.setActive(false)
      if (!enabled || !hasCharacterEncyclopediaDrag(event.dataTransfer)) return
      // Не даём браузеру вставить text/plain из записи другого раздела.
      event.preventDefault()
      event.stopPropagation()
      const entry = readCharacterEncyclopediaDrag(event.dataTransfer)
      if (entry?.entityType === entityType) {
        onValueChange(entry.name)
        feedback.receive()
      }
    }}
  />
}
