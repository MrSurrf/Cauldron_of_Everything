import type { CharacterRulesetDefinition } from './ruleset.types'
import { DND5E_2014_RULESET } from './dnd5e2014'

export const DND5E_2024_RULESET: CharacterRulesetDefinition = {
  ...DND5E_2014_RULESET,
  id: 'dnd5e-2024',
  revision: 1,
  label: 'D&D 5e — 2024',
}

