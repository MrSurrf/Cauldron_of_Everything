import type { CSSProperties } from 'react'
import { edgeColors, normalizeEdgeAppearance } from '../model/edgeAppearance'
import type { EdgeAppearance } from '../model/edgeAppearance'
import styles from './EdgeAppearanceControls.module.css'

const paths = [
  { value: 'straight', label: 'Прямая', accessible: 'Прямая линия', path: 'M3 20 L37 4' },
  { value: 'bezier', label: 'Плавная', accessible: 'Плавная линия', path: 'M3 20 C20 20 20 4 37 4' },
  { value: 'step', label: 'Ломаная', accessible: 'Ломаная линия', path: 'M3 20 H15 Q20 20 20 15 V9 Q20 4 25 4 H37' },
] as const
const patterns = [
  { value: 'solid', label: 'Сплошная', accessible: 'Сплошная линия', dash: undefined },
  { value: 'dashed', label: 'Штрихи', accessible: 'Штриховая линия', dash: '6 5' },
  { value: 'dotted', label: 'Точки', accessible: 'Пунктирная линия', dash: '1 5' },
] as const
const directions = [
  { value: 'none', label: 'Без стрелок', path: 'M3 12 H37' },
  { value: 'forward', label: 'Стрелка к цели', path: 'M3 12 H37 M31 6 L37 12 L31 18' },
  { value: 'both', label: 'Стрелки в обе стороны', path: 'M3 12 H37 M9 6 L3 12 L9 18 M31 6 L37 12 L31 18' },
] as const

export function EdgeAppearanceControls({ data, onChange, disabled = false }: {
  data?: EdgeAppearance; onChange: (patch: EdgeAppearance) => void; disabled?: boolean
}) {
  const appearance = normalizeEdgeAppearance(data)
  return <div className={styles.controls}>
    <fieldset disabled={disabled}><legend>Форма линии</legend><div className={styles.choices}>
      {paths.map(option => <button key={option.value} type="button" className={styles.choice} aria-label={option.accessible}
        aria-pressed={appearance.pathStyle === option.value} onClick={() => onChange({ pathStyle: option.value })}>
        <svg viewBox="0 0 40 24" aria-hidden="true"><path d={option.path} /></svg><span>{option.label}</span>
      </button>)}
    </div></fieldset>
    <fieldset disabled={disabled}><legend>Рисунок линии</legend><div className={styles.choices}>
      {patterns.map(option => <button key={option.value} type="button" className={styles.choice} aria-label={option.accessible}
        aria-pressed={appearance.lineStyle === option.value} onClick={() => onChange({ lineStyle: option.value })}>
        <svg viewBox="0 0 40 24" aria-hidden="true"><path d="M3 12 H37" strokeDasharray={option.dash} /></svg><span>{option.label}</span>
      </button>)}
    </div></fieldset>
    <fieldset disabled={disabled}><legend>Направление</legend><div className={styles.choices}>
      {directions.map(option => <button key={option.value} type="button" className={styles.choice} aria-label={option.label}
        title={option.label} aria-pressed={appearance.direction === option.value} onClick={() => onChange({ direction: option.value })}>
        <svg viewBox="0 0 40 24" aria-hidden="true"><path d={option.path} /></svg>
        <span>{option.value === 'none' ? 'Нет' : option.value === 'forward' ? 'Вперёд' : 'Оба конца'}</span>
      </button>)}
    </div></fieldset>
    <fieldset disabled={disabled}><legend>Цвет связи</legend><div className={styles.colors}>
      {edgeColors.map(color => <button key={color.value} type="button" className={styles.color} aria-label={`Цвет связи: ${color.label}`}
        title={color.label} aria-pressed={appearance.color === color.value} onClick={() => onChange({ color: color.value })}
        style={{ '--swatch-color': color.token } as CSSProperties}><span aria-hidden="true" /></button>)}
    </div></fieldset>
  </div>
}
