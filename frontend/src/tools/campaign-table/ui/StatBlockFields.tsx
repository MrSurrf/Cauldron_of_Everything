import { useId, useState } from 'react'
import { parseCreatureFeatureDetails } from '../../../entities/creature'
import { Button, Checkbox, IconButton, Select, TextInput } from '../../../shared/ui'
import { ContentEditor } from '../../../shared/ui/ContentEditor'
import { RichContent } from '../../../shared/ui/RichContent'
import styles from './CampaignTable.module.css'
import panelStyles from './CampaignPanels.module.css'

const labels: Record<string, string> = {
  name: 'Название', nameEn: 'Название на английском', name_en: 'Название на английском', size: 'Размер', creatureType: 'Вид существа', creature_type: 'Вид существа', alignment: 'Мировоззрение',
  armorClass: 'Класс доспеха', hitPoints: 'Хиты', speed: 'Скорость', abilities: 'Характеристики', savingThrows: 'Спасброски', skills: 'Навыки',
  damageVulnerabilities: 'Уязвимости', damageResistances: 'Сопротивления', damageImmunities: 'Иммунитеты к урону', damageAffinities: 'Особенности урона', conditionImmunities: 'Иммунитеты к состояниям',
  vision: 'Зрение', senses: 'Другие чувства', passivePerception: 'Пассивная внимательность', languages: 'Языки', challengeRating: 'Показатель опасности', proficiencyBonus: 'Бонус мастерства', habitat: 'Среда обитания',
  sections: 'Разделы статблока', title: 'Заголовок', html: 'Содержимое', introduction: 'Вступление', entries: 'Умения и действия', description: 'Описание',
  strength: 'Сила', dexterity: 'Ловкость', constitution: 'Телосложение', intelligence: 'Интеллект', wisdom: 'Мудрость', charisma: 'Харизма', score: 'Значение', modifier: 'Модификатор',
  value: 'Значение', details: 'Пояснения', type: 'Тип', range: 'Дальность', level: 'Уровень', school: 'Школа', casting_time: 'Время накладывания', duration: 'Длительность', concentration: 'Концентрация', ritual: 'Ритуал', components: 'Компоненты',
  rarity: 'Редкость', cost: 'Стоимость', price: 'Стоимость', weight: 'Вес', attunement: 'Настройка', item_type: 'Тип предмета', classes: 'Классы', subclasses: 'Подклассы',
  physical: 'Физический урон', magical: 'Магический урон', damageType: 'Тип урона', damage: 'Урон', formula: 'Формула', average: 'Среднее', note: 'Примечание',
  subtitle: 'Подзаголовок', usage: 'Использование', attackBonus: 'Бонус атаки', save: 'Спасбросок цели', ability: 'Характеристика', dc: 'Сложность', target: 'Цель', effect: 'Эффект', conditions: 'Состояния', rolls: 'Броски', label: 'Подпись', successAt: 'Порог успеха',
  description_html: 'Описание', higher_levels: 'На более высоких уровнях', higher_levels_html: 'На более высоких уровнях', materials: 'Материальные компоненты',
}
const statFieldLabel = (key: string) => labels[key] ?? key.replace(/_/g, ' ')
const derivedFeatureFields = new Set(['attackBonus', 'save', 'damage', 'range', 'target'])

