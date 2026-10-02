import { useEffect, useState } from 'react'
import { CREATURE_ABILITY_KEYS, CreatureFullView } from '../../../entities/creature'
import type { CreatureEntity } from '../../../entities/creature'
import { Button, TextInput } from '../../../shared/ui'
import { RichContent } from '../../../shared/ui/RichContent'
import { CharacterSheetTool } from '../../character-sheet'
import { loadInstanceStatBlock, statBlockIdentity } from '../model/instanceStatBlock'
import type { InstanceStatBlock } from '../model/instanceStatBlock'
import type { InstanceData } from '../model/table'
import type { LibraryReference } from '../model/library'
import { EntityReferenceLinks } from './EntityReferenceLinks'
import { StatBlockField, StatHtmlField } from './StatBlockFields'
import styles from './CampaignTable.module.css'

const creatureFields = {
  nameEn: '', size: '', creatureType: '', alignment: '', armorClass: { value: '', details: [] }, hitPoints: '', speed: '',
  abilities: Object.fromEntries(CREATURE_ABILITY_KEYS.map(key => [key, { score: null, modifier: null }])),
  savingThrows: Object.fromEntries(CREATURE_ABILITY_KEYS.map(key => [key, ''])), skills: {},
  damageVulnerabilities: [], damageResistances: [], damageImmunities: [], damageAffinities: [], conditionImmunities: [],
  vision: [], senses: [], passivePerception: null, languages: [], challengeRating: '', proficiencyBonus: '', habitat: [], sections: [],
}
const creatureGroups = [
  ['Основное', ['nameEn', 'size', 'creatureType', 'alignment', 'challengeRating', 'proficiencyBonus']],
  ['Боевой паспорт', ['armorClass', 'hitPoints', 'speed', 'vision', 'senses', 'passivePerception']],
  ['Характеристики, спасброски и навыки', ['abilities', 'savingThrows', 'skills']],
  ['Сопротивления, иммунитеты и уязвимости', ['damageVulnerabilities', 'damageResistances', 'damageImmunities', 'damageAffinities', 'conditionImmunities']],
  ['Языки и среда обитания', ['languages', 'habitat']],
  ['Умения, действия и описание', ['sections']],
] as const

