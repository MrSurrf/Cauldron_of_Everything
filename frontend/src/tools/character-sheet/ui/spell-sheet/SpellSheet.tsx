import { useState, type DragEvent, type ReactNode } from 'react'

import { Checkbox } from '../../../../shared/ui'
import { PlaceholderIcon } from '../../../../shared/ui/icons/PlaceholderIcon'
import {
  abilityModifierVariable,
  type AbilityKey,
  type SpellEntry,
  type SpellLevel,
  type SpellSlotLevel,
  type SpellSlotState,
} from '../../model'
import { EncyclopediaIdentityField } from '../encyclopedia/EncyclopediaIdentityField'
import { hasCharacterEncyclopediaSpellDrag, hasCharacterEncyclopediaSpellLevelDrag, readCharacterEncyclopediaDrag } from '../encyclopedia/characterEncyclopediaDrag'
import { useCharacterEncyclopediaDropTarget } from '../encyclopedia/useCharacterEncyclopediaDrag'
import dragStyles from '../encyclopedia/characterEncyclopediaDragFeedback.module.css'
import {
  FormulaField,
  type ComputedValueResult,
  type FormulaFieldValue,
  type FormulaVariableOption,
} from '../fields'
import { AnimatedDisclosure } from '../AnimatedDisclosure'
import { SheetSection } from '../SheetSection'
import styles from './SpellSheet.module.css'

export type { SpellLevel } from '../../model'
export type SpellSheetSpell = SpellEntry
export type SpellSlotPool = SpellSlotState

export type SpellcastingSummary = {
  className: string
  abilityKey: AbilityKey
  ability: string
  saveDc: FormulaFieldValue
  saveDcResult: ComputedValueResult
  attackBonus: FormulaFieldValue
  attackBonusResult: ComputedValueResult
}

export type SpellSheetProps = {
  className?: string
  spellcasting: SpellcastingSummary
  slots: Partial<Record<SpellSlotLevel, SpellSlotPool>>
  spells: readonly SpellSheetSpell[]
  onSlotUsedChange?: (level: SpellSlotLevel, used: number) => void
  onSlotMaximumChange?: (level: SpellSlotLevel, maximum: number) => void
  onClassNameChange?: (className: string) => void
  onAbilityChange?: (ability: AbilityKey) => void
  onSaveDcChange?: (value: FormulaFieldValue) => void
  onAttackBonusChange?: (value: FormulaFieldValue) => void
  onSpellPreparedChange?: (id: string, prepared: boolean) => void
  onSpellDrop?: (transfer: DataTransfer, level: SpellLevel) => void
  onRemoveSpell?: (id: string) => void
  formulaVariables?: readonly FormulaVariableOption[]
  onBack?: () => void
}

