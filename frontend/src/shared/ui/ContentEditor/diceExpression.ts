export type DiceTerm = {
  count: number
  kind: 'dice'
  rolls: readonly number[]
  sides: number
  sign: 1 | -1
}

export type ConstantTerm = {
  kind: 'constant'
  sign: 1 | -1
  value: number
}

export type DiceRollResult =
  | {
      breakdown: string
      expression: string
      status: 'ok'
      terms: readonly (DiceTerm | ConstantTerm)[]
      total: number
    }
  | {
      error: string
      expression: string
      status: 'error'
    }

const MAX_EXPRESSION_LENGTH = 120
const MAX_TERMS = 24
const MAX_DICE_PER_TERM = 100
const MAX_SIDES = 10_000

function error(
  expression: string,
  message: string,
): DiceRollResult {
  return {
    error: message,
    expression,
    status: 'error',
  }
}

function normalizeRandom(randomValue: number) {
  if (!Number.isFinite(randomValue)) return 0

  return Math.min(
    0.999_999_999,
    Math.max(0, randomValue),
  )
}

function formatBreakdown(
  terms: readonly (DiceTerm | ConstantTerm)[],
) {
  return terms
    .map((term, index) => {
      const sign =
        term.sign === -1
          ? '− '
          : index === 0
            ? ''
            : '+ '

      if (term.kind === 'constant') {
        return `${sign}${term.value}`
      }

      return `${sign}${term.count}d${term.sides} [${term.rolls.join(', ')}]`
    })
    .join(' ')
}

/**
 * Безопасно разбирает простые выражения бросков без выполнения JavaScript.
 * Поддерживает, например: 1d20, 2d6 + 3, 2d6 + 1d4 - 2.
 */
export function rollDiceExpression(
  expression: string,
  random: () => number = Math.random,
): DiceRollResult {
  const source = expression.trim()

  if (!source) {
    return error(expression, 'Введите формулу броска')
  }

  if (source.length > MAX_EXPRESSION_LENGTH) {
    return error(expression, 'Формула броска слишком длинная')
  }

  const compact = source.replace(/\s+/g, '')
  const terms: (DiceTerm | ConstantTerm)[] = []
  let cursor = 0
  let sign: 1 | -1 = 1

  if (compact[cursor] === '+' || compact[cursor] === '-') {
    sign = compact[cursor] === '-' ? -1 : 1
    cursor += 1
  }

  while (cursor < compact.length) {
    if (terms.length >= MAX_TERMS) {
      return error(expression, 'В формуле слишком много слагаемых')
    }

    const rest = compact.slice(cursor)
    const diceMatch = rest.match(/^(\d*)d(\d+)/i)

    if (diceMatch) {
      const count = diceMatch[1]
        ? Number(diceMatch[1])
        : 1
      const sides = Number(diceMatch[2])

      if (
        !Number.isSafeInteger(count) ||
        count < 1 ||
        count > MAX_DICE_PER_TERM
      ) {
        return error(
          expression,
          `Число кубиков должно быть от 1 до ${MAX_DICE_PER_TERM}`,
        )
      }

      if (
        !Number.isSafeInteger(sides) ||
        sides < 1 ||
        sides > MAX_SIDES
      ) {
        return error(
          expression,
          `Число граней должно быть от 1 до ${MAX_SIDES}`,
        )
      }

      const rolls = Array.from(
        { length: count },
        () =>
          Math.floor(normalizeRandom(random()) * sides) + 1,
      )

      terms.push({
        count,
        kind: 'dice',
        rolls,
        sides,
        sign,
      })
      cursor += diceMatch[0].length
    } else {
      const constantMatch = rest.match(/^\d+/)

      if (!constantMatch) {
        return error(
          expression,
          `Не удалось разобрать формулу около «${rest.slice(0, 12)}»`,
        )
      }

      const value = Number(constantMatch[0])

      if (!Number.isSafeInteger(value)) {
        return error(expression, 'Слишком большое числовое значение')
      }

      terms.push({
        kind: 'constant',
        sign,
        value,
      })
      cursor += constantMatch[0].length
    }

    if (cursor === compact.length) break

    const operator = compact[cursor]

    if (operator !== '+' && operator !== '-') {
      return error(
        expression,
        `Ожидался знак + или − около «${compact.slice(cursor, cursor + 12)}»`,
      )
    }

    sign = operator === '-' ? -1 : 1
    cursor += 1

    if (cursor === compact.length) {
      return error(expression, 'Формула не может заканчиваться знаком')
    }
  }

  if (!terms.some((term) => term.kind === 'dice')) {
    return error(expression, 'В формуле должен быть хотя бы один кубик')
  }

  const total = terms.reduce((sum, term) => {
    const value =
      term.kind === 'dice'
        ? term.rolls.reduce(
            (rollSum, roll) => rollSum + roll,
            0,
          )
        : term.value

    return sum + value * term.sign
  }, 0)

  return {
    breakdown: formatBreakdown(terms),
    expression: source,
    status: 'ok',
    terms,
    total,
  }
}

export function describeDiceRoll(result: DiceRollResult) {
  if (result.status === 'error') {
    return `Ошибка: ${result.error}`
  }

  return `${result.breakdown} = ${result.total}`
}
