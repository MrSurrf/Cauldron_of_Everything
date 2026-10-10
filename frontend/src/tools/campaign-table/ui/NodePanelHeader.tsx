import styles from './CampaignTable.module.css'

export function NodePanelHeader({ title, closeLabel, onClose }: {
  title: string; closeLabel: string; onClose: () => void
}) {
  return <header className={styles.nodePanelHeader}>
    <h2>{title}</h2>
    <button type="button" className={styles.panelClose} aria-label={closeLabel} title="Закрыть" onClick={onClose}>
      <span aria-hidden="true">×</span>
    </button>
  </header>
}
