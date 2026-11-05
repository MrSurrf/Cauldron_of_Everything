import type {
  FormulaOperationResult,
  FormulaToken,
} from './formula.types'

const DEFAULT_MAX_FORMULA_LENGTH = 512
const DEFAULT_MAX_TOKENS = 256

export type TokenizerOptions = {
  maxLength?: number
  maxTokens?: number
}

const isDigit = (character: string | undefined) =>
  character !== undefined && character >= '0' && character <= '9'

const isIdentifierStart = (character: string | undefined) =>
  character !== undefined && /[A-Za-z_]/.test(character)

const isIdentifierPart = (character: string | undefined) =>
  character !== undefined && /[A-Za-z0-9_]/.test(character)

export function tokenizeFormula(
  expression: string,
  options: TokenizerOptions = {},
): FormulaOperationResult<FormulaToken[]> {
  const maxLength = options.maxLength ?? DEFAULT_MAX_FORMULA_LENGTH
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS

  if (expression.trim().length === 0) {
    return {
      ok: false,
      error: { code: 'EMPTY_FORMULA', message: 'Формула не задана' },
    }
  }

  if (expression.length > maxLength) {
    return {
      ok: false,
      error: {
        code: 'LIMIT_EXCEEDED',
        message: `Формула длиннее ${maxLength} символов`,
      },
    }
  }

  const tokens: FormulaToken[] = []
  let cursor = 0

  const addToken = (token: FormulaToken): FormulaOperationResult<null> => {
    if (tokens.length >= maxTokens) {
      return {
        ok: false,
        error: {
          code: 'LIMIT_EXCEEDED',
          message: `Формула содержит больше ${maxTokens} токенов`,
          position: token.position,
        },
      }
    }

    tokens.push(token)
    return { ok: true, value: null }
  }

  while (cursor < expression.length) {
    const character = expression[cursor]

    if (/\s/.test(character)) {
      cursor += 1
      continue
    }

    if (isDigit(character) || (character === '.' && isDigit(expression[cursor + 1]))) {
      const position = cursor
      let dotCount = 0

      while (isDigit(expression[cursor]) || expression[cursor] === '.') {
        if (expression[cursor] === '.') dotCount += 1
        cursor += 1
      }

      const lexeme = expression.slice(position, cursor)
      const value = Number(lexeme)

      if (dotCount > 1 || !Number.isFinite(value)) {
        return {
          ok: false,
          error: {
            code: 'INVALID_NUMBER',
            message: `Некорректное число «${lexeme}»`,
            position,
          },
        }
      }

      const result = addToken({ type: 'number', lexeme, value, position })
      if (!result.ok) return result
      continue
    }

    if (isIdentifierStart(character)) {
      const position = cursor
      cursor += 1
      while (isIdentifierPart(expression[cursor])) cursor += 1
      const lexeme = expression.slice(position, cursor).toUpperCase()
      const result = addToken({ type: 'identifier', lexeme, position })
      if (!result.ok) return result
      continue
    }

    const simpleToken = (() => {
      if ('+-*/%'.includes(character)) {
        return { type: 'operator' as const, lexeme: character, position: cursor }
      }
      if (character === '(') {
        return { type: 'leftParen' as const, lexeme: character, position: cursor }
      }
      if (character === ')') {
        return { type: 'rightParen' as const, lexeme: character, position: cursor }
      }
      if (character === ',') {
        return { type: 'comma' as const, lexeme: character, position: cursor }
      }
      return null
    })()

    if (!simpleToken) {
      return {
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: `Недопустимый символ «${character}»`,
          position: cursor,
        },
      }
    }

    const result = addToken(simpleToken)
    if (!result.ok) return result
    cursor += 1
  }

  tokens.push({ type: 'eof', lexeme: '', position: expression.length })
  return { ok: true, value: tokens }
}

