import { parseFormula, type ParserOptions } from './parser'
import type {
  CompiledFormula,
  FormulaAstNode,
  FormulaOperationResult,
  FormulaResult,
  FormulaValueMap,
} from './formula.types'

type FunctionDefinition = {
  minimumArguments: number
  maximumArguments: number
  calculate: (values: number[]) => number
}

const FUNCTIONS: Readonly<Record<string, FunctionDefinition>> = {
  FLOOR: { minimumArguments: 1, maximumArguments: 1, calculate: ([value]) => Math.floor(value) },
  CEIL: { minimumArguments: 1, maximumArguments: 1, calculate: ([value]) => Math.ceil(value) },
  ROUND: { minimumArguments: 1, maximumArguments: 1, calculate: ([value]) => Math.round(value) },
  ABS: { minimumArguments: 1, maximumArguments: 1, calculate: ([value]) => Math.abs(value) },
  MIN: { minimumArguments: 1, maximumArguments: 32, calculate: (values) => Math.min(...values) },
  MAX: { minimumArguments: 1, maximumArguments: 32, calculate: (values) => Math.max(...values) },
  CLAMP: {
    minimumArguments: 3,
    maximumArguments: 3,
    calculate: ([value, minimum, maximum]) => Math.min(Math.max(value, minimum), maximum),
  },
}

const collectDependencies = (node: FormulaAstNode, dependencies: Set<string>) => {
  if (node.type === 'variable') {
    dependencies.add(node.name)
    return
  }

  if (node.type === 'unary') {
    collectDependencies(node.operand, dependencies)
    return
  }

  if (node.type === 'binary') {
    collectDependencies(node.left, dependencies)
    collectDependencies(node.right, dependencies)
    return
  }

  if (node.type === 'call') {
    node.arguments.forEach((argument) => collectDependencies(argument, dependencies))
  }
}

export function compileFormula(
  expression: string,
  options: ParserOptions = {},
): FormulaOperationResult<CompiledFormula> {
  const ast = parseFormula(expression, options)
  if (!ast.ok) return ast

  const dependencies = new Set<string>()
  collectDependencies(ast.value, dependencies)
  return {
    ok: true,
    value: { expression, ast: ast.value, dependencies: [...dependencies] },
  }
}

const evaluateNode = (
  node: FormulaAstNode,
  variables: FormulaValueMap,
): FormulaOperationResult<number> => {
  if (node.type === 'number') return { ok: true, value: node.value }

  if (node.type === 'variable') {
    const value = variables[node.name]
    if (typeof value !== 'number') {
      return {
        ok: false,
        error: {
          code: 'UNKNOWN_VARIABLE',
          message: `Переменная ${node.name} не определена`,
          position: node.position,
          dependency: node.name,
        },
      }
    }
    return { ok: true, value }
  }

  if (node.type === 'unary') {
    const operand = evaluateNode(node.operand, variables)
    if (!operand.ok) return operand
    return { ok: true, value: node.operator === '-' ? -operand.value : operand.value }
  }

  if (node.type === 'binary') {
    const left = evaluateNode(node.left, variables)
    if (!left.ok) return left
    const right = evaluateNode(node.right, variables)
    if (!right.ok) return right

    if ((node.operator === '/' || node.operator === '%') && right.value === 0) {
      return {
        ok: false,
        error: {
          code: 'DIVISION_BY_ZERO',
          message: 'Деление на ноль',
          position: node.position,
        },
      }
    }

    const value = (() => {
      if (node.operator === '+') return left.value + right.value
      if (node.operator === '-') return left.value - right.value
      if (node.operator === '*') return left.value * right.value
      if (node.operator === '/') return left.value / right.value
      return left.value % right.value
    })()

    if (!Number.isFinite(value)) {
      return {
        ok: false,
        error: {
          code: 'NON_FINITE_RESULT',
          message: 'Результат формулы не является конечным числом',
          position: node.position,
        },
      }
    }
    return { ok: true, value }
  }

  const functionDefinition = FUNCTIONS[node.name]
  if (!functionDefinition) {
    return {
      ok: false,
      error: {
        code: 'UNKNOWN_FUNCTION',
        message: `Функция ${node.name} не поддерживается`,
        position: node.position,
      },
    }
  }

  if (
    node.arguments.length < functionDefinition.minimumArguments ||
    node.arguments.length > functionDefinition.maximumArguments
  ) {
    return {
      ok: false,
      error: {
        code: 'INVALID_ARGUMENT_COUNT',
        message: `Функция ${node.name} получила неверное количество аргументов`,
        position: node.position,
      },
    }
  }

  const values: number[] = []
  for (const argument of node.arguments) {
    const result = evaluateNode(argument, variables)
    if (!result.ok) return result
    values.push(result.value)
  }

  const value = functionDefinition.calculate(values)
  if (!Number.isFinite(value)) {
    return {
      ok: false,
      error: {
        code: 'NON_FINITE_RESULT',
        message: 'Результат формулы не является конечным числом',
        position: node.position,
      },
    }
  }
  return { ok: true, value }
}

export function evaluateCompiledFormula(
  compiled: CompiledFormula,
  variables: FormulaValueMap,
): FormulaResult {
  const result = evaluateNode(compiled.ast, variables)
  return result.ok
    ? { status: 'ok', value: result.value }
    : { status: 'error', value: null, error: result.error }
}

export function evaluateFormula(
  expression: string,
  variables: FormulaValueMap,
  options: ParserOptions = {},
): FormulaResult {
  if (expression.trim().length === 0) return { status: 'empty', value: null }
  const compiled = compileFormula(expression, options)
  return compiled.ok
    ? evaluateCompiledFormula(compiled.value, variables)
    : { status: 'error', value: null, error: compiled.error }
}

