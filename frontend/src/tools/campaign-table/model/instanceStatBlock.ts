import { getCreatureById } from '../../../entities/creature'
import type { CreatureEntity } from '../../../entities/creature'
import { fetchEncyclopedia } from '../../../entities/encyclopedia'
import type { EncyclopediaEntry } from '../../../entities/encyclopedia'
import { createEmptyCharacterSheet } from '../../character-sheet'
import type { CharacterSheetDocument } from '../../character-sheet'
import { campaignRequest } from './campaignApi'
import type { OwnedMaterial } from './campaignApi'
import type { InstanceData } from './table'

export type InstanceStatBlock =
  | { kind: 'creature'; entity: CreatureEntity }
  | { kind: 'spell' | 'item'; entry: EncyclopediaEntry }
  | { kind: 'playerCharacter'; document: CharacterSheetDocument }
export const hasInstanceEditor = (type: string) => ['creature', 'spell', 'item', 'playerCharacter'].includes(type)

function entryBody(entry: EncyclopediaEntry) {
  if (typeof entry.data?.description_html === 'string') return entry.data.description_html
  if (!entry.content_html || typeof DOMParser === 'undefined') return entry.content_html
  const document = new DOMParser().parseFromString(entry.content_html, 'text/html')
  const fields: Record<string, string[]> = {
    level: ['Уровень'], school: ['Школа'], casting_time: ['Время накладывания', 'Время накладывания заклинания'], range: ['Дистанция', 'Дальность'],
    duration: ['Длительность'], components: ['Компоненты'], rarity: ['Редкость'], cost: ['Стоимость', 'Цена'], price: ['Стоимость', 'Цена'], weight: ['Вес'], attunement: ['Настройка'],
  }
  const represented = Object.keys(entry.data ?? {}).flatMap(key => fields[key] ?? []).map(label => `${label.toLocaleLowerCase('ru-RU')}:`)
  for (const heading of document.querySelectorAll('h1,h2,h3')) {
    if ([entry.name, entry.name_en].includes(heading.textContent?.trim() ?? '')) heading.remove()
  }
  for (const line of document.querySelectorAll('li,p')) {
    const text = line.textContent?.replace(/\s+/g, ' ').trim().toLocaleLowerCase('ru-RU') ?? ''
    if (represented.some(label => text.startsWith(label))) line.remove()
  }
  return document.body.innerHTML
}

export async function loadInstanceStatBlock(data: InstanceData, signal: AbortSignal): Promise<InstanceStatBlock> {
  if (data.statBlock) return structuredClone(data.statBlock)
  const ref = data.reference
  if (data.entityType === 'creature') {
    const entity = ref?.source === 'encyclopedia' ? await getCreatureById(ref.entityId, signal) : undefined
    if (ref && !entity) throw new Error('Существо недоступно.')
    return { kind: 'creature', entity: entity ? { ...structuredClone(entity), id: data.entityId, name: data.title }
      : { id: data.entityId, slug: data.entityId, entityType: 'creature', name: data.title, sections: [] } }
  }
  if (data.entityType === 'spell' || data.entityType === 'item') {
    const entry = ref?.source === 'encyclopedia'
      ? await fetchEncyclopedia<EncyclopediaEntry>(`${encodeURIComponent(ref.entityId)}/`, signal)
      : { id: 0, slug: data.entityId, name: data.title, name_en: '', entity_type: data.entityType, data: {}, content_html: data.description }
    if (entry.entity_type !== data.entityType) throw new Error('Тип исходной карточки не соответствует экземпляру.')
    return { kind: data.entityType, entry: { ...structuredClone(entry), name: data.title, content_html: entryBody(entry) } }
  }
  if (data.entityType === 'playerCharacter') {
    const material = ref?.source === 'character'
      ? await campaignRequest<OwnedMaterial>(`characters/${encodeURIComponent(ref.entityId)}/`, signal) : undefined
    if (material?.document && !validStatBlock({ kind: 'playerCharacter', document: material.document }, 'playerCharacter')) throw new Error('Исходный лист персонажа имеет неподдерживаемый формат.')
    const document = material?.document ? structuredClone(material.document) : createEmptyCharacterSheet()
    document.id = data.entityId
    document.identity.name = data.title
    if (!material?.document && material?.description) document.customSections.push({
      id: crypto.randomUUID(), kind: 'text', title: 'Описание', expanded: true, removable: true, fieldIds: [], text: material.description,
    })
    return { kind: 'playerCharacter', document }
  }
  throw new Error('Для этого типа редактор статблока пока не предусмотрен.')
}

export function statBlockIdentity(snapshot: InstanceStatBlock) {
  if (snapshot.kind === 'creature') {
    const entity = snapshot.entity
    return { title: entity.name, facts: [entity.challengeRating && `ПО ${entity.challengeRating}`, entity.creatureType, entity.size].filter(Boolean).join(' · ') }
  }
  if (snapshot.kind === 'playerCharacter') {
    const identity = snapshot.document.identity
    return { title: identity.name, facts: [identity.className, identity.level.manualValue != null && `Ур. ${identity.level.manualValue}`].filter(Boolean).join(' · ') }
  }
  const data = snapshot.entry.data ?? {}
  return { title: snapshot.entry.name, facts: (snapshot.kind === 'spell' ? [data.level != null && `Уровень ${data.level}`, data.school]
    : [data.rarity, data.cost ?? data.price]).filter(value => typeof value === 'string' || typeof value === 'number').join(' · ') }
}

export function validStatBlock(value: unknown, entityType: string): value is InstanceStatBlock {
  if (!value || typeof value !== 'object') return false
  const block = value as Partial<InstanceStatBlock>
  if (block.kind !== entityType) return false
  if (block.kind === 'creature' && 'entity' in block) {
    const entity = block.entity
    return Boolean(entity && entity.entityType === 'creature' && typeof entity.name === 'string' && Array.isArray(entity.sections)
      && entity.sections.every(section => section && typeof section.id === 'string' && typeof section.title === 'string' && typeof section.html === 'string')
      && (!entity.armorClass || typeof entity.armorClass === 'object')
      && (!entity.abilities || typeof entity.abilities === 'object')
      && (!entity.vision || (Array.isArray(entity.vision) && entity.vision.every(sense => sense && ['normal', 'darkvision', 'blindsight', 'truesight', 'tremorsense'].includes(sense.type)))))
  }
  if ((block.kind === 'item' || block.kind === 'spell') && 'entry' in block) {
    const entry = block.entry
    return Boolean(entry && entry.entity_type === block.kind && typeof entry.name === 'string'
      && (entry.content_html === undefined || typeof entry.content_html === 'string')
      && (!entry.data || (typeof entry.data === 'object' && !Array.isArray(entry.data))))
  }
  if (block.kind === 'playerCharacter' && 'document' in block) {
    const doc = block.document
    return Boolean(doc && doc.schemaVersion === 1 && doc.identity && typeof doc.identity.name === 'string'
      && doc.abilities && doc.hitPoints && doc.derivedStats && doc.savingThrows && doc.skills && doc.proficiencies && doc.currency && doc.appearance && doc.view
      && Array.isArray(doc.resources) && Array.isArray(doc.attacks) && Array.isArray(doc.vision) && Array.isArray(doc.hitDice)
      && Array.isArray(doc.features) && Array.isArray(doc.customSections))
  }
  return false
}
