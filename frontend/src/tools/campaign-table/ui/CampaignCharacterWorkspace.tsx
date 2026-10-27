import { CharacterSheetTool } from '../../character-sheet'
import type { CharacterSheetDocument } from '../../character-sheet'
import styles from './CampaignCharacterWorkspace.module.css'

export function CampaignCharacterWorkspace({ document, diagramName, onBack, onChange }: {
  document: CharacterSheetDocument
  diagramName: string
  onBack: () => void
  onChange: (document: CharacterSheetDocument) => void
}) {
  return <section className={styles.workspace} aria-label="Кампанийный лист персонажа" data-campaign-character-workspace>
    <nav className={styles.tabs} aria-label="Рабочие вкладки">
      <button type="button" onClick={onBack}>{diagramName}</button>
      <button type="button" aria-current="page">{document.identity.name || 'Персонаж кампании'}</button>
      <span>Версия этой кампании</span>
    </nav>
    <div className={styles.body}>
      <CharacterSheetTool document={document} onDocumentChange={onChange} />
    </div>
  </section>
}
