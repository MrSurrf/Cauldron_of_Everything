import type {
  CharacterSheetDocument,
  NumericFieldState,
} from '../characterSheet.types'
import { ABILITY_KEYS } from '../characterSheet.types'
import { getRulesetDefinition } from '../rulesets/registry'
import {
  abilityModifierVariable,
  abilityScoreVariable,
  savingThrowVariable,
} from '../rulesets/ruleset.types'
import { buildFormulaDependencyGraph } from './dependencyGraph'
import {
  compileFormula,
  evaluateCompiledFormula,
} from './evaluator'
import type {
  CompiledFormula,
  FormulaError,
  FormulaResult,
  FormulaValueMap,
} from './formula.types'
import { createCharacterSheetVariableRegistry } from './variableRegistry'
import {
  attackBonusFormulaVariable,
  currencyFormulaVariable,
  featureUseFormulaVariable,
  FORMULA_FIELD_KEYS,
  hitDieFormulaVariable,
  resourceFormulaVariable,
} from './fieldKeys'
import { selectValidCustomFormulaFields } from './customVariableKeys'

export type FormulaFieldDefinition = {
  state: NumericFieldState
  defaultFormula?: string
}

export type FormulaEvaluation = {
  results: Record<string, FormulaResult>
  values: Record<string, number | null>
}

const MAX_COMPILED_CACHE_SIZE = 128
const compiledFormulaCache = new Map<string, CompiledFormula | FormulaError>()

const getCompiledFormula = (expression: string) => {
  const cached = compiledFormulaCache.get(expression)
  if (cached) return cached

  const result = compileFormula(expression)
  const cachedValue = result.ok ? result.value : result.error
  if (compiledFormulaCache.size >= MAX_COMPILED_CACHE_SIZE) {
    const oldestKey = compiledFormulaCache.keys().next().value
    if (typeof oldestKey === 'string') compiledFormulaCache.delete(oldestKey)
  }
  compiledFormulaCache.set(expression, cachedValue)
  return cachedValue
}

const isCompiledFormula = (
  value: CompiledFormula | FormulaError,
): value is CompiledFormula => 'ast' in value

const fieldExpression = (field: FormulaFieldDefinition) =>
  field.state.formulaOverride ?? field.defaultFormula ?? ''

const withField = (error: FormulaError, fieldId: string): FormulaError => ({
  ...error,
  fieldId,
})

export function evaluateFormulaFields(
  fields: Readonly<Record<string, FormulaFieldDefinition>>,
  baseVariables: FormulaValueMap = {},
): FormulaEvaluation {
  const normalizedFields = Object.fromEntries(
    Object.entries(fields).map(([key, field]) => [key.toUpperCase(), field]),
  )
  const results: Record<string, FormulaResult> = {}
  const values: Record<string, number | null> = {}
  const compiledByField: Record<string, CompiledFormula | FormulaError | null> = {}
  const dependencyMap: Record<string, string[]> = {}

  for (const [fieldId, field] of Object.entries(normalizedFields)) {
    if (field.state.mode === 'manual') {
      const value = field.state.manualValue
      results[fieldId] = value === null
        ? { status: 'empty', value: null }
        : { status: 'ok', value }
      values[fieldId] = value
      continue
    }

    const expression = fieldExpression(field)
    if (expression.trim().length === 0) {
      results[fieldId] = { status: 'empty', value: null }
      values[fieldId] = null
      compiledByField[fieldId] = null
      dependencyMap[fieldId] = []
      continue
    }

    const compiled = getCompiledFormula(expression)
    compiledByField[fieldId] = compiled
    dependencyMap[fieldId] = isCompiledFormula(compiled)
      ? compiled.dependencies.filter((dependency) => dependency in normalizedFields)
      : []
  }

  const cycleFields = new Set<string>()
  let graphInput = { ...dependencyMap }
  let graph = buildFormulaDependencyGraph(graphInput)
  while (!graph.ok && graph.error.cycle && Object.keys(graphInput).length > 0) {
    const members = new Set(graph.error.cycle.slice(0, -1))
    members.forEach((fieldId) => {
      cycleFields.add(fieldId)
      delete graphInput[fieldId]
    })
    graphInput = Object.fromEntries(
      Object.entries(graphInput).map(([fieldId, dependencies]) => [
        fieldId,
        dependencies.filter((dependency) => !cycleFields.has(dependency)),
      ]),
    )
    graph = buildFormulaDependencyGraph(graphInput)
  }

  cycleFields.forEach((fieldId) => {
    const cycle = [...cycleFields, fieldId]
    results[fieldId] = {
      status: 'error',
      value: null,
      error: {
        code: 'CIRCULAR_DEPENDENCY',
        message: `Циклическая зависимость: ${cycle.join(' → ')}`,
        fieldId,
        cycle,
      },
    }
    values[fieldId] = null
  })

  const order = graph.ok ? graph.value.order : Object.keys(graphInput)
  for (const fieldId of order) {
    if (results[fieldId]) continue
    const compiled = compiledByField[fieldId]

    if (compiled === null || compiled === undefined) continue
    if (!isCompiledFormula(compiled)) {
      results[fieldId] = {
        status: 'error',
        value: null,
        error: withField(compiled, fieldId),
      }
      values[fieldId] = null
      continue
    }

    const failedDependency = compiled.dependencies.find(
      (dependency) =>
        results[dependency]?.status === 'error' || cycleFields.has(dependency),
    )
    if (failedDependency) {
      results[fieldId] = {
        status: 'error',
        value: null,
        error: {
          code: 'DEPENDENCY_ERROR',
          message: `Не удалось вычислить зависимость ${failedDependency}`,
          fieldId,
          dependency: failedDependency,
        },
      }
      values[fieldId] = null
      continue
    }

    const variableValues = { ...baseVariables, ...values }
    const result = evaluateCompiledFormula(compiled, variableValues)
    results[fieldId] = result.status === 'error'
      ? { ...result, error: withField(result.error, fieldId) }
      : result
    values[fieldId] = result.value
  }

  return { results, values }
}

