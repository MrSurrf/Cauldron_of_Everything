import { useState } from 'react'
import {
  CharacterSheetTool,
  createMockSpellcasterSheet,
  type CharacterSheetDocument,
} from '../../tools/character-sheet'
import styles from './CharacterSheetRoutePage.module.css'

const STORAGE_KEY = 'cauldron.character-sheet.demo.v1'

function loadDocument(): CharacterSheetDocument {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const value: unknown = JSON.parse(raw)
      if (value && typeof value === 'object' && 'id' in value && 'identity' in value && 'abilities' in value) {
        return value as CharacterSheetDocument
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