const LEVELS: readonly SpellLevel[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

const ABILITIES: readonly { key: AbilityKey; name: string }[] = [
  { key: 'strength', name: 'Сила' },
  { key: 'dexterity', name: 'Ловкость' },
  { key: 'constitution', name: 'Телосложение' },
  { key: 'intelligence', name: 'Интеллект' },
  { key: 'wisdom', name: 'Мудрость' },
  { key: 'charisma', name: 'Харизма' },
]

const LEVEL_NAMES: Record<SpellLevel, string> = {
  0: 'Заговоры',
  1: '1-й уровень',
  2: '2-й уровень',
  3: '3-й уровень',
  4: '4-й уровень',
  5: '5-й уровень',
  6: '6-й уровень',
  7: '7-й уровень',
  8: '8-й уровень',
  9: '9-й уровень',
}

function SpellDropSection({ level, onSpellDrop, children }: {
  level: SpellLevel
  onSpellDrop: SpellSheetProps['onSpellDrop']
  children: ReactNode
}) {
  const feedback = useCharacterEncyclopediaDropTarget('spell', Boolean(onSpellDrop), level)

  function handleDragOver(event: DragEvent<HTMLElement>) {
    if (!onSpellDrop || !hasCharacterEncyclopediaSpellDrag(event.dataTransfer)) return
    event.preventDefault()
    const matches = hasCharacterEncyclopediaSpellLevelDrag(event.dataTransfer, level)
    event.dataTransfer.dropEffect = matches ? 'copy' : 'none'
    feedback.setActive(matches)
  }

  return <SheetSection
    className={[styles.levelCard, dragStyles.target, feedback.available && dragStyles.available,
      feedback.active && dragStyles.active, feedback.received && dragStyles.received].filter(Boolean).join(' ')}
    data-encyclopedia-drop-zone="spell"
    data-spell-drop-level={level}
    data-encyclopedia-drop-available={feedback.available || undefined}
    data-drop-target={feedback.active}
    data-drop-active={feedback.active || undefined}
    data-drop-received={feedback.received || undefined}
    aria-label={LEVEL_NAMES[level]}
    onDragEnter={handleDragOver}
    onDragOver={handleDragOver}
    onDragLeave={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) feedback.setActive(false)
    }}
    onDrop={(event) => {
      feedback.setActive(false)
      if (!onSpellDrop || !hasCharacterEncyclopediaSpellDrag(event.dataTransfer)) return
      event.preventDefault()
      const entry = readCharacterEncyclopediaDrag(event.dataTransfer)
      if (entry?.entityType !== 'spell') return
      onSpellDrop(event.dataTransfer, level)
      if (entry.level === null || entry.level === level) feedback.receive()
    }}
  >
    {children}
    {onSpellDrop && <div className={styles.dropHint} aria-hidden="true">Перетащите заклинание сюда</div>}
  </SheetSection>
}

function initialExpandedSpells(spells: readonly SpellSheetSpell[]) {
  const seen = new Set<SpellLevel>()
  return new Set(spells.filter((spell) => {
    if (spell.level > 4 || seen.has(spell.level)) return false
    seen.add(spell.level)
    return true
  }).map((spell) => spell.id))
}

function SpellRow({ spell, expanded, onExpand, onPreparedChange, onRemove }: {
  spell: SpellSheetSpell
  expanded: boolean
  onExpand: () => void
  onPreparedChange?: (id: string, prepared: boolean) => void
  onRemove?: (id: string) => void
}) {
  const detailsId = `spell-sheet-details-${spell.id}`
  const prepared = spell.level === 0 || spell.alwaysPrepared || spell.prepared
  const components = Array.isArray(spell.components) ? spell.components.join(', ') : spell.components
  const facts: Array<[string, string]> = []
  if (spell.castingTime) facts.push(['Накладывание', spell.castingTime])
  if (spell.range) facts.push(['Дистанция', spell.range])
  if (spell.duration) facts.push(['Длительность', spell.duration])
  if (components) facts.push(['Компоненты', components])

  return <article
    className={styles.spell}
    data-expanded={expanded}
    data-spell-entry={spell.id}
  >
    <div className={styles.spellRow}>
      <Checkbox
        rootClassName={styles.prepareControl}
        aria-label={`${spell.level === 0 ? 'Известный заговор' : 'Подготовить заклинание'}: ${spell.name}`}
        title={spell.level === 0 ? 'Известный заговор' : spell.alwaysPrepared ? 'Всегда подготовлено' : prepared ? 'Заклинание подготовлено' : 'Заклинание не подготовлено'}
        checked={prepared}
        disabled={!onPreparedChange || spell.level === 0 || spell.alwaysPrepared}
        onCheckedChange={(checked) => onPreparedChange?.(spell.id, checked)}
      />
      <button type="button" className={styles.expandButton} aria-expanded={expanded} aria-controls={detailsId} onClick={onExpand}>
        <span>{spell.name}</span>
        <span className={styles.chevron} aria-hidden="true" />
      </button>
    </div>
    <AnimatedDisclosure
      id={detailsId}
      contentClassName={styles.spellDetails}
      open={expanded}
    >
      {facts.length > 0 && <dl className={styles.factList}>
        {facts.map(([label, value]) => <div className={styles.fact} key={label}>
          <dt>{label}</dt><dd>{value}</dd>
        </div>)}
      </dl>}
      {(spell.concentration || spell.ritual) && <div className={styles.qualities}>
        {spell.concentration && <span>Концентрация</span>}
        {spell.ritual && <span>Ритуал</span>}
      </div>}
      {spell.description && <p className={styles.description}>{spell.description}</p>}
      {(spell.school || spell.nameEn || spell.source || onRemove) && <div className={styles.spellFooter}>
        <span>{[spell.school, spell.nameEn].filter(Boolean).join(' · ') || 'Заклинание'}</span>
        {spell.source && <span className={styles.source}>{spell.source}</span>}
        {onRemove && <button type="button" className={styles.removeButton} onClick={() => onRemove(spell.id)} aria-label={`Удалить заклинание ${spell.name}`}>Удалить</button>}
      </div>}
    </AnimatedDisclosure>
  </article>
}

