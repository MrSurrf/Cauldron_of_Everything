import type { CSSProperties } from 'react'

import shieldIcon from './assets/shield.svg'
import styles from './DamageAffinityLegend.module.css'

type LegendStyle = CSSProperties & {
  '--legend-shield-icon': string
}

const legendStyle: LegendStyle = {
  '--legend-shield-icon': `url("${shieldIcon}")`,
}

export function DamageAffinityLegend() {
  return (
    <div className={styles.root} style={legendStyle}>
      <strong className={styles.title}>Как читать обозначения</strong>
      <p className={styles.intro}>
        Символ в центре щита обозначает тип урона. Маркеры и свечение показывают реакцию существа на него.
      </p>

      <div className={styles.list}>
        <div className={styles.item}>
          <span className={styles.marker} data-direction="up" data-kind="physical" />
          <span><b>Жёлтый вверх</b> — сопротивление физическому урону.</span>
        </div>
        <div className={styles.item}>
          <span className={styles.marker} data-direction="up" data-kind="magical" />
          <span><b>Бирюзовый вверх</b> — сопротивление магическому урону.</span>
        </div>
        <div className={styles.item}>
          <span className={styles.marker} data-direction="down" data-kind="physical-vulnerability" />
          <span><b>Красный вниз</b> — уязвимость к физическому урону.</span>
        </div>
        <div className={styles.item}>
          <span className={styles.marker} data-direction="down" data-kind="magical-vulnerability" />
          <span><b>Фиолетовый вниз</b> — уязвимость к магическому урону.</span>
        </div>
        <div className={styles.item}>
          <span className={styles.shield} data-kind="physical" />
          <span><b>Жёлтое свечение</b> — иммунитет к физическому урону.</span>
        </div>
        <div className={styles.item}>
          <span className={styles.shield} data-kind="magical" />
          <span><b>Бирюзовое свечение</b> — иммунитет к магическому урону.</span>
        </div>
      </div>

      <p className={styles.note}>
        На одном щите могут одновременно отображаться физический и магический эффекты.
      </p>
    </div>
  )
}
