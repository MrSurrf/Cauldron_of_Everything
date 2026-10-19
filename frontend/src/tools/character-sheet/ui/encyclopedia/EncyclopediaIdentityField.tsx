import { useState, type DragEvent } from 'react'
import { TextInput, type TextInputProps } from '../../../../shared/ui'
import {
  hasCharacterEncyclopediaDrag,
  hasCharacterEncyclopediaTypeDrag,
  readCharacterEncyclopediaDrag,
  type CharacterIdentityEncyclopediaMode,
} from './characterEncyclopediaDrag'
import styles from './EncyclopediaIdentityField.module.css'

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
  const [dragOver, setDragOver] = useState(false)

  function handleDragOver(event: DragEvent<HTMLInputElement>) {
    if (!hasCharacterEncyclopediaDrag(event.dataTransfer)) return
    event.preventDefault()
    const matches = hasCharacterEncyclopediaTypeDrag(event.dataTransfer, entityType)
    event.dataTransfer.dropEffect = matches ? 'copy' : 'none'
    setDragOver(matches)
  }

  return <TextInput
    {...props}
    autoComplete="off"
    rootClassName={[rootClassName, dragOver && styles.dropTarget].filter(Boolean).join(' ')}
    value={value}
    onChange={(event) => onValueChange(event.currentTarget.value)}
    onDragEnter={handleDragOver}
    onDragOver={handleDragOver}
    onDragLeave={() => setDragOver(false)}
    onDrop={(event) => {
      setDragOver(false)
      if (!hasCharacterEncyclopediaDrag(event.dataTransfer)) return
      // Не даём браузеру вставить text/plain из записи другого раздела.
      event.preventDefault()
      event.stopPropagation()
      const entry = readCharacterEncyclopediaDrag(event.dataTransfer)
      if (entry?.entityType === entityType) onValueChange(entry.name)
    }}
  />
}
