import { useState } from 'react'
import {
  CharacterSheetTool,
  createMockSpellcasterSheet,
  type CharacterSheetDocument,
} from '../../tools/character-sheet'
import styles from './CharacterSheetRoutePage.module.css'
import { emptyItem, itemToSource } from '../../shared/ui/ContentEditor/itemContent'

const STORAGE_KEY = 'cauldron.character-sheet.demo.v1'

function loadDocument(): CharacterSheetDocument {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const value: unknown = JSON.parse(raw)
      if (value && typeof value === 'object' && 'id' in value && 'identity' in value && 'abilities' in value) {
        const saved = value as CharacterSheetDocument
        if (saved.equipmentItems?.length) {
          const oldItems = saved.equipmentItems.map((item) => itemToSource({
            ...emptyItem,
            title: item.name,
            quantity: String(item.quantity),
            description: item.description ?? '',
          }, item.entityId ? { 'entity-id': String(item.entityId) } : {}))
          saved.equipmentContentText = [saved.equipmentContentText?.trim(), ...oldItems].filter(Boolean).join('\n\n')
          delete saved.equipmentItems
        }
        return saved
      }
    }
  } catch {
    // Недоступное хранилище не мешает открыть демонстрационный лист.
  }
  return createMockSpellcasterSheet()
}

export default function CharacterSheetRoutePage() {
  const [document, setDocument] = useState(loadDocument)

  function handleDocumentChange(nextDocument: CharacterSheetDocument) {
    setDocument(nextDocument)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDocument))
    } catch {
      // Лист продолжит работать в текущей вкладке.
    }
  }

  return (
    <main className={styles.page}>
      <CharacterSheetTool document={document} onDocumentChange={handleDocumentChange} />
    </main>
  )
}
