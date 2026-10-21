import { createPortal } from 'react-dom'
import { entityLabel } from '../model/library'
import type { LibraryDrag } from './useLibraryDrag'
import styles from './LibraryDragPreview.module.css'

export function LibraryDragPreview({ drag }: { drag: LibraryDrag | null }) {
  if (!drag) return null
  return createPortal(<div className={styles.preview} data-library-drag-preview="" data-over-canvas={drag.overCanvas}
    style={{ left: Math.max(8, Math.min(drag.x + 18, window.innerWidth - 276)), top: Math.max(8, Math.min(drag.y + 14, window.innerHeight - 108)) }} aria-hidden="true">
    <span className={styles.kind}>{entityLabel(drag.reference.entityType)}</span>
    <strong>{drag.reference.name}</strong>
    <span className={styles.hint}>{drag.overCanvas ? 'Отпустите, чтобы добавить' : 'Перенесите на холст'}</span>
  </div>, document.body)
}
