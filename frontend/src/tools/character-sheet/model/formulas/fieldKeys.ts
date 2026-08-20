const normalizeVariableSegment = (value: string) => {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
  return normalized.replace(/_+/g, '_').replace(/^_|_$/g, '') || 'FIELD'
}

export const FORMULA_FIELD_KEYS = {
  level: 'LEVEL',
  experience: 'EXPERIENCE',
  proficiency: 'PROFICIENCY',
  armorClass: 'ARMOR_CLASS',
  initiative: 'INITIATIVE',
  speed: 'SPEED',
  passivePerception: 'PASSIVE_PERCEPTION',
  maximumHitPoints: 'MAX_HIT_POINTS',
  currentHitPoints: 'CURRENT_HIT_POINTS',
  temporaryHitPoints: 'TEMPORARY_HIT_POINTS',
} as const

export const hitDieFormulaVariable = (
  poolId: string,
  field: 'current' | 'maximum',
) => `HIT_DIE_${normalizeVariableSegment(poolId)}_${field.toUpperCase()}`

export const resourceFormulaVariable = (
  resourceId: string,
  field: 'current' | 'maximum',
) => `RESOURCE_${normalizeVariableSegment(resourceId)}_${field.toUpperCase()}`

export const featureUseFormulaVariable = (
  featureId: string,
  field: 'current' | 'maximum',
) => `FEATURE_${normalizeVariableSegment(featureId)}_${field.toUpperCase()}`

export const attackBonusFormulaVariable = (attackId: string) =>
  `ATTACK_${normalizeVariableSegment(attackId)}_BONUS`

export const currencyFormulaVariable = (currency: string) =>
  `CURRENCY_${normalizeVariableSegment(currency)}`
