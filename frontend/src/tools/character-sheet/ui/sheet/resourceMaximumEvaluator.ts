import { evaluateFormula } from '../../model'
import type { CharacterSheetViewModel } from './sheetViewModel'

export function normalizeResourceMaximumExpression(expression: string) {
  return expression.replace(/\[([a-z_][\w]*)\]/gi, '$1').replace(/\bPROF\b/gi, 'PROFICIENCY')
}

export function createResourceMaximumEvaluator(sheet: Pick<CharacterSheetViewModel, 'variables' | 'valueFor'>) {
  const variables = Object.fromEntries(sheet.variables.map(({ key }) => [key, sheet.valueFor(key)]))
  return (expression: string): { value: number | null; error?: string } => {
    if (!expression.trim()) return { value: null }
    const normalized = normalizeResourceMaximumExpression(expression)
    const result = evaluateFormula(normalized, variables)
    if (result.status === 'error') return { value: null, error: result.error.message }
    if (result.value === null) return { value: null }
    if (!Number.isSafeInteger(result.value) || result.value < 0) {
      return { value: null, error: 'Максимум должен быть целым неотрицательным числом.' }
    }
    return { value: result.value }
  }
}
