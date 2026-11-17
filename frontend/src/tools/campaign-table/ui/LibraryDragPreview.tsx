import { createPortal } from 'react-dom'
import { ItemKindIcon } from '../../../entities/item'
import { SpellSchoolIcon } from '../../../entities/spell'
import { entityLabel } from '../model/library'
import type { LibraryDrag } from './useLibraryDrag'
import styles from './LibraryDragPreview.module.css'

export function LibraryDragPreview({ drag }: { drag: LibraryDrag | null }) {
  if (!drag) return null
  return createPortal(<div className={styles.preview} data-library-drag-preview="" data-over-canvas={drag.overCanvas}
    style={{ left: Math.max(8, Math.min(drag.x + 18, window.innerWidth - 276)), top: Math.max(8, Math.min(drag.y + 14, window.innerHeight - 108)) }} aria-hidden="true">
    <span className={styles.kind}>{entityLabel(drag.reference.entityType)}</span>
    <strong className={styles.name}>{drag.reference.entityType === 'item' && <ItemKindIcon classification={drag.reference.classification} colorMode="inherit" />}
      {drag.reference.entityType === 'spell' && <SpellSchoolIcon school={drag.reference.school} />}{drag.reference.name}</strong>
    <span className={styles.hint}>{drag.overCanvas ? 'Отпустите, чтобы добавить' : 'Перенесите на холст'}</span>
  </div>, document.body)
}
