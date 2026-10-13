import { useState, type DragEvent } from 'react'

import { PlaceholderIcon } from '../../../../shared/ui/icons/PlaceholderIcon'
import type { AbilityKey, SpellEntry, SpellLevel, SpellSlotLevel, SpellSlotState } from '../../model'
import { hasCharacterEncyclopediaSpellDrag, readCharacterEncyclopediaDrag } from '../encyclopedia'
import styles from './SpellSheet.module.css'

export type { SpellLevel } from '../../model'
export type SpellSheetSpell = SpellEntry
export type SpellSlotPool = SpellSlotState

export type SpellcastingSummary = {
  className: string
  abilityKey: AbilityKey
  ability: string
  saveDc: number
  attackBonus: number
}

export type SpellSheetProps = {
  className?: string
  pageScale?: number
  spellcasting: SpellcastingSummary
  slots: Partial<Record<SpellSlotLevel, SpellSlotPool>>
  spells: readonly SpellSheetSpell[]
  onSlotUsedChange?: (level: SpellSlotLevel, used: number) => void
  onSlotMaximumChange?: (level: SpellSlotLevel, maximum: number) => void
  onAbilityChange?: (ability: AbilityKey) => void
  onSpellPreparedChange?: (id: string, prepared: boolean) => void
  onSpellDrop?: (transfer: DataTransfer, level: SpellLevel) => void
  onRemoveSpell?: (id: string) => void
  onOpenEncyclopedia?: () => void
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

function signedBonus(value: number) {
  return value >= 0 ? `+${value}` : String(value)
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

  return <article className={styles.spell} data-expanded={expanded}>
    <div className={styles.spellRow}>
      <button
        type="button"
        className={styles.prepareButton}
        aria-label={`${spell.level === 0 ? 'Известный заговор' : 'Подготовить заклинание'}: ${spell.name}`}
        aria-pressed={prepared}
        title={spell.level === 0 ? 'Известный заговор' : spell.alwaysPrepared ? 'Всегда подготовлено' : prepared ? 'Заклинание подготовлено' : 'Заклинание не подготовлено'}
        disabled={!onPreparedChange || spell.level === 0 || spell.alwaysPrepared}
        onClick={() => onPreparedChange?.(spell.id, !prepared)}
      >
        <span className={styles.preparedMark} aria-hidden="true" />
      </button>
      <button type="button" className={styles.expandButton} aria-expanded={expanded} aria-controls={detailsId} onClick={onExpand}>
        <span>{spell.name}</span>
        <span className={styles.chevron} aria-hidden="true" />
      </button>
    </div>
    {expanded && <div className={styles.spellDetails} id={detailsId}>
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
    </div>}
  </article>
}

export function SpellSheet({
  className,
  pageScale = 1,
  spellcasting,
  slots,
  spells,
  onSlotUsedChange,
  onSlotMaximumChange,
  onAbilityChange,
  onSpellPreparedChange,
  onSpellDrop,
  onRemoveSpell,
  onOpenEncyclopedia,
  onBack,
}: SpellSheetProps) {
  const [expandedIds, setExpandedIds] = useState(() => initialExpandedSpells(spells))
  const [dragLevel, setDragLevel] = useState<SpellLevel | null>(null)

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleDragOver(event: DragEvent<HTMLElement>, level: SpellLevel) {
    if (!onSpellDrop || !hasCharacterEncyclopediaSpellDrag(event.dataTransfer)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    if (dragLevel !== level) setDragLevel(level)
  }

  function handleDrop(event: DragEvent<HTMLElement>, level: SpellLevel) {
    if (!onSpellDrop || !hasCharacterEncyclopediaSpellDrag(event.dataTransfer)) return
    event.preventDefault()
    setDragLevel(null)
    if (readCharacterEncyclopediaDrag(event.dataTransfer)?.entityType !== 'spell') return
    onSpellDrop(event.dataTransfer, level)
  }

  return <div className={[styles.root, className].filter(Boolean).join(' ')}
    style={pageScale < 1 ? { zoom: pageScale, width: '60.75rem' } : undefined}>
    {onBack && <div className={styles.toolbar}>
      {onBack && <button type="button" className={styles.toolbarButton} onClick={onBack}>← <span>Лист персонажа</span></button>}
    </div>}

    <div className={styles.content}>
      <div className={styles.summary} aria-label="Характеристики заклинателя">
        <div className={styles.summaryCard}>
          <span className={styles.summaryIcon} aria-hidden="true"><PlaceholderIcon /></span>
          <div><span className={styles.summaryLabel}>Класс заклинателя</span><strong>{spellcasting.className || '—'}</strong></div>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryIcon} aria-hidden="true"><PlaceholderIcon /></span>
          <div><span className={styles.summaryLabel}>Характеристика</span>{onAbilityChange
            ? <select className={styles.abilitySelect} aria-label="Характеристика заклинателя"
              value={spellcasting.abilityKey} onChange={(event) => onAbilityChange(event.target.value as AbilityKey)}>
              {ABILITIES.map(({ key, name }) => <option key={key} value={key}>{name}</option>)}
            </select>
            : <strong>{spellcasting.ability || '—'}</strong>}</div>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryIcon} aria-hidden="true"><PlaceholderIcon /></span>
          <div><span className={styles.summaryLabel}>Сл спасброска</span><strong>{spellcasting.saveDc}</strong></div>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryIcon} aria-hidden="true"><PlaceholderIcon /></span>
          <div><span className={styles.summaryLabel}>Бонус атаки</span><strong>{signedBonus(spellcasting.attackBonus)}</strong></div>
          {onOpenEncyclopedia && <button type="button" className={styles.encyclopediaButton}
            title="Открыть энциклопедию заклинаний" aria-label="Открыть энциклопедию заклинаний"
            onClick={onOpenEncyclopedia}>+</button>}
        </div>
      </div>

      <div className={styles.levelGrid}>
        {LEVELS.map((level) => {
          const levelSpells = spells.filter((spell) => spell.level === level)
          const pool = level === 0 ? null : slots[level]
          const maximum = Math.min(20, Math.max(0, Math.floor(pool?.maximum ?? 0)))
          const used = Math.min(maximum, Math.max(0, Math.floor(pool?.used ?? 0)))
          const available = maximum - used
          return <section
            className={styles.levelCard}
            data-drop-target={dragLevel === level}
            key={level}
            aria-label={LEVEL_NAMES[level]}
            onDragOver={(event) => handleDragOver(event, level)}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragLevel(null)
            }}
            onDrop={(event) => handleDrop(event, level)}
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
                    return <button
                      key={index}
                      type="button"
                      className={styles.slotMark}
                      data-spent={spent}
                      aria-label={`${spent ? 'Восстановить' : 'Израсходовать'} ячейку ${level}-го уровня`}
                      title={spent ? 'Восстановить ячейку' : 'Израсходовать ячейку'}
                      disabled={!onSlotUsedChange}
                      onClick={() => onSlotUsedChange?.(level, used + (spent ? -1 : 1))}
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
            {onSpellDrop && <div className={styles.dropHint} aria-hidden="true">Перетащите заклинание сюда</div>}
          </section>
        })}
      </div>
    </div>
  </div>
}
