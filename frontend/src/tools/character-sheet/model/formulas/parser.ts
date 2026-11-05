import type {
  BinaryNode,
  FormulaAstNode,
  FormulaOperationResult,
  FormulaToken,
} from './formula.types'
import { tokenizeFormula, type TokenizerOptions } from './tokenizer'

const DEFAULT_MAX_AST_DEPTH = 32

export type ParserOptions = TokenizerOptions & {
  maxDepth?: number
}

type ParseStep = FormulaOperationResult<FormulaAstNode>

class FormulaParser {
  private cursor = 0
  private readonly tokens: FormulaToken[]
  private readonly maxDepth: number

  constructor(
    tokens: FormulaToken[],
    maxDepth: number,
  ) {
    this.tokens = tokens
    this.maxDepth = maxDepth
  }

  parse(): ParseStep {
    const expression = this.parseAddition(0)
    if (!expression.ok) return expression

    const trailing = this.peek()
    if (trailing.type !== 'eof') {
      return this.unexpected(trailing, `Неожиданный токен «${trailing.lexeme}»`)
    }

    return expression
  }

  private parseAddition(depth: number): ParseStep {
    let left = this.parseMultiplication(depth + 1)
    if (!left.ok) return left

    while (this.matchOperator('+', '-')) {
      const operatorToken = this.previous()
      const right = this.parseMultiplication(depth + 1)
      if (!right.ok) return right
      left = {
        ok: true,
        value: {
          type: 'binary',
          operator: operatorToken.lexeme as BinaryNode['operator'],
          left: left.value,
          right: right.value,
          position: operatorToken.position,
        },
      }
    }

    return left
  }

  private parseMultiplication(depth: number): ParseStep {
    let left = this.parseUnary(depth + 1)
    if (!left.ok) return left

    while (this.matchOperator('*', '/', '%')) {
      const operatorToken = this.previous()
      const right = this.parseUnary(depth + 1)
      if (!right.ok) return right
      left = {
        ok: true,
        value: {
          type: 'binary',
          operator: operatorToken.lexeme as BinaryNode['operator'],
          left: left.value,
          right: right.value,
          position: operatorToken.position,
        },
      }
    }

    return left
  }

  private parseUnary(depth: number): ParseStep {
    const limitError = this.checkDepth(depth)
    if (limitError) return limitError

    if (this.matchOperator('+', '-')) {
      const operatorToken = this.previous()
      const operand = this.parseUnary(depth + 1)
      if (!operand.ok) return operand
      return {
        ok: true,
        value: {
          type: 'unary',
          operator: operatorToken.lexeme as '+' | '-',
          operand: operand.value,
          position: operatorToken.position,
        },
      }
    }

    return this.parsePrimary(depth + 1)
  }

  private parsePrimary(depth: number): ParseStep {
    const limitError = this.checkDepth(depth)
    if (limitError) return limitError

    const token = this.advance()
    if (token.type === 'number' && token.value !== undefined) {
      return {
        ok: true,
        value: { type: 'number', value: token.value, position: token.position },
      }
    }

    if (token.type === 'identifier') {
      if (this.peek().type !== 'leftParen') {
        return {
          ok: true,
          value: { type: 'variable', name: token.lexeme, position: token.position },
        }
      }

      this.advance()
      const argumentsList: FormulaAstNode[] = []
      if (this.peek().type !== 'rightParen') {
        do {
          const argument = this.parseAddition(depth + 1)
          if (!argument.ok) return argument
          argumentsList.push(argument.value)
        } while (this.match('comma'))
      }

      const closingParen = this.advance()
      if (closingParen.type !== 'rightParen') {
        return this.unexpected(closingParen, 'Ожидалась закрывающая скобка')
      }

      return {
        ok: true,
        value: {
          type: 'call',
          name: token.lexeme,
          arguments: argumentsList,
          position: token.position,
        },
      }
    }

    if (token.type === 'leftParen') {
      const expression = this.parseAddition(depth + 1)
      if (!expression.ok) return expression
      const closingParen = this.advance()
      if (closingParen.type !== 'rightParen') {
        return this.unexpected(closingParen, 'Ожидалась закрывающая скобка')
      }
      return expression
    }

    return this.unexpected(token, 'Ожидалось число, переменная или выражение в скобках')
  }

  private checkDepth(depth: number): ParseStep | null {
    if (depth <= this.maxDepth) return null
    return {
      ok: false,
      error: {
        code: 'LIMIT_EXCEEDED',
        message: `Глубина формулы превышает ${this.maxDepth}`,
        position: this.peek().position,
      },
    }
  }

  private match(type: FormulaToken['type']): boolean {
    if (this.peek().type !== type) return false
    this.advance()
    return true
  }

  private matchOperator(...operators: string[]): boolean {
    const token = this.peek()
    if (token.type !== 'operator' || !operators.includes(token.lexeme)) return false
    this.advance()
    return true
  }

  private advance(): FormulaToken {
    const token = this.tokens[this.cursor] ?? this.tokens[this.tokens.length - 1]
    if (token.type !== 'eof') this.cursor += 1
    return token
  }

  private peek(): FormulaToken {
    return this.tokens[this.cursor] ?? this.tokens[this.tokens.length - 1]
  }

  private previous(): FormulaToken {
    return this.tokens[Math.max(0, this.cursor - 1)]
  }

  private unexpected(token: FormulaToken, message: string): ParseStep {
    return {
      ok: false,
      error: { code: 'UNEXPECTED_TOKEN', message, position: token.position },
    }
  }
}

export function parseFormula(
  expression: string,
  options: ParserOptions = {},
): FormulaOperationResult<FormulaAstNode> {
  const tokens = tokenizeFormula(expression, options)
  if (!tokens.ok) return tokens
  return new FormulaParser(
    tokens.value,
    options.maxDepth ?? DEFAULT_MAX_AST_DEPTH,
  ).parse()
}
