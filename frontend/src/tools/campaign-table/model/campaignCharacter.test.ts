import { describe, expect, it } from 'vitest'
import { createEmptyCharacterSheet } from '../../character-sheet'
import {
  campaignCharacterIdentity,
  createCampaignCharacter,
  updateCampaignCharacter,
  validCampaignCharacter,
} from './campaignCharacter'

describe('кампанийная версия персонажа', () => {
  it('создаёт независимую копию исходного листа и хранит ссылку на оригинал отдельно', () => {
    const source = createEmptyCharacterSheet({ id: 'source-character' })
    source.identity.name = 'Оригинал'
    source.equipmentContentText = 'Верёвка'

    const campaign = createCampaignCharacter({
      entityId: 'campaign-entity',
      name: 'Кай в Мидденхейме',
      sourceCharacterId: 'source-character',
      document: source,
    })
    campaign.document.equipmentContentText = 'Щит'

    expect(campaign.sourceCharacterId).toBe('source-character')
    expect(campaign.document.id).toBe('campaign-entity')
    expect(campaign.document.identity.name).toBe('Кай в Мидденхейме')
    expect(source).toMatchObject({ id: 'source-character', identity: { name: 'Оригинал' }, equipmentContentText: 'Верёвка' })
    expect(validCampaignCharacter(campaign)).toBe(true)
  })

  it('создаёт локальный лист с описанием и заменяет документ без мутации аргумента', () => {
    const campaign = createCampaignCharacter({ entityId: 'local', name: 'Элора', description: 'Следопыт' })
    expect(campaign.document.customSections[0]).toMatchObject({ title: 'Описание', text: 'Следопыт' })

    const nextDocument = structuredClone(campaign.document)
    nextDocument.identity.className = 'Следопыт'
    nextDocument.identity.level.manualValue = 4
    const updated = updateCampaignCharacter(campaign, nextDocument)
    nextDocument.identity.className = 'Изменено после вызова'

    expect(campaign.document.identity.className).toBe('')
    expect(updated.document.identity.className).toBe('Следопыт')
    expect(campaignCharacterIdentity(updated)).toEqual({ title: 'Элора', facts: 'Следопыт · Ур. 4' })
  })

  it('отклоняет повреждённый и привязанный пустым ID лист', () => {
    const campaign = createCampaignCharacter({ entityId: 'local', name: 'Элора' })
    expect(validCampaignCharacter({ ...campaign, sourceCharacterId: '' })).toBe(false)
    expect(validCampaignCharacter({ ...campaign, document: { ...campaign.document, schemaVersion: 2 } })).toBe(false)
    expect(validCampaignCharacter({ ...campaign, document: { ...campaign.document, resources: null } })).toBe(false)
  })
})