export function buildCharacterSheetFormulaFields(
  document: CharacterSheetDocument,
): Record<string, FormulaFieldDefinition> {
  const ruleset = getRulesetDefinition(document.rulesetId)
  const fields: Record<string, FormulaFieldDefinition> = {
    LEVEL: { state: document.identity.level },
    EXPERIENCE: { state: document.identity.experience },
    PROFICIENCY: {
      state: document.proficiencyBonus,
      defaultFormula: ruleset.defaultFormulas.PROFICIENCY,
    },
    ARMOR_CLASS: {
      state: document.derivedStats.armorClass,
      defaultFormula: ruleset.defaultFormulas.ARMOR_CLASS,
    },
    INITIATIVE: {
      state: document.derivedStats.initiative,
      defaultFormula: ruleset.defaultFormulas.INITIATIVE,
    },
    SPEED: { state: document.derivedStats.speed },
    PASSIVE_PERCEPTION: {
      state: document.derivedStats.passivePerception,
      defaultFormula: ruleset.defaultFormulas.PASSIVE_PERCEPTION,
    },
    [FORMULA_FIELD_KEYS.maximumHitPoints]: { state: document.hitPoints.maximum },
    [FORMULA_FIELD_KEYS.currentHitPoints]: { state: document.hitPoints.current },
    [FORMULA_FIELD_KEYS.temporaryHitPoints]: { state: document.hitPoints.temporary },
  }

  ABILITY_KEYS.forEach((ability) => {
    const scoreKey = abilityScoreVariable(ability)
    const modifierKey = abilityModifierVariable(ability)
    const saveKey = savingThrowVariable(ability)
    fields[scoreKey] = { state: document.abilities[ability].score }
    fields[modifierKey] = {
      state: document.abilities[ability].modifier,
      defaultFormula: ruleset.defaultFormulas[modifierKey],
    }
    fields[saveKey] = {
      state: document.savingThrows[ability].value,
      defaultFormula: ruleset.defaultFormulas[saveKey],
    }
  })

  ruleset.skills.forEach((skill) => {
    const state = document.skills[skill.id]
    if (!state) return
    fields[skill.variableKey] = {
      state: state.value,
      defaultFormula: ruleset.defaultFormulas[skill.variableKey],
    }
  })

  document.hitDice.forEach((pool) => {
    fields[hitDieFormulaVariable(pool.id, 'current')] = { state: pool.current }
    fields[hitDieFormulaVariable(pool.id, 'maximum')] = { state: pool.maximum }
  })

  document.resources.forEach((resource) => {
    fields[resourceFormulaVariable(resource.id, 'current')] = { state: resource.current }
    fields[resourceFormulaVariable(resource.id, 'maximum')] = { state: resource.maximum }
  })

  document.features.forEach((feature) => {
    if (!feature.uses) return

    fields[featureUseFormulaVariable(feature.id, 'current')] = {
      state: feature.uses.current,
    }
    fields[featureUseFormulaVariable(feature.id, 'maximum')] = {
      state: feature.uses.maximum,
    }
  })

  document.attacks.forEach((attack) => {
    fields[attackBonusFormulaVariable(attack.id)] = { state: attack.attackBonus }
  })

  Object.entries(document.currency).forEach(([currency, state]) => {
    fields[currencyFormulaVariable(currency)] = { state }
  })

  selectValidCustomFormulaFields(document).fields.forEach(({ field, key }) => {
    fields[key] = { state: field.value }
  })

  return fields
}

export function evaluateCharacterSheetFormulas(
  document: CharacterSheetDocument,
): FormulaEvaluation {
  const registry = createCharacterSheetVariableRegistry(document)
  return evaluateFormulaFields(
    buildCharacterSheetFormulaFields(document),
    registry.resolveDocumentValues(document),
  )
}
