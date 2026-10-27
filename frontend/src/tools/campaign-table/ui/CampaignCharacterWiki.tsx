import { useMemo } from 'react'
import { Button, Checkbox, useCampaignWikiImage } from '../../../shared/ui'
import {
  itemFromBlock,
  itemToSource,
  parseContentSource,
} from '../../../shared/ui/ContentEditor'
import {
  ABILITY_KEYS,
  attackBonusFormulaVariable,
  characterSheetActions,
  characterSheetReducer,
  currencyFormulaVariable,
  featureUseFormulaVariable,
  FORMULA_FIELD_KEYS,
  formatSignedValue,
  getEffectiveSpellSlots,
  hitDieFormulaVariable,
  manualNumericField,
  resourceFormulaVariable,
  selectAbilityModifier,
  selectAbilityScore,
  selectFormulaEvaluation,
  selectFormulaResult,
  selectNumericDisplayValue,
  selectSavingThrow,
  selectSkillValue,
} from '../../character-sheet'
import type {
  CharacterSheetDocument,
  CustomField,
  NumericFieldState,
  SpellSlotLevel,
} from '../../character-sheet'
import { ContentEditor } from '../../../shared/ui/ContentEditor'
import styles from './CampaignCharacterWiki.module.css'

const abilityLabels = {
  strength: 'СИЛ', dexterity: 'ЛОВ', constitution: 'ТЕЛ',
  intelligence: 'ИНТ', wisdom: 'МДР', charisma: 'ХАР',
} as const

const personalityLabels = {
  traits: 'Черты характера', ideals: 'Идеалы', bonds: 'Привязанности', flaws: 'Слабости',
} as const

const currencyLabels = { cp: 'мм', sp: 'см', ep: 'эм', gp: 'зм', pp: 'пм' } as const

function displayNumeric(field: NumericFieldState, evaluation: ReturnType<typeof selectFormulaEvaluation>, key: string) {
  return selectNumericDisplayValue(field, selectFormulaResult(evaluation, key))
}

function display(value: number | null | undefined) {
  return value == null ? '—' : String(value)
}

function textFromCustomField(field: CustomField, evaluation: ReturnType<typeof selectFormulaEvaluation>) {
  if (field.kind === 'text') return field.value
  if (field.kind === 'number' || field.kind === 'computed') return displayNumeric(field.value, evaluation, field.variableKey) ?? '—'
  if (field.kind === 'list') return field.items.map(item => item.value).filter(Boolean).join(' · ')
  return field.rows.map(row => field.columns.map(column => row.cells[column.id]).filter(Boolean).join(' · ')).filter(Boolean).join('\n')
}

function ReadContent({ value, label }: { value: string; label: string }) {
  if (!value.trim()) return <span className={styles.empty}>Нет сведений</span>
  return <ContentEditor accessibleLabel={label} value={value} onValueChange={() => {}} readOnly renderPreview autoGrow />
}

function Stepper({ label, value, maximum, disabled, onChange }: {
  label: string; value: number | null; maximum?: number | null; disabled?: boolean; onChange: (value: number) => void
}) {
  const current = value ?? 0
  return <div className={styles.stepper} aria-label={label}>
    <button type="button" disabled={disabled || current <= 0} aria-label={`${label}: уменьшить`} onClick={() => onChange(Math.max(0, current - 1))}>−</button>
    <output aria-label={`${label}: текущее значение`}>{display(value)}{maximum != null ? <small> / {maximum}</small> : null}</output>
    <button type="button" disabled={disabled || (maximum != null && current >= maximum)} aria-label={`${label}: увеличить`}
      onClick={() => onChange(maximum == null ? current + 1 : Math.min(maximum, current + 1))}>+</button>
  </div>
}

function replaceItem(source: string, index: number, update: (value: ReturnType<typeof itemFromBlock>) => ReturnType<typeof itemFromBlock>) {
  const block = parseContentSource(source).filter(item => item.kind === 'item')[index]
  if (!block || block.kind !== 'item') return source
  return `${source.slice(0, block.sourceRange.start)}${itemToSource(update(itemFromBlock(block)), block.attributes)}${source.slice(block.sourceRange.end)}`
}

function removeItem(source: string, index: number) {
  const block = parseContentSource(source).filter(item => item.kind === 'item')[index]
  if (!block) return source
  return `${source.slice(0, block.sourceRange.start)}${source.slice(block.sourceRange.end)}`.replace(/\n{3,}/g, '\n\n').trim()
}

