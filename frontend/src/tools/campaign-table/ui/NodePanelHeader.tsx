import styles from './CampaignPanels.module.css'

export function NodePanelHeader({ title, closeLabel, onClose }: {
  title: string; closeLabel: string; onClose: () => void
}) {
  return <header className={styles.header}>
    <h2>{title}</h2>
    <button type="button" className={styles.close} aria-label={closeLabel} title="Закрыть" onClick={onClose}>
      <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10 M15 5 5 15" /></svg>
    </button>
  </header>
}
