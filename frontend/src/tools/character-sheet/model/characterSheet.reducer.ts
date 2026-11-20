import type {
  CharacterSheetDocument,
  CustomField,
  NumericFieldAddress,
  NumericFieldState,
} from './characterSheet.types'
import type { CharacterSheetAction } from './characterSheet.actions'
import { getRulesetDefinition } from './rulesets/registry'
import { createEmptySpellcasting, formulaNumericField } from './defaults'
import { getEffectiveSpellSlots } from './spellcastingSlots'
import { enrichEquipmentItem, importEquipmentItem } from './equipmentContent'

const replaceById = <T extends { id: string }>(
  items: readonly T[],
  id: string,
  patch: Partial<T>,
) => items.map((item) => (item.id === id ? { ...item, ...patch } : item))

const moveById = <T extends { id: string }>(
  items: readonly T[],
  id: string,
  direction: -1 | 1,
) => {
  const sourceIndex = items.findIndex((item) => item.id === id)
  const targetIndex = sourceIndex + direction
  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= items.length) {
    return [...items]
  }
  const next = [...items]
  const [item] = next.splice(sourceIndex, 1)
  next.splice(targetIndex, 0, item)
  return next
}

function moveFeatureWithinCategory(
  features: CharacterSheetDocument['features'],
  id: string,
  direction: -1 | 1,
) {
  const sourceIndex = features.findIndex(
    (feature) => feature.id === id,
  )
  const source = features[sourceIndex]
  if (!source) return [...features]

  const categoryIndexes = features.flatMap(
    (feature, index) =>
      feature.category === source.category ? [index] : [],
  )
  const categoryIndex = categoryIndexes.indexOf(sourceIndex)
  const targetIndex = categoryIndexes[categoryIndex + direction]
  if (targetIndex === undefined) return [...features]

  const next = [...features]
  next[sourceIndex] = features[targetIndex]
  next[targetIndex] = source
  return next
}

function removeOrphanedCustomFields(
  document: CharacterSheetDocument,
  candidateIds: readonly string[],
  features: CharacterSheetDocument['features'],
  customSections: CharacterSheetDocument['customSections'],
) {
  const retainedFieldIds = new Set([
    ...features.flatMap(
      (feature) => feature.customFieldIds,
    ),
    ...customSections.flatMap(
      (section) => section.fieldIds,
    ),
  ])
  const customFields = { ...document.customFields }

  for (const fieldId of candidateIds) {
    if (!retainedFieldIds.has(fieldId)) {
      delete customFields[fieldId]
    }
  }

  return customFields
}

const setCustomNumericField = (
  field: CustomField | undefined,
  value: NumericFieldState,
): CustomField | undefined => {
  if (!field || (field.kind !== 'number' && field.kind !== 'computed')) return field
  return { ...field, value }
}

function setNumericField(
  document: CharacterSheetDocument,
  address: NumericFieldAddress,
  value: NumericFieldState,
): CharacterSheetDocument {
  if (address.kind === 'ability') {
    return {
      ...document,
      abilities: {
        ...document.abilities,
        [address.ability]: {
          ...document.abilities[address.ability],
          [address.field]: value,
        },
      },
    }
  }

  if (address.kind === 'identity') {
    return {
      ...document,
      identity: { ...document.identity, [address.field]: value },
    }
  }

  if (address.kind === 'proficiencyBonus') {
    return { ...document, proficiencyBonus: value }
  }

  if (address.kind === 'savingThrow') {
    return {
      ...document,
      savingThrows: {
        ...document.savingThrows,
        [address.ability]: {
          ...document.savingThrows[address.ability],
          value,
        },
      },
    }
  }

  if (address.kind === 'skill') {
    const skill = document.skills[address.skillId]
    if (!skill) return document
    return {
      ...document,
      skills: {
        ...document.skills,
        [address.skillId]: { ...skill, value },
      },
    }
  }

  if (address.kind === 'derived') {
    return {
      ...document,
      derivedStats: { ...document.derivedStats, [address.field]: value },
    }
  }

  if (address.kind === 'hitPoints') {
    return {
      ...document,
      hitPoints: { ...document.hitPoints, [address.field]: value },
    }
  }

  if (address.kind === 'hitDice') {
    return {
      ...document,
      hitDice: document.hitDice.map((pool) =>
        pool.id === address.poolId ? { ...pool, [address.field]: value } : pool,
      ),
    }
  }

  if (address.kind === 'featureUse') {
    const emptyValue: NumericFieldState = {
      formulaOverride: null,
      manualValue: null,
      mode: 'manual',
    }

    return {
      ...document,
      features: document.features.map((feature) =>
        feature.id === address.featureId
          ? {
              ...feature,
              uses: {
                current:
                  address.field === 'current'
                    ? value
                    : feature.uses?.current ?? emptyValue,
                maximum:
                  address.field === 'maximum'
                    ? value
                    : feature.uses?.maximum ?? emptyValue,
              },
            }
          : feature,
      ),
    }
  }

  if (address.kind === 'resource') {
    return {
      ...document,
      resources: document.resources.map((resource) =>
        resource.id === address.resourceId
          ? { ...resource, [address.field]: value }
          : resource,
      ),
    }
  }

  if (address.kind === 'attack') {
    return {
      ...document,
      attacks: document.attacks.map((attack) =>
        attack.id === address.attackId ? { ...attack, attackBonus: value } : attack,
      ),
    }
  }

  if (address.kind === 'spellcasting') {
    return {
      ...document,
      spellcasting: {
        ...(document.spellcasting ?? createEmptySpellcasting()),
        [address.field]: value,
      },
    }
  }

  if (address.kind === 'currency') {
    return {
      ...document,
      currency: { ...document.currency, [address.currency]: value },
    }
  }

  const field = setCustomNumericField(document.customFields[address.fieldId], value)
  if (!field) return document
  return {
    ...document,
    customFields: { ...document.customFields, [address.fieldId]: field },
  }
}

