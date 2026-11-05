import { createEmptyCharacterSheet } from '../../character-sheet'
import type { CharacterSheetDocument } from '../../character-sheet'
import { campaignRequest } from './campaignApi'
import type { OwnedMaterial } from './campaignApi'
import type { InstanceData } from './table'

/**
 * Кампанийная версия листа. Она всегда хранит собственную копию документа;
 * sourceCharacterId нужен лишь для перехода к исходному персонажу.
 */
export type CampaignCharacter = {
  sourceCharacterId?: string
  document: CharacterSheetDocument
}

export type CampaignCharacterOptions = {
  entityId: string
  name: string
  sourceCharacterId?: string
  document?: CharacterSheetDocument
  description?: string
}

/** Создаёт независимую кампанийную копию и никогда не меняет исходный лист. */
export function createCampaignCharacter(options: CampaignCharacterOptions): CampaignCharacter {
  const document = options.document
    ? structuredClone(options.document)
    : createEmptyCharacterSheet({ id: options.entityId })
  document.id = options.entityId
  document.identity = { ...document.identity, name: options.name }
  if (!options.document && options.description) document.customSections = [...document.customSections, {
    id: `campaign-description:${encodeURIComponent(options.entityId)}`,
    kind: 'text',
    title: 'Описание',
    expanded: true,
    removable: true,
    fieldIds: [],
    text: options.description,
  }]
  return {
    ...(options.sourceCharacterId ? { sourceCharacterId: options.sourceCharacterId } : {}),
    document,
  }
}

/** Заменяет кампанийный лист независимой копией, сохраняя связь с оригиналом. */
export function updateCampaignCharacter(
  character: CampaignCharacter,
  document: CharacterSheetDocument,
): CampaignCharacter {
  return { ...character, document: structuredClone(document) }
}

export function campaignCharacterIdentity(character: CampaignCharacter) {
  const identity = character.document.identity
  return {
    title: identity.name,
    facts: [identity.className, identity.level.manualValue != null && `Ур. ${identity.level.manualValue}`]
      .filter(Boolean).join(' · '),
  }
}

export async function loadCampaignCharacter(data: InstanceData, signal: AbortSignal): Promise<CampaignCharacter> {
  if (data.campaignCharacter) return structuredClone(data.campaignCharacter)
  if (data.entityType !== 'playerCharacter') throw new Error('Кампанийный лист доступен только игровому персонажу.')
  const ref = data.reference
  const material = ref?.source === 'character'
    ? await campaignRequest<OwnedMaterial>(`characters/${encodeURIComponent(ref.entityId)}/`, signal)
    : undefined
  if (material?.document && !validCharacterSheetDocument(material.document)) {
    throw new Error('Исходный лист персонажа имеет неподдерживаемый формат.')
  }
  return createCampaignCharacter({
    entityId: data.entityId,
    name: data.title,
    sourceCharacterId: ref?.source === 'character' ? ref.entityId : undefined,
    document: material?.document,
    description: material?.description,
  })
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

export function validCharacterSheetDocument(value: unknown): value is CharacterSheetDocument {
  if (!record(value)) return false
  const doc = value as Partial<CharacterSheetDocument>
  return Boolean(doc.schemaVersion === 1 && typeof doc.id === 'string'
    && doc.identity && typeof doc.identity.name === 'string'
    && doc.abilities && doc.hitPoints && doc.derivedStats && doc.savingThrows && doc.skills
    && doc.proficiencies && doc.currency && doc.appearance && doc.view
    && Array.isArray(doc.resources) && Array.isArray(doc.attacks) && Array.isArray(doc.vision)
    && Array.isArray(doc.hitDice) && Array.isArray(doc.features) && Array.isArray(doc.customSections))
}

export function validCampaignCharacter(value: unknown): value is CampaignCharacter {
  return record(value)
    && (value.sourceCharacterId === undefined
      || (typeof value.sourceCharacterId === 'string' && Boolean(value.sourceCharacterId)))
    && validCharacterSheetDocument(value.document)
}
