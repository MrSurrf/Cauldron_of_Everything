import { describe, expect, it } from 'vitest'
import { createResourceMaximumEvaluator } from './resourceMaximumEvaluator'

describe('Максимум ресурса', () => {
  const evaluate = createResourceMaximumEvaluator({
    variables: [{ key: 'PROFICIENCY', label: 'Мастерство' }, { key: 'LEVEL', label: 'Уровень' }],
    valueFor: key => ({ PROFICIENCY: 3, LEVEL: 7 })[key as 'LEVEL' | 'PROFICIENCY'] ?? null,
  })
  it.each([['10', 10], ['[PROF]*2', 6], ['PROFICIENCY*2', 6], ['MAX(1, FLOOR(LEVEL/2))', 3], ['', null]])('%s', (expression, value) => {
    expect(evaluate(expression)).toEqual({ value })
  })
  it.each(['[UNKNOWN]*2', '1/0', '-1', '1.5', 'alert(1)', '1e999'])('не сохраняет некорректный максимум %s', expression => {
    expect(evaluate(expression).error).toBeTruthy()
    expect(evaluate(expression).value).toBeNull()
  })
})
