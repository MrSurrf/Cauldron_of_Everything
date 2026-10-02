import { useState } from 'react'
import { Button, Checkbox, TextInput } from '../../../shared/ui'
import { ContentEditor } from '../../../shared/ui/ContentEditor'
import { RichContent } from '../../../shared/ui/RichContent'
import styles from './CampaignTable.module.css'

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

export function StatHtmlField({ label, value, readOnly, onChange }: { label: string; value: string; readOnly?: boolean; onChange: (value: string) => void }) {
  return <div className={styles.statField}><span>{label}</span>
    <RichContent html={value} className={styles.statHtmlEditor} contentEditable={!readOnly} suppressContentEditableWarning
      role={readOnly ? undefined : 'textbox'} aria-label={label} aria-multiline={!readOnly || undefined}
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
  </div>
}

export function StatBlockField({ field, value, path = '', readOnly = false, onChange }: {
  field: string; value: unknown; path?: string; readOnly?: boolean; onChange: (value: unknown) => void
}) {
  const [newField, setNewField] = useState('')
  const label = statFieldLabel(field), accessible = path ? `${path}: ${label}` : label
  if (Array.isArray(value)) return <fieldset className={styles.statGroup}><legend>{label}</legend>
    {value.map((item, index) => <div key={index} className={styles.statArrayRow}>
      <StatBlockField field={String(index + 1)} value={item} path={accessible} readOnly={readOnly} onChange={next => onChange(value.map((entry, i) => i === index ? next : entry))} />
      {!readOnly && <Button size="sm" variant="secondary" aria-label={`Удалить: ${accessible} ${index + 1}`} onClick={() => onChange(value.filter((_, i) => i !== index))}>×</Button>}
    </div>)}
    {!readOnly && <Button size="sm" variant="secondary" onClick={() => {
      const item = structuredClone(templates[field] ?? (value.length ? value[value.length - 1] : ''))
      if (item && typeof item === 'object' && 'id' in item) item.id = crypto.randomUUID()
      onChange([...value, item])
    }}>Добавить: {label.toLocaleLowerCase('ru-RU')}</Button>}
  </fieldset>
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const defaults = field === 'save' ? { ability: 'strength', dc: null }
      : field === 'armorClass' ? { details: [] }
      : /Умения и действия/.test(path) && /^\d+$/.test(field) ? { subtitle: '', usage: '', attackBonus: null, save: { ability: 'strength', dc: null }, damage: [], range: '', target: '', effect: '', conditions: [], rolls: [] } : {}
    return <fieldset className={styles.statGroup}><legend>{label}</legend>{Object.entries({ ...defaults, ...record }).filter(([key]) => !['id', 'slug', 'entityType'].includes(key)).map(([key, item]) =>
      <StatBlockField key={key} field={key} value={item} path={accessible} readOnly={readOnly} onChange={next => {
        const changed = { ...record, [key]: next }
        if (key === 'html') { delete changed.entries; delete changed.introduction }
        onChange(changed)
      }} />)}
      {!readOnly && field === 'skills' && <div className={styles.statArrayRow}>
        <TextInput aria-label="Название навыка" value={newField} onChange={event => setNewField(event.target.value)} />
        <Button size="sm" disabled={!newField.trim() || newField.trim() in record} onClick={() => { onChange({ ...record, [newField.trim()]: '' }); setNewField('') }}>Добавить навык</Button>
      </div>}
    </fieldset>
  }
  if (field === 'html' || field.endsWith('_html') || (field === 'description' && /Умения и действия/.test(path))) return <StatHtmlField label={accessible} value={String(value ?? '')} readOnly={readOnly} onChange={onChange} />
  if (typeof value === 'boolean') return <Checkbox label={label} aria-label={accessible} checked={value} disabled={readOnly} onCheckedChange={onChange} />
  if (field === 'description' || field === 'introduction' || (typeof value === 'string' && value.includes('\n'))) return <div className={styles.statField}><span>{label}</span>
    <ContentEditor accessibleLabel={accessible} value={String(value ?? '')} readOnly={readOnly} onValueChange={onChange} rows={3} renderPreview />
  </div>
  const choices = options[field] ?? (field === 'type' && /Зрение/.test(path) ? ['normal', 'darkvision', 'blindsight', 'truesight', 'tremorsense']
    : field === 'type' && /Урон/.test(path) ? options.damageType
    : field === 'type' && /Разделы статблока/.test(path) ? ['traits', 'actions', 'bonus-actions', 'reactions', 'legendary-actions', 'lair-actions', 'regional-effects', 'description', 'custom']
    : field === 'ability' ? ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] : undefined)
  if (choices) return <label className={styles.statField}>{label}<select aria-label={accessible} value={String(value ?? '')} disabled={readOnly} onChange={event => onChange(event.target.value)}>
    <option value="">Не указано</option>{choices.map(option => <option key={option} value={option}>{optionLabels[option] ?? labels[option] ?? option}</option>)}
  </select></label>
  if (typeof value === 'number' || value === null) return <label className={styles.statField}>{label}<input className={styles.statNumber} aria-label={accessible} type="number" value={value == null ? '' : value} readOnly={readOnly}
    onChange={event => { const number = event.target.valueAsNumber; onChange(Number.isFinite(number) ? number : undefined) }} /></label>
  return <label className={styles.statField}>{label}<TextInput aria-label={accessible} value={value == null ? '' : String(value)} readOnly={readOnly} onChange={event => onChange(event.target.value)} /></label>
}