export function CampaignCharacterWiki({ document, avatarAssetId, readOnly, onChange, onOpenFull }: {
  document: CharacterSheetDocument
  avatarAssetId?: string
  readOnly: boolean
  onChange: (document: CharacterSheetDocument) => void
  onOpenFull: () => void
}) {
  const evaluation = useMemo(() => selectFormulaEvaluation(document), [document])
  const avatar = useCampaignWikiImage(avatarAssetId)
  const update = (action: Parameters<typeof characterSheetReducer>[1]) => onChange(characterSheetReducer(document, action))
  const number = (field: NumericFieldState, key: string) => displayNumeric(field, evaluation, key)
  const hp = {
    current: number(document.hitPoints.current, FORMULA_FIELD_KEYS.currentHitPoints),
    maximum: number(document.hitPoints.maximum, FORMULA_FIELD_KEYS.maximumHitPoints),
    temporary: number(document.hitPoints.temporary, FORMULA_FIELD_KEYS.temporaryHitPoints),
  }
  const equipmentBlocks = parseContentSource(document.equipmentContentText ?? '').filter(block => block.kind === 'item')
  const spellcasting = document.spellcasting
  const spellSlots = getEffectiveSpellSlots(document)

  function setHitPoints(kind: 'current' | 'temporary', value: number) {
    update(characterSheetActions.setNumericField({ kind: 'hitPoints', field: kind }, manualNumericField(value)))
  }

  function applyDamage(amount: number) {
    if (readOnly || amount <= 0) return
    const temporary = Math.max(0, hp.temporary ?? 0)
    const absorbed = Math.min(temporary, amount)
    let next = characterSheetReducer(document, characterSheetActions.setNumericField(
      { kind: 'hitPoints', field: 'temporary' }, manualNumericField(temporary - absorbed),
    ))
    next = characterSheetReducer(next, characterSheetActions.setNumericField(
      { kind: 'hitPoints', field: 'current' }, manualNumericField(Math.max(0, (hp.current ?? 0) - (amount - absorbed))),
    ))
    onChange(next)
  }

  function heal(amount: number) {
    if (readOnly || amount <= 0) return
    setHitPoints('current', Math.min(hp.maximum ?? Number.POSITIVE_INFINITY, (hp.current ?? 0) + amount))
  }

  return <div className={styles.page} data-campaign-character-wiki>
    <header className={styles.hero}>
      {avatar.src || document.identity.portraitUrl
        ? <img src={avatar.src ?? document.identity.portraitUrl ?? undefined} alt="" className={styles.portrait} />
        : <div className={styles.portraitPlaceholder} aria-hidden="true">◇</div>}
      <div className={styles.identity}>
        <h2>{document.identity.name || 'Безымянный персонаж'}</h2>
        <p>{[
          document.identity.race,
          [document.identity.className, document.identity.subclass].filter(Boolean).join(' · '),
          number(document.identity.level, FORMULA_FIELD_KEYS.level) != null && `уровень ${number(document.identity.level, FORMULA_FIELD_KEYS.level)}`,
        ].filter(Boolean).join(' · ') || 'Сведения о персонаже не заполнены'}</p>
      </div>
      <Button size="sm" variant="secondary" decoration="minimal" onClick={onOpenFull}>Открыть полный лист</Button>
    </header>

    <section className={styles.summary} aria-label="Ключевые показатели">
      {[
        ['КД', number(document.derivedStats.armorClass, FORMULA_FIELD_KEYS.armorClass)],
        ['Инициатива', number(document.derivedStats.initiative, FORMULA_FIELD_KEYS.initiative)],
        ['Скорость', number(document.derivedStats.speed, FORMULA_FIELD_KEYS.speed)],
        ['Пасс. восприятие', number(document.derivedStats.passivePerception, FORMULA_FIELD_KEYS.passivePerception)],
        ['Бонус мастерства', number(document.proficiencyBonus, FORMULA_FIELD_KEYS.proficiency)],
        ['Опыт', number(document.identity.experience, FORMULA_FIELD_KEYS.experience)],
      ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{display(value as number | null)}</strong></div>)}
    </section>

    <section className={styles.section}>
      <div className={styles.sectionHeading}><h3>О персонаже</h3></div>
      <div className={styles.proficiencies}>
        <div><span>Предыстория</span><strong>{document.identity.background || '—'}</strong></div>
        <div><span>Мировоззрение</span><strong>{document.identity.alignment || '—'}</strong></div>
        <div><span>Игрок</span><strong>{document.identity.playerName || '—'}</strong></div>
        <div><span>Система</span><strong>{document.rulesetId === 'dnd5e-2024' ? 'D&D 5e · 2024' : 'D&D 5e · 2014'}</strong></div>
      </div>
      {!readOnly && <Checkbox rootClassName={styles.inspiration} label="Вдохновение" checked={document.inspiration}
        onCheckedChange={checked => update(characterSheetActions.setInspiration(checked))} />}
      {readOnly && document.inspiration && <span className={styles.badge}>Вдохновение</span>}
    </section>

    <section className={styles.section}>
      <div className={styles.sectionHeading}><h3>Здоровье и состояние</h3></div>
      <div className={styles.healthRow}>
        <div><span>Хиты</span><strong>{display(hp.current)} / {display(hp.maximum)}</strong>{hp.temporary ? <small>+{hp.temporary} временных</small> : null}</div>
        {!readOnly && <div className={styles.healthActions}>
          <button type="button" onClick={() => applyDamage(1)}>−1 урон</button>
          <button type="button" onClick={() => heal(1)}>+1 лечение</button>
          <button type="button" onClick={() => setHitPoints('temporary', Math.max(0, (hp.temporary ?? 0) + 1))}>+1 временные</button>
        </div>}
      </div>
      {document.resources.length > 0 && <div className={styles.resourceGrid}>{document.resources.map(resource => {
        const current = number(resource.current, resourceFormulaVariable(resource.id, 'current'))
        const maximum = number(resource.maximum, resourceFormulaVariable(resource.id, 'maximum'))
        return <div key={resource.id} className={styles.resource}><span>{resource.label}</span><Stepper label={resource.label} value={current} maximum={maximum} disabled={readOnly}
          onChange={value => update(characterSheetActions.setNumericField({ kind: 'resource', resourceId: resource.id, field: 'current' }, manualNumericField(value)))} /></div>
      })}</div>}
      {document.hitDice.length > 0 && <div className={styles.resourceGrid}>{document.hitDice.map(pool => {
        const current = number(pool.current, hitDieFormulaVariable(pool.id, 'current'))
        const maximum = number(pool.maximum, hitDieFormulaVariable(pool.id, 'maximum'))
        return <div key={pool.id} className={styles.resource}><span>Кости хитов {pool.die}</span>
          <Stepper label={`Кости хитов ${pool.die}`} value={current} maximum={maximum} disabled={readOnly}
            onChange={value => update(characterSheetActions.setNumericField({ kind: 'hitDice', poolId: pool.id, field: 'current' }, manualNumericField(value)))} /></div>
      })}</div>}
      <div className={styles.subtleLine}>Спасброски от смерти: {document.deathSaves.successes} успеха · {document.deathSaves.failures} провала</div>
    </section>

    <details className={styles.section} open>
      <summary>Характеристики и проверки</summary>
      <div className={styles.abilityGrid}>{ABILITY_KEYS.map(ability => <div key={ability}>
        <span>{abilityLabels[ability]}</span>
        <strong>{display(selectAbilityScore(evaluation, ability))}</strong>
        <small>{formatSignedValue(selectAbilityModifier(evaluation, ability))}</small>
        <em>спас. {formatSignedValue(selectSavingThrow(evaluation, ability))}</em>
      </div>)}</div>
      <div className={styles.skillList}>{Object.values(document.skills).map(skill => <div key={skill.id}>
        <span>{skill.label}</span><strong>{formatSignedValue(selectSkillValue(document, evaluation, skill.id))}</strong>
      </div>)}</div>
    </details>

    <details className={styles.section} open>
      <summary>Атаки и действия</summary>
      {document.attacks.length > 0 ? <div className={styles.table}>{document.attacks.map(attack => <div key={attack.id}>
        <strong>{attack.name || 'Атака'}</strong><span>{formatSignedValue(number(attack.attackBonus, attackBonusFormulaVariable(attack.id)))}</span>
        <span>{[attack.damage, attack.damageType].filter(Boolean).join(' ') || '—'}</span>{attack.notes && <small>{attack.notes}</small>}
      </div>)}</div> : null}
      {document.attacksContentText?.trim() && <ReadContent label="Дополнительные сведения об атаках" value={document.attacksContentText} />}
      {!document.attacks.length && !document.attacksContentText?.trim() && <span className={styles.empty}>Атаки не добавлены</span>}
    </details>

    <details className={styles.section} open>
      <summary>Снаряжение и деньги</summary>
      <div className={styles.currency}>{Object.entries(document.currency).map(([key, field]) => <span key={key}><strong>{display(number(field, currencyFormulaVariable(key)))}</strong> {currencyLabels[key as keyof typeof currencyLabels]}</span>)}</div>
      <div className={styles.subtleLine}>Вес: {display(number(document.derivedStats.carriedWeight, FORMULA_FIELD_KEYS.carriedWeight))} / {display(number(document.derivedStats.carryingCapacity, FORMULA_FIELD_KEYS.carryingCapacity))}</div>
      <div className={styles.inventory} data-campaign-character-drop="item">
        {equipmentBlocks.length === 0 && <p className={styles.dropEmpty}>Перетащите сюда предмет с карты или из энциклопедии.</p>}
        {equipmentBlocks.map((block, index) => {
          if (block.kind !== 'item') return null
          const item = itemFromBlock(block)
          const quantity = Math.max(1, Number.parseInt(item.quantity, 10) || 1)
          return <article key={`${block.sourceRange.start}-${item.title}`} className={styles.inventoryItem}>
            <div><strong>{item.title || 'Предмет'}</strong>{item.description && <small>{item.description}</small>}</div>
            <Stepper label={`Количество: ${item.title || 'предмет'}`} value={quantity} disabled={readOnly}
              onChange={next => update(characterSheetActions.setEquipmentContentText(replaceItem(document.equipmentContentText, index, value => ({ ...value, quantity: String(Math.max(1, next)) }))))} />
            {!readOnly && <div className={styles.itemFlags}>
              <Checkbox label="Надето" checked={item.equipped} onCheckedChange={checked => update(characterSheetActions.setEquipmentContentText(replaceItem(document.equipmentContentText, index, value => ({ ...value, equipped: checked }))))} />
              <Checkbox label="Настроено" checked={item.attuned} onCheckedChange={checked => update(characterSheetActions.setEquipmentContentText(replaceItem(document.equipmentContentText, index, value => ({ ...value, attuned: checked }))))} />
              <button type="button" onClick={() => update(characterSheetActions.setEquipmentContentText(removeItem(document.equipmentContentText, index)))}>Убрать</button>
            </div>}
          </article>
        })}
      </div>
    </details>

    <details className={styles.section} open={Boolean(spellcasting?.spells.length)}>
      <summary>Заклинания</summary>
      {spellcasting && <div className={styles.proficiencies}>
        <div><span>Класс заклинателя</span><strong>{spellcasting.className || '—'}</strong></div>
        <div><span>Базовая характеристика</span><strong>{abilityLabels[spellcasting.ability]}</strong></div>
        <div><span>Сл спасброска</span><strong>{display(number(spellcasting.saveDc, FORMULA_FIELD_KEYS.spellSaveDc))}</strong></div>
        <div><span>Бонус атаки</span><strong>{formatSignedValue(number(spellcasting.attackBonus, FORMULA_FIELD_KEYS.spellAttackBonus))}</strong></div>
      </div>}
      <div className={styles.spellSlots}>{(Object.keys(spellSlots).map(Number) as SpellSlotLevel[]).map(level => {
        const slot = spellSlots[level]
        if (!slot.maximum) return null
        return <div key={level}><span>Ячейки {level} ур.</span><Stepper label={`Ячейки ${level} уровня`} value={slot.maximum - slot.used} maximum={slot.maximum} disabled={readOnly}
          onChange={remaining => update(characterSheetActions.setSpellSlotUsed(level, slot.maximum - remaining))} /></div>
      })}</div>
      <div className={styles.spells} data-campaign-character-drop="spell">
        {!spellcasting?.spells.length && <p className={styles.dropEmpty}>Перетащите сюда заклинание из энциклопедии.</p>}
        {spellcasting?.spells.map(spell => <article key={spell.id}>
          <div><strong>{spell.name}</strong><small>{[
            spell.level === 0 ? 'Заговор' : `${spell.level} уровень`, spell.school, spell.castingTime, spell.range, spell.duration,
            Array.isArray(spell.components) ? spell.components.join(', ') : spell.components,
            spell.concentration ? 'Концентрация' : '', spell.ritual ? 'Ритуал' : '', spell.source,
          ].filter(Boolean).join(' · ')}</small></div>
          <div className={styles.spellActions}>
            {!readOnly && spell.level > 0 && !spell.alwaysPrepared
              ? <Checkbox label="Подготовлено" checked={spell.prepared} onCheckedChange={checked => update(characterSheetActions.setSpellPrepared(spell.id, checked))} />
              : spell.prepared && <span className={styles.badge}>Подготовлено</span>}
            {spellcasting.concentratingOnId === spell.id && <span className={styles.badge}>Концентрация</span>}
            {!readOnly && <button type="button" onClick={() => update(characterSheetActions.removeSpell(spell.id))}>Убрать</button>}
          </div>
          {(spell.description || spell.notes) && <p>{[spell.description, spell.notes].filter(Boolean).join('\n')}</p>}
        </article>)}
      </div>
    </details>

    <details className={styles.section}>
      <summary>Особенности и умения</summary>
      <div className={styles.features}>{document.features.map(feature => <article key={feature.id}>
        <h4>{feature.title}</h4>
        {feature.uses && <div className={styles.featureUses}><Stepper label={`Использования: ${feature.title}`}
          value={number(feature.uses.current, featureUseFormulaVariable(feature.id, 'current'))}
          maximum={number(feature.uses.maximum, featureUseFormulaVariable(feature.id, 'maximum'))} disabled={readOnly}
          onChange={value => update(characterSheetActions.setNumericField({ kind: 'featureUse', featureId: feature.id, field: 'current' }, manualNumericField(value)))} />
          {feature.recoveryLabel && <small>{feature.recoveryLabel}</small>}</div>}
        {feature.description && <ReadContent label={`Описание: ${feature.title}`} value={feature.description} />}
      </article>)}</div>
      {document.features.length === 0 && <span className={styles.empty}>Особенности не добавлены</span>}
    </details>

    <details className={styles.section}>
      <summary>Личность и история</summary>
      <div className={styles.personality}>{Object.entries(document.personality).map(([key, entries]) => <section key={key}>
        <h4>{personalityLabels[key as keyof typeof personalityLabels]}</h4>
        {entries.length ? entries.map(entry => <div key={entry.id}><strong>{entry.title}</strong><ReadContent label={entry.title || personalityLabels[key as keyof typeof personalityLabels]} value={entry.text} /></div>) : <span className={styles.empty}>Нет сведений</span>}
      </section>)}</div>
    </details>

    {document.customSections.length > 0 && <details className={styles.section}>
      <summary>Дополнительные сведения</summary>
      <div className={styles.features}>{document.customSections.map(section => <article key={section.id}>
        <h4>{section.title || 'Раздел'}</h4>{section.text && <ReadContent label={section.title || 'Дополнительный раздел'} value={section.text} />}
        {section.fieldIds.map(fieldId => document.customFields[fieldId]).filter(Boolean).map(field => <div key={field.id} className={styles.customField}><span>{field.label}</span><strong>{textFromCustomField(field, evaluation)}</strong></div>)}
      </article>)}</div>
    </details>}

    <details className={styles.section}>
      <summary>Владения и чувства</summary>
      <div className={styles.proficiencies}>
        <div><span>Языки</span><strong>{document.proficiencies.languages.join(', ') || '—'}</strong></div>
        <div><span>Доспехи</span><strong>{document.proficiencies.armor.join(', ') || '—'}</strong></div>
        <div><span>Оружие</span><strong>{document.proficiencies.weapons.join(', ') || '—'}</strong></div>
        <div><span>Инструменты</span><strong>{document.proficiencies.tools.join(', ') || '—'}</strong></div>
        <div><span>Зрение</span><strong>{document.vision.map(sense => `${sense.type}${sense.range ? ` ${sense.range}` : ''}`).join(', ') || '—'}</strong></div>
      </div>
      {(document.proficiencies.contentText || document.proficiencies.notes) && <ReadContent label="Дополнительные владения"
        value={document.proficiencies.contentText || document.proficiencies.notes} />}
    </details>
  </div>
}
