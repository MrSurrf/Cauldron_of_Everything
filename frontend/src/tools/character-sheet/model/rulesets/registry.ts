import type { RulesetId } from '../characterSheet.types'
import { DND5E_2014_RULESET } from './dnd5e2014'
import { DND5E_2024_RULESET } from './dnd5e2024'
import type { CharacterRulesetDefinition } from './ruleset.types'

export const CHARACTER_RULESETS: Readonly<Record<RulesetId, CharacterRulesetDefinition>> = {
  'dnd5e-2014': DND5E_2014_RULESET,
  'dnd5e-2024': DND5E_2024_RULESET,
}

export const getRulesetDefinition = (rulesetId: RulesetId) =>
  CHARACTER_RULESETS[rulesetId]

