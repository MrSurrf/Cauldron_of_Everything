import { CharacterSheetTool, createMockCharacterSheet } from '../../tools/character-sheet'
import styles from './CharacterSheetRoutePage.module.css'

const mockDocument = createMockCharacterSheet()

export default function CharacterSheetRoutePage() {
  return (
    <main className={styles.page}>
      <CharacterSheetTool initialDocument={mockDocument} />
    </main>
  )
}