function richTextMirror(html: string): string {
  const document = new DOMParser().parseFromString(html, 'text/html')
  document.body.querySelectorAll('br').forEach(node => node.replaceWith(' '))
  document.body.querySelectorAll('p, li, td, th, div, blockquote').forEach(node => node.append(' '))
  return (document.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}
const templates: Record<string, unknown> = {
  sections: { id: '', type: 'traits', title: 'Особенности', html: '' },
  entries: { id: '', name: 'Новое умение', description: '' },
  vision: { type: 'darkvision', range: 60 },
  damageAffinities: { damageType: 'fire', physical: 'normal', magical: 'normal' },
  damage: { formula: '', type: 'fire' }, rolls: { label: '', formula: '' },
}
const options: Record<string, string[]> = {
  physical: ['normal', 'vulnerability', 'resistance', 'immunity'], magical: ['normal', 'vulnerability', 'resistance', 'immunity'],
  damageType: ['bludgeoning', 'piercing', 'slashing', 'acid', 'poison', 'cold', 'fire', 'lightning', 'thunder', 'force', 'necrotic', 'psychic', 'radiant'],
}
const optionLabels: Record<string, string> = {
  normal: 'Обычный', vulnerability: 'Уязвимость', resistance: 'Сопротивление', immunity: 'Иммунитет',
  traits: 'Особенности', actions: 'Действия', 'bonus-actions': 'Бонусные действия', reactions: 'Реакции', 'legendary-actions': 'Легендарные действия', 'lair-actions': 'Действия логова', 'regional-effects': 'Региональные эффекты', description: 'Описание', custom: 'Другой раздел',
  bludgeoning: 'Дробящий', piercing: 'Колющий', slashing: 'Рубящий', acid: 'Кислота', poison: 'Яд', cold: 'Холод', fire: 'Огонь', lightning: 'Электричество', thunder: 'Звук', force: 'Силовое поле', necrotic: 'Некротический', psychic: 'Психический', radiant: 'Излучение',
  darkvision: 'Тёмное зрение', blindsight: 'Слепое зрение', truesight: 'Истинное зрение', tremorsense: 'Чувство вибрации', normal_vision: 'Обычное зрение',
}

export function StatHtmlField({ label, value, readOnly, hint, onChange }: { label: string; value: string; readOnly?: boolean; hint?: string; onChange: (value: string) => void }) {
  const hintId = useId()
  return <div className={styles.statField}><span>{label}</span>
    <RichContent html={value} className={`${styles.statHtmlEditor} ${panelStyles.htmlField}`} contentEditable={!readOnly} suppressContentEditableWarning
      role={readOnly ? undefined : 'textbox'} aria-label={label} aria-multiline={!readOnly || undefined}
      aria-describedby={hint ? hintId : undefined}
      onClick={event => { if (!readOnly && (event.target as HTMLElement).closest('a')) event.preventDefault() }}
      onPaste={event => {
        if (readOnly) return
        event.preventDefault()
        const selection = window.getSelection()
        if (!selection?.rangeCount) return
        const range = selection.getRangeAt(0)
        range.deleteContents()
        const text = document.createTextNode(event.clipboardData.getData('text/plain'))
        range.insertNode(text); range.setStartAfter(text); range.collapse(true); selection.removeAllRanges(); selection.addRange(range)
      }} onBlur={event => { if (!readOnly && event.currentTarget.innerHTML !== value) onChange(event.currentTarget.innerHTML.replace(/<div(?:\s[^>]*)?>/gi, '<p>').replace(/<\/div>/gi, '</p>')) }} />
    {hint && <p id={hintId} className={styles.hint}>{hint}</p>}
  </div>
}

export function StatBlockField({ field, value, path = '', readOnly = false, onChange }: {
  field: string; value: unknown; path?: string; readOnly?: boolean; onChange: (value: unknown) => void
}) {
  const [newField, setNewField] = useState('')
  const label = statFieldLabel(field), accessible = path ? `${path}: ${label}` : label
  if (Array.isArray(value)) return <fieldset className={`${styles.statGroup} ${panelStyles.group}`}><legend>{label}</legend>
    {value.map((item, index) => <div key={index} className={`${styles.statArrayRow} ${panelStyles.arrayRow}`}>
      <StatBlockField field={String(index + 1)} value={item} path={accessible} readOnly={readOnly} onChange={next => onChange(value.map((entry, i) => i === index ? next : entry))} />
      {!readOnly && <IconButton size="sm" variant="secondary" decoration="bare" className={panelStyles.remove} aria-label={`Удалить: ${accessible} ${index + 1}`} onClick={() => onChange(value.filter((_, i) => i !== index))}
        icon={<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10 M15 5 5 15" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" /></svg>} />}
    </div>)}
    {!readOnly && <Button size="sm" variant="secondary" decoration="bare" className={panelStyles.action} onClick={() => {
      const item = structuredClone(templates[field] ?? (value.length ? value[value.length - 1] : ''))
      if (item && typeof item === 'object' && 'id' in item) item.id = crypto.randomUUID()
      onChange([...value, item])
    }}>Добавить: {label.toLocaleLowerCase('ru-RU')}</Button>}
  </fieldset>
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const hasRichDescription = typeof record.descriptionHtml === 'string'
    const hasDerivedMechanics = hasRichDescription && Array.from(derivedFeatureFields).some(key => {
      const item = record[key]
      return Array.isArray(item) ? item.length > 0 : typeof item === 'number' || Boolean(item)
    })
    const defaults = field === 'save' ? { ability: 'strength', dc: null }
      : field === 'armorClass' ? { details: [] }
      : /Умения и действия/.test(path) && /^\d+$/.test(field) ? { subtitle: '', usage: '', attackBonus: null, save: { ability: 'strength', dc: null }, damage: [], range: '', target: '', effect: '', conditions: [], rolls: [] } : {}
    return <fieldset className={`${styles.statGroup} ${panelStyles.group}`}><legend>{label}</legend>{Object.entries({ ...defaults, ...record }).filter(([key]) => !['id', 'slug', 'entityType', 'descriptionHtml', 'introductionHtml'].includes(key)
      && !(hasRichDescription && derivedFeatureFields.has(key))
      && !(key === 'html' && Array.isArray(record.entries))).map(([key, item]) => {
      const richKey = key === 'description' ? 'descriptionHtml' : key === 'introduction' ? 'introductionHtml' : undefined
      if (richKey && typeof record[richKey] === 'string') return <StatHtmlField key={key}
        label={`${accessible}: ${statFieldLabel(key)}`} value={record[richKey]} readOnly={readOnly}
        hint={!readOnly && key === 'description' && hasDerivedMechanics ? 'Урон и параметры атаки изменяются в этом тексте.' : undefined}
        onChange={html => {
          const text = richTextMirror(html)
          onChange({ ...record, ...(key === 'description' ? parseCreatureFeatureDetails(text) : {}), [key]: text, [richKey]: html })
        }} />
      return <StatBlockField key={key} field={key} value={item} path={accessible} readOnly={readOnly} onChange={next => {
        const changed = { ...record, [key]: next }
        if (key === 'description') delete changed.descriptionHtml
        if (key === 'introduction') delete changed.introductionHtml
        if (key === 'html') { delete changed.entries; delete changed.introduction; delete changed.introductionHtml }
        onChange(changed)
      }} />})}
      {!readOnly && field === 'skills' && <div className={styles.statArrayRow}>
        <TextInput rootClassName={panelStyles.fieldControl} aria-label="Название навыка" value={newField} onChange={event => setNewField(event.target.value)} />
        <Button size="sm" variant="secondary" decoration="bare" className={panelStyles.action} disabled={!newField.trim() || newField.trim() in record} onClick={() => { onChange({ ...record, [newField.trim()]: '' }); setNewField('') }}>Добавить навык</Button>
      </div>}
    </fieldset>
  }
  if (field === 'html' || field.endsWith('_html')) return <StatHtmlField label={accessible} value={String(value ?? '')} readOnly={readOnly} onChange={onChange} />
  if (typeof value === 'boolean') return <Checkbox label={label} aria-label={accessible} checked={value} disabled={readOnly} onCheckedChange={onChange} />
  if (field === 'description' || field === 'introduction' || (typeof value === 'string' && value.includes('\n'))) return <div className={styles.statField}><span>{label}</span>
    <ContentEditor rootClassName={panelStyles.contentEditor} accessibleLabel={accessible} value={String(value ?? '')} readOnly={readOnly} onValueChange={onChange} rows={3} renderPreview />
  </div>
  const choices = options[field] ?? (field === 'type' && /Зрение/.test(path) ? ['normal', 'darkvision', 'blindsight', 'truesight', 'tremorsense']
    : field === 'type' && /Урон/.test(path) ? options.damageType
    : field === 'type' && /Разделы статблока/.test(path) ? ['traits', 'actions', 'bonus-actions', 'reactions', 'legendary-actions', 'lair-actions', 'regional-effects', 'description', 'custom']
    : field === 'ability' ? ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] : undefined)
  if (choices) return <div className={styles.statField}><span>{label}</span><Select aria-label={accessible} value={String(value ?? '')} readOnly={readOnly}
    options={[{ value: '', label: 'Не указано' }, ...choices.map(option => ({ value: option, label: optionLabels[option] ?? labels[option] ?? option })),
      ...(value && !choices.includes(String(value)) ? [{ value: String(value), label: String(value) }] : [])]}
    onValueChange={onChange} />
  </div>
  if (typeof value === 'number' || value === null) return <label className={styles.statField}>{label}<input className={styles.statNumber} aria-label={accessible} type="number" value={value == null ? '' : value} readOnly={readOnly}
    onChange={event => { const number = event.target.valueAsNumber; onChange(Number.isFinite(number) ? number : undefined) }} /></label>
  return <label className={styles.statField}>{label}<TextInput rootClassName={panelStyles.fieldControl} aria-label={accessible} value={value == null ? '' : String(value)} readOnly={readOnly} onChange={event => onChange(event.target.value)} /></label>
}