const switchRuleset = (
  document: CharacterSheetDocument,
  rulesetId: CharacterSheetDocument['rulesetId'],
): CharacterSheetDocument => {
  if (document.rulesetId === rulesetId) return document
  const skills = Object.fromEntries(
    getRulesetDefinition(rulesetId).skills.map((definition) => {
      const previous = document.skills[definition.id]
      return [
        definition.id,
        previous
          ? { ...previous, ...definition }
          : { ...definition, rank: 'none' as const, value: formulaNumericField(0) },
      ]
    }),
  )
  return {
    ...document,
    rulesetId,
    rulesetRevision: getRulesetDefinition(rulesetId).revision,
    skills,
  }
}

export function characterSheetReducer(
  document: CharacterSheetDocument,
  action: CharacterSheetAction,
): CharacterSheetDocument {
  switch (action.type) {
    case 'document/replace':
      return action.document
    case 'identity/patch':
      return { ...document, identity: { ...document.identity, ...action.patch } }
    case 'ruleset/set':
      return switchRuleset(document, action.rulesetId)
    case 'numericField/set':
      return setNumericField(document, action.address, action.value)
    case 'inspiration/set':
      return { ...document, inspiration: action.value }
    case 'savingThrow/setRank':
      return {
        ...document,
        savingThrows: {
          ...document.savingThrows,
          [action.ability]: {
            ...document.savingThrows[action.ability],
            rank: action.rank,
          },
        },
      }
    case 'skill/setRank': {
      const skill = document.skills[action.skillId]
      if (!skill) return document
      return {
        ...document,
        skills: {
          ...document.skills,
          [action.skillId]: { ...skill, rank: action.rank },
        },
      }
    }
    case 'proficiencies/patch':
      return {
        ...document,
        proficiencies: { ...document.proficiencies, ...action.patch },
      }
    case 'vision/set':
      return { ...document, vision: action.value }
    case 'deathSaves/set':
      return {
        ...document,
        deathSaves: {
          successes: Math.max(0, Math.min(3, action.value.successes)),
          failures: Math.max(0, Math.min(3, action.value.failures)),
        },
      }
    case 'hitDice/add':
      return { ...document, hitDice: [...document.hitDice, action.value] }
    case 'hitDice/update':
      return { ...document, hitDice: replaceById(document.hitDice, action.id, action.patch) }
    case 'hitDice/remove':
      return { ...document, hitDice: document.hitDice.filter((item) => item.id !== action.id) }
    case 'resource/add':
      return { ...document, resources: [...document.resources, action.value] }
    case 'resource/update':
      return { ...document, resources: replaceById(document.resources, action.id, action.patch) }
    case 'resource/remove':
      return { ...document, resources: document.resources.filter((item) => item.id !== action.id) }
    case 'attack/add':
      return { ...document, attacks: [...document.attacks, action.value] }
    case 'attack/update':
      return { ...document, attacks: replaceById(document.attacks, action.id, action.patch) }
    case 'attack/remove':
      return { ...document, attacks: document.attacks.filter((item) => item.id !== action.id) }
    case 'attacks/setContentText':
      return { ...document, attacksContentText: action.value }
    case 'equipment/setContentText':
      return { ...document, equipmentContentText: action.value }
    case 'equipment/importItem':
      return { ...document, equipmentContentText: importEquipmentItem(document.equipmentContentText ?? '', action.entityId, action.source) }
    case 'equipment/enrichItem':
      return { ...document, equipmentContentText: enrichEquipmentItem(document.equipmentContentText ?? '', action.entityId, action.patch) }
    case 'spellcasting/setClassName':
      return { ...document, spellcasting: { ...(document.spellcasting ?? createEmptySpellcasting()), className: action.className } }
    case 'spellcasting/setAbility':
      return { ...document, spellcasting: { ...(document.spellcasting ?? createEmptySpellcasting()), ability: action.ability, abilityMode: 'manual' } }
    case 'spellcasting/setSlotUsed': {
      const spellcasting = document.spellcasting ?? createEmptySpellcasting()
      const slot = getEffectiveSpellSlots(document)[action.level]
      const used = Math.max(0, Math.min(slot.maximum, Math.floor(action.used)))
      if (used === slot.used) return document
      return { ...document, spellcasting: { ...spellcasting, slots: { ...spellcasting.slots, [action.level]: { ...slot, used } } } }
    }
    case 'spellcasting/setSlotMaximum': {
      const spellcasting = document.spellcasting ?? createEmptySpellcasting()
      const slots = getEffectiveSpellSlots(document)
      const slot = slots[action.level]
      const maximum = Math.max(0, Math.min(20, Math.floor(action.maximum)))
      return { ...document, spellcasting: {
        ...spellcasting,
        slotMode: 'manual',
        slots: { ...slots, [action.level]: { maximum, used: Math.min(slot.used, maximum) } },
      } }
    }
    case 'spellcasting/addSpell': {
      const spellcasting = document.spellcasting ?? createEmptySpellcasting()
      if (spellcasting.spells.some(spell => action.value.entityId != null && spell.entityId === action.value.entityId)) return document
      return { ...document, spellcasting: { ...spellcasting, spells: [...spellcasting.spells, action.value] } }
    }
    case 'spellcasting/removeSpell': {
      const spellcasting = document.spellcasting ?? createEmptySpellcasting()
      return { ...document, spellcasting: {
        ...spellcasting,
        spells: spellcasting.spells.filter(spell => spell.id !== action.id),
        concentratingOnId: spellcasting.concentratingOnId === action.id ? null : spellcasting.concentratingOnId,
      } }
    }
    case 'spellcasting/updateSpell': {
      const spellcasting = document.spellcasting ?? createEmptySpellcasting()
      return { ...document, spellcasting: {
        ...spellcasting,
        spells: replaceById(spellcasting.spells, action.id, action.patch),
      } }
    }
    case 'spellcasting/setPrepared': {
      const spellcasting = document.spellcasting ?? createEmptySpellcasting()
      return { ...document, spellcasting: {
        ...spellcasting,
        spells: spellcasting.spells.map(spell => spell.id === action.id && !spell.alwaysPrepared
          ? { ...spell, prepared: action.prepared } : spell),
      } }
    }
    case 'personality/add':
      return {
        ...document,
        personality: {
          ...document.personality,
          [action.section]: [...document.personality[action.section], action.value],
        },
      }
    case 'personality/update':
      return {
        ...document,
        personality: {
          ...document.personality,
          [action.section]: replaceById(
            document.personality[action.section],
            action.id,
            action.patch,
          ),
        },
      }
    case 'personality/remove':
      return {
        ...document,
        personality: {
          ...document.personality,
          [action.section]: document.personality[action.section].filter(
            (item) => item.id !== action.id,
          ),
        },
      }
    case 'feature/add':
      return { ...document, features: [...document.features, action.value] }
    case 'feature/update':
      return { ...document, features: replaceById(document.features, action.id, action.patch) }
    case 'feature/remove': {
      const removedFeature = document.features.find(
        (feature) => feature.id === action.id,
      )
      if (!removedFeature) return document

      const features = document.features.filter(
        (feature) => feature.id !== action.id,
      )
      return {
        ...document,
        customFields: removeOrphanedCustomFields(
          document,
          removedFeature.customFieldIds,
          features,
          document.customSections,
        ),
        features,
      }
    }
    case 'feature/move':
      return {
        ...document,
        features: moveFeatureWithinCategory(
          document.features,
          action.id,
          action.direction,
        ),
      }
    case 'customField/set':
      return {
        ...document,
        customFields: { ...document.customFields, [action.value.id]: action.value },
      }
    case 'customField/remove': {
      const customFields = { ...document.customFields }
      delete customFields[action.id]
      return {
        ...document,
        customFields,
        features: document.features.map((feature) => ({
          ...feature,
          customFieldIds: feature.customFieldIds.filter((id) => id !== action.id),
        })),
        customSections: document.customSections.map((section) => ({
          ...section,
          fieldIds: section.fieldIds.filter((id) => id !== action.id),
        })),
      }
    }
    case 'customSection/add':
      return { ...document, customSections: [...document.customSections, action.value] }
    case 'customSection/update':
      return {
        ...document,
        customSections: replaceById(document.customSections, action.id, action.patch),
      }
    case 'customSection/remove': {
      const removedSection = document.customSections.find(
        (section) => section.id === action.id,
      )
      if (!removedSection) return document

      const customSections = document.customSections.filter(
        (section) => section.id !== action.id,
      )
      return {
        ...document,
        customFields: removeOrphanedCustomFields(
          document,
          removedSection.fieldIds,
          document.features,
          customSections,
        ),
        customSections,
      }
    }
    case 'customSection/move':
      return {
        ...document,
        customSections: moveById(document.customSections, action.id, action.direction),
      }
    case 'appearance/patch':
      return { ...document, appearance: { ...document.appearance, ...action.patch } }
    case 'view/toggleSection': {
      const collapsed = document.view.collapsedSectionIds.includes(action.id)
      return {
        ...document,
        view: {
          ...document.view,
          collapsedSectionIds: collapsed
            ? document.view.collapsedSectionIds.filter((id) => id !== action.id)
            : [...document.view.collapsedSectionIds, action.id],
        },
      }
    }
  }
}