export function InstanceStatBlockPanel({ data, editing, readOnly, onChange, onOpen }: {
  data: InstanceData; editing: boolean; readOnly: boolean; onChange: (changes: Partial<InstanceData>) => void
  onOpen: (reference: LibraryReference) => void
}) {
  const [attempt, setAttempt] = useState(0)
  const [initialData] = useState(() => data)
  const hasSavedBlock = Boolean(data.statBlock)
  const [result, setResult] = useState<{ snapshot?: InstanceStatBlock; error?: string } | null>(null)
  useEffect(() => {
    if (hasSavedBlock || readOnly) return
    const controller = new AbortController()
    void loadInstanceStatBlock(initialData, controller.signal).then(snapshot => {
      if (!controller.signal.aborted) setResult({ snapshot })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setResult({ error: error instanceof Error ? error.message : 'Не удалось открыть статблок.' })
    })
    return () => controller.abort()
  }, [initialData, hasSavedBlock, readOnly, attempt])
  const snapshot = data.statBlock ?? result?.snapshot
  const update = (next: InstanceStatBlock) => {
    if (readOnly) return
    const identity = statBlockIdentity(next)
    onChange({ statBlock: structuredClone(next), facts: identity.facts, ...(identity.title.trim() ? { title: identity.title } : {}) })
  }
  if (!snapshot) return <div>{result?.error ? <div role="alert"><p>{result.error}</p><Button size="sm" onClick={() => { setResult(null); setAttempt(value => value + 1) }}>Повторить</Button></div>
    : <p role="status">{readOnly ? 'Статблок не опубликован.' : 'Загрузка статблока…'}</p>}</div>
  if (!editing) {
    if (snapshot.kind === 'creature') return <EntityReferenceLinks readOnly={readOnly} onOpen={onOpen}><CreatureFullView entity={{ ...snapshot.entity, id: data.entityId, name: data.title }} className={styles.fullCard} /></EntityReferenceLinks>
    if (snapshot.kind === 'playerCharacter') return <div className={styles.instanceCharacterSheet}><CharacterSheetTool fitWidth className={styles.instanceCharacterDocument} document={snapshot.document} /></div>
    return <EntityReferenceLinks readOnly={readOnly} onOpen={onOpen}><section><h3 className={styles.inspectorTitle}>{data.title}</h3>
      <dl className={styles.instanceEntryMeta}>{Object.entries(snapshot.entry.data ?? {}).filter(([key, value]) => !key.endsWith('_html') && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')).map(([key, value]) =>
        <div key={key}><dt>{({ level: 'Уровень', school: 'Школа', casting_time: 'Время накладывания', range: 'Дальность', duration: 'Длительность', components: 'Компоненты', rarity: 'Редкость', cost: 'Стоимость', price: 'Стоимость', weight: 'Вес', concentration: 'Концентрация', ritual: 'Ритуал', attunement: 'Настройка', item_type: 'Тип предмета' } as Record<string, string>)[key] ?? key}</dt><dd>{typeof value === 'boolean' ? value ? 'Да' : 'Нет' : String(value)}</dd></div>)}</dl>
      <RichContent html={snapshot.entry.content_html || snapshot.entry.content_text || ''} />
      {Object.entries(snapshot.entry.data ?? {}).filter(([key, value]) => key.endsWith('_html') && key !== 'description_html' && typeof value === 'string').map(([key, value]) =>
        <section key={key}><h4>{({ higher_levels_html: 'На более высоких уровнях', properties_html: 'Свойства', actions_html: 'Действия' } as Record<string, string>)[key] ?? key.replace(/_html$/, '').replace(/_/g, ' ')}</h4><RichContent html={String(value)} /></section>)}
      <details><summary>Все параметры</summary><StatBlockField field="Параметры" value={snapshot.entry.data ?? {}} readOnly onChange={() => {}} /></details></section></EntityReferenceLinks>
  }
  if (snapshot.kind === 'playerCharacter') return <div className={styles.instanceCharacterSheet}>
    <CharacterSheetTool fitWidth className={styles.instanceCharacterDocument} document={snapshot.document} onDocumentChange={document => update({ ...snapshot, document })} />
  </div>
  if (snapshot.kind === 'creature') return <div className={styles.statEditor} aria-label="Полный статблок существа">
    <label className={styles.statField}>Название<TextInput aria-label="Название экземпляра" value={data.title} onChange={event => update({ ...snapshot, entity: { ...snapshot.entity, name: event.target.value } })} /></label>
    {creatureGroups.map(([title, keys], index) => <details key={title} className={styles.statEditorGroup} open={index < 2}><summary>{title}</summary>
      {keys.map(key => <StatBlockField key={key} field={key} value={snapshot.entity[key as keyof CreatureEntity] ?? creatureFields[key]}
        onChange={value => update({ ...snapshot, entity: { ...snapshot.entity, [key]: value } })} />)}
    </details>)}
  </div>
  const entry = snapshot.entry
  const defaults = snapshot.kind === 'spell' ? { level: '', school: '', casting_time: '', range: '', duration: '', components: '', concentration: false, ritual: false }
    : { item_type: '', rarity: '', cost: '', weight: '', attunement: '' }
  return <div className={styles.statEditor} aria-label={snapshot.kind === 'spell' ? 'Полный статблок заклинания' : 'Полная карточка предмета'}>
    <label className={styles.statField}>Название<TextInput aria-label="Название экземпляра" value={data.title} onChange={event => update({ ...snapshot, entry: { ...entry, name: event.target.value } })} /></label>
    <StatBlockField field="name_en" value={entry.name_en} onChange={value => update({ ...snapshot, entry: { ...entry, name_en: String(value) } })} />
    {Object.entries({ ...defaults, ...entry.data }).filter(([key]) => !['tooltips', 'tables', 'sections', 'content_html', 'content_text', 'description_html'].includes(key) && !(key === 'cost' && entry.data?.price != null)).map(([key, value]) =>
      <StatBlockField key={key} field={key} value={value} onChange={next => update({ ...snapshot, entry: { ...entry, data: { ...entry.data, [key]: next } } })} />)}
    <StatHtmlField label="Полное содержимое карточки" value={entry.content_html || entry.content_text || ''} onChange={html => update({ ...snapshot, entry: { ...entry, content_html: html,
      ...(typeof entry.data?.description_html === 'string' ? { data: { ...entry.data, description_html: html } } : {}) } })} />
    {entry.data?.sections != null && <StatBlockField field="sections" value={entry.data.sections} onChange={value => update({ ...snapshot, entry: { ...entry, data: { ...entry.data, sections: value } } })} />}
    {entry.data?.tables != null && <StatBlockField field="Таблицы" value={entry.data.tables} onChange={value => update({ ...snapshot, entry: { ...entry, data: { ...entry.data, tables: value } } })} />}
  </div>
}
