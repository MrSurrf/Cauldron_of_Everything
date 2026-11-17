import { useMemo } from 'react'
import { BookIcon, Button } from '../../../shared/ui'
import { parseContentSource } from '../../../shared/ui/ContentEditor'
import {
  FORMULA_FIELD_KEYS,
  selectFormulaEvaluation,
  selectFormulaResult,
  selectNumericDisplayValue,
} from '../../character-sheet'
import type { CharacterSheetDocument, NumericFieldState } from '../../character-sheet'
import styles from './CampaignCharacterWiki.module.css'

function displayNumeric(
  field: NumericFieldState,
  evaluation: ReturnType<typeof selectFormulaEvaluation>,
  key: string,
) {
  return selectNumericDisplayValue(field, selectFormulaResult(evaluation, key))
}

function display(value: number | null | undefined) {
  return value == null ? '—' : String(value)
}

export function CampaignCharacterWiki({ document, onOpenFull }: {
  document: CharacterSheetDocument
  onOpenFull: () => void
}) {
  const evaluation = useMemo(() => selectFormulaEvaluation(document), [document])
  const number = (field: NumericFieldState, key: string) => displayNumeric(field, evaluation, key)
  const level = number(document.identity.level, FORMULA_FIELD_KEYS.level)
  const hitPoints = {
    current: number(document.hitPoints.current, FORMULA_FIELD_KEYS.currentHitPoints),
    maximum: number(document.hitPoints.maximum, FORMULA_FIELD_KEYS.maximumHitPoints),
  }
  const identityFacts = [
    document.identity.race,
    [document.identity.className, document.identity.subclass].filter(Boolean).join(' · '),
    level != null ? `Уровень ${level}` : '',
    document.identity.background,
    document.identity.alignment,
    document.identity.playerName ? `Игрок: ${document.identity.playerName}` : '',
  ].filter(Boolean)
  const numericStats = [
    { label: 'КД', value: number(document.derivedStats.armorClass, FORMULA_FIELD_KEYS.armorClass) },
    { label: 'Скорость', value: number(document.derivedStats.speed, FORMULA_FIELD_KEYS.speed) },
    { label: 'Пасс. восприятие', value: number(document.derivedStats.passivePerception, FORMULA_FIELD_KEYS.passivePerception) },
    { label: 'Бонус мастерства', value: number(document.proficiencyBonus, FORMULA_FIELD_KEYS.proficiency) },
  ]
  const stats = [
    ...(hitPoints.current != null || hitPoints.maximum != null
      ? [{ label: 'Хиты', value: `${display(hitPoints.current)} / ${display(hitPoints.maximum)}` }] : []),
    ...numericStats.filter(stat => stat.value != null).map(stat => ({ ...stat, value: display(stat.value) })),
  ]
  const equipmentCount = parseContentSource(document.equipmentContentText ?? '').filter(block => block.kind === 'item').length
  const spellCount = document.spellcasting?.spells.length ?? 0

  return <section className={styles.dossier} data-campaign-character-wiki data-campaign-character-drop="item" data-wiki-section>
    <header className={styles.heading}>
      <div><h3>Краткое досье</h3><span>Кампанийная версия персонажа</span></div>
    </header>
    {identityFacts.length > 0 && <div className={styles.identityFacts}>
      {identityFacts.map(fact => <span key={fact}>{fact}</span>)}
    </div>}
    <dl className={styles.stats}>{stats.map(stat => <div key={stat.label}>
      <dt>{stat.label}</dt><dd>{stat.value}</dd>
    </div>)}</dl>
    {(equipmentCount > 0 || spellCount > 0) && <div className={styles.materials}>
      {equipmentCount > 0 && <span>Снаряжение: {equipmentCount}</span>}
      {spellCount > 0 && <span>Заклинания: {spellCount}</span>}
    </div>}
    <Button size="sm" variant="secondary" decoration="minimal" icon={<BookIcon />} onClick={onOpenFull}>
      Открыть полный лист
    </Button>
  </section>
}