export function SpellSheet({
  className,
  spellcasting,
  slots,
  spells,
  onSlotUsedChange,
  onSlotMaximumChange,
  onClassNameChange,
  onAbilityChange,
  onSaveDcChange,
  onAttackBonusChange,
  onSpellPreparedChange,
  onSpellDrop,
  onRemoveSpell,
  formulaVariables,
  onBack,
}: SpellSheetProps) {
  const [expandedIds, setExpandedIds] = useState(() => initialExpandedSpells(spells))

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return <div className={[styles.root, className].filter(Boolean).join(' ')}>
    <div className={styles.scroller}>
    {onBack && <div className={styles.toolbar}>
      {onBack && <button type="button" className={styles.toolbarButton} onClick={onBack}>← <span>Лист персонажа</span></button>}
    </div>}

    <div className={styles.content}>
      <div className={styles.summary} data-spellcasting-summary aria-label="Характеристики заклинателя">
        <SheetSection className={styles.summaryCard}>
          <span className={styles.summaryIcon} aria-hidden="true"><PlaceholderIcon /></span>
          <div className={styles.summaryValue}>
            <span className={styles.summaryLabel}>Класс заклинателя</span>
            {onClassNameChange
              ? <EncyclopediaIdentityField
                  aria-label="Класс заклинателя"
                  className={styles.classInput}
                  fieldClassName={styles.classField}
                  placeholder="Введите или перетащите класс"
                  rootClassName={styles.classFrame}
                  entityType="class"
                  value={spellcasting.className}
                  onValueChange={onClassNameChange}
                />
              : <strong>{spellcasting.className || '—'}</strong>}
          </div>
        </SheetSection>
        <SheetSection className={styles.summaryCard}>
          <span className={styles.summaryIcon} aria-hidden="true"><PlaceholderIcon /></span>
          <div><span className={styles.summaryLabel}>Характеристика</span>{onAbilityChange
            ? <select className={styles.abilitySelect} aria-label="Характеристика заклинателя"
              value={spellcasting.abilityKey} onChange={(event) => onAbilityChange(event.target.value as AbilityKey)}>
              {ABILITIES.map(({ key, name }) => <option key={key} value={key}>{name}</option>)}
            </select>
            : <strong>{spellcasting.ability || '—'}</strong>}</div>
        </SheetSection>
        <SheetSection className={`${styles.summaryCard} ${styles.formulaSummaryCard}`}>
          <span className={styles.summaryIcon} aria-hidden="true"><PlaceholderIcon /></span>
          <FormulaField
            className={styles.summaryFormula}
            compact
            defaultFormula={`8 + PROFICIENCY + ${abilityModifierVariable(spellcasting.abilityKey)}`}
            disabled={!onSaveDcChange}
            label="СЛ спасброска"
            presentation="stat"
            result={spellcasting.saveDcResult}
            value={spellcasting.saveDc}
            variables={formulaVariables}
            onValueChange={onSaveDcChange ?? (() => undefined)}
          />
        </SheetSection>
        <SheetSection className={`${styles.summaryCard} ${styles.formulaSummaryCard}`}>
          <span className={styles.summaryIcon} aria-hidden="true"><PlaceholderIcon /></span>
          <FormulaField
            className={styles.summaryFormula}
            compact
            defaultFormula={`PROFICIENCY + ${abilityModifierVariable(spellcasting.abilityKey)}`}
            disabled={!onAttackBonusChange}
            label="Бонус атаки"
            prefixPositive
            presentation="stat"
            result={spellcasting.attackBonusResult}
            signDisplay="compact"
            value={spellcasting.attackBonus}
            variables={formulaVariables}
            onValueChange={onAttackBonusChange ?? (() => undefined)}
          />
        </SheetSection>
      </div>

      <div className={styles.levelGrid} data-spell-level-grid>
        {LEVELS.map((level) => {
          const levelSpells = spells.filter((spell) => spell.level === level)
          const pool = level === 0 ? null : slots[level]
          const maximum = Math.min(20, Math.max(0, Math.floor(pool?.maximum ?? 0)))
          const used = Math.min(maximum, Math.max(0, Math.floor(pool?.used ?? 0)))
          const available = maximum - used
          return <SpellDropSection
            level={level}
            key={level}
            onSpellDrop={onSpellDrop}
          >
            <header className={styles.levelHeader}>
              <span className={styles.levelBadge} aria-hidden="true"><span>{level}</span></span>
              <div className={styles.levelHeading}>
                <h2>{LEVEL_NAMES[level]}</h2>
                {level === 0 && <p>Всегда доступны, ячеек не требуют</p>}
              </div>
              {level !== 0 && <div className={styles.slotSummary} role="group" aria-label={`Ячейки ${level}-го уровня: доступно ${available} из ${maximum}`}>
                {maximum > 0 && <div className={styles.slotMarks}>
                  {Array.from({ length: maximum }, (_, index) => {
                    const spent = index < used
                    return <Checkbox
                      key={index}
                      rootClassName={styles.slotControl}
                      checked={!spent}
                      aria-label={`${spent ? 'Восстановить' : 'Израсходовать'} ячейку ${level}-го уровня`}
                      title={spent ? 'Восстановить ячейку' : 'Израсходовать ячейку'}
                      disabled={!onSlotUsedChange}
                      onCheckedChange={(checked) => onSlotUsedChange?.(level, used + (checked ? -1 : 1))}
                    />
                  })}
                </div>}
                <span className={styles.slotCount} title="Доступно / всего ячеек">
                  <output aria-label={`Доступно ячеек: ${available}`}>{available}</output>
                  <span aria-hidden="true">/</span>
                  {onSlotMaximumChange
                    ? <input
                      type="number"
                      min="0"
                      max="20"
                      value={maximum}
                      aria-label={`Всего ячеек ${level}-го уровня`}
                      onChange={(event) => onSlotMaximumChange(level, Math.min(20, Math.max(0, Number(event.target.value) || 0)))}
                    />
                    : <span aria-label={`Всего ячеек: ${maximum}`}>{maximum}</span>}
                </span>
              </div>}
            </header>
            <div className={styles.spellList}>
              {levelSpells.map((spell) => <SpellRow
                key={spell.id}
                spell={spell}
                expanded={expandedIds.has(spell.id)}
                onExpand={() => toggleExpanded(spell.id)}
                onPreparedChange={onSpellPreparedChange}
                onRemove={onRemoveSpell}
              />)}
              {levelSpells.length === 0 && <p className={styles.emptyLevel}>Заклинаний пока нет</p>}
            </div>
          </SpellDropSection>
        })}
      </div>
    </div>
    </div>
  </div>
}
