import { ABILITY_KEYS } from '../characterSheet.types'
import {
  abilityModifierVariable,
  abilityScoreVariable,
  savingThrowProficiencyVariable,
  savingThrowVariable,
  skillProficiencyVariable,
  type CharacterRulesetDefinition,
  type SkillDefinition,
} from './ruleset.types'

export const DND_5E_SKILLS: readonly SkillDefinition[] = [
  { id: 'acrobatics', label: 'Акробатика', ability: 'dexterity', variableKey: 'SKILL_ACROBATICS' },
  { id: 'animal-handling', label: 'Животные', ability: 'wisdom', variableKey: 'SKILL_ANIMAL_HANDLING' },
  { id: 'arcana', label: 'Магия', ability: 'intelligence', variableKey: 'SKILL_ARCANA' },
  { id: 'athletics', label: 'Атлетика', ability: 'strength', variableKey: 'SKILL_ATHLETICS' },
  { id: 'deception', label: 'Обман', ability: 'charisma', variableKey: 'SKILL_DECEPTION' },
  { id: 'history', label: 'История', ability: 'intelligence', variableKey: 'SKILL_HISTORY' },
  { id: 'insight', label: 'Проницательность', ability: 'wisdom', variableKey: 'SKILL_INSIGHT' },
  { id: 'intimidation', label: 'Запугивание', ability: 'charisma', variableKey: 'SKILL_INTIMIDATION' },
  { id: 'investigation', label: 'Анализ', ability: 'intelligence', variableKey: 'SKILL_INVESTIGATION' },
  { id: 'medicine', label: 'Медицина', ability: 'wisdom', variableKey: 'SKILL_MEDICINE' },
  { id: 'nature', label: 'Природа', ability: 'intelligence', variableKey: 'SKILL_NATURE' },
  { id: 'perception', label: 'Восприятие', ability: 'wisdom', variableKey: 'SKILL_PERCEPTION' },
  { id: 'performance', label: 'Выступление', ability: 'charisma', variableKey: 'SKILL_PERFORMANCE' },
  { id: 'persuasion', label: 'Убеждение', ability: 'charisma', variableKey: 'SKILL_PERSUASION' },
  { id: 'religion', label: 'Религия', ability: 'intelligence', variableKey: 'SKILL_RELIGION' },
  { id: 'sleight-of-hand', label: 'Ловкость рук', ability: 'dexterity', variableKey: 'SKILL_SLEIGHT_OF_HAND' },
  { id: 'stealth', label: 'Скрытность', ability: 'dexterity', variableKey: 'SKILL_STEALTH' },
  { id: 'survival', label: 'Выживание', ability: 'wisdom', variableKey: 'SKILL_SURVIVAL' },
]

const abilityFormulas = Object.fromEntries(
  ABILITY_KEYS.flatMap((ability) => [
    [abilityModifierVariable(ability), `FLOOR((${abilityScoreVariable(ability)} - 10) / 2)`],
    [
      savingThrowVariable(ability),
      `${abilityModifierVariable(ability)} + PROFICIENCY * ${savingThrowProficiencyVariable(ability)}`,
    ],
  ]),
)

const skillFormulas = Object.fromEntries(
  DND_5E_SKILLS.map((skill) => [
    skill.variableKey,
    `${abilityModifierVariable(skill.ability)} + PROFICIENCY * ${skillProficiencyVariable(skill.variableKey)}`,
  ]),
)

export const DND5E_2014_RULESET: CharacterRulesetDefinition = {
  id: 'dnd5e-2014',
  revision: 1,
  label: 'D&D 5e — 2014',
  defaultFormulas: {
    ...abilityFormulas,
    ...skillFormulas,
    PROFICIENCY: '2 + FLOOR((LEVEL - 1) / 4)',
    INITIATIVE: 'DEX_MOD',
    ARMOR_CLASS: '10 + DEX_MOD',
    PASSIVE_PERCEPTION: '10 + SKILL_PERCEPTION',
  },
  skills: DND_5E_SKILLS,
  featureSections: [
    { category: 'race', label: 'Особенности расы' },
    { category: 'class', label: 'Особенности класса' },
    {
      category: 'background',
      label: 'Особенности происхождения',
    },
    { category: 'feat', label: 'Способности' },
    { category: 'other', label: 'Прочие особенности' },
  ],
}
