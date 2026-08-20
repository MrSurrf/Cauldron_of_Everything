import styles from '../../CharacterSheetTool.module.css'
import { CharacterFeaturesSection } from './CharacterFeaturesSection'
import { CharacterPersonalitySections } from './CharacterPersonalitySections'
import type { CharacterSheetViewModel } from './sheetViewModel'

export type CharacterSheetRightColumnProps = {
  sheet: CharacterSheetViewModel
}

export function CharacterSheetRightColumn({
  sheet,
}: CharacterSheetRightColumnProps) {
  return (
    <div className={`${styles.column} ${styles.notesRegion}`}>
      <CharacterPersonalitySections sheet={sheet} />
      <CharacterFeaturesSection sheet={sheet} />
    </div>
  )
}
