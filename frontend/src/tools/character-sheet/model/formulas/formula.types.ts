export type FormulaTokenType =
  | 'number'
  | 'identifier'
  | 'operator'
  | 'leftParen'
  | 'rightParen'
  | 'comma'
  | 'eof'

export type FormulaToken = {
  type: FormulaTokenType
  lexeme: string
  position: number
  value?: number
}

export type FormulaErrorCode =
  | 'EMPTY_FORMULA'
  | 'INVALID_TOKEN'
  | 'INVALID_NUMBER'
  | 'UNEXPECTED_TOKEN'
  | 'UNKNOWN_VARIABLE'
  | 'UNKNOWN_FUNCTION'
  | 'INVALID_ARGUMENT_COUNT'
  | 'DIVISION_BY_ZERO'
  | 'NON_FINITE_RESULT'
  | 'CIRCULAR_DEPENDENCY'
  | 'DEPENDENCY_ERROR'
  | 'LIMIT_EXCEEDED'

export type FormulaError = {
  code: FormulaErrorCode
  message: string
  position?: number
  fieldId?: string
  dependency?: string
  cycle?: string[]
}

export type FormulaResult =
  | { status: 'ok'; value: number }
  | { status: 'empty'; value: null }
  | { status: 'error'; value: null; error: FormulaError }

export type FormulaOperationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: FormulaError }

export type NumberNode = {
  type: 'number'
  value: number
  position: number
}

export type VariableNode = {
  type: 'variable'
  name: string
  position: number
}

export type UnaryNode = {
  type: 'unary'
  operator: '+' | '-'
  operand: FormulaAstNode
  position: number
}

export type BinaryNode = {
  type: 'binary'
  operator: '+' | '-' | '*' | '/' | '%'
  left: FormulaAstNode
  right: FormulaAstNode
  position: number
}

export type FunctionCallNode = {
  type: 'call'
  name: string
  arguments: FormulaAstNode[]
  position: number
}

export type FormulaAstNode =
  | NumberNode
  | VariableNode
  | UnaryNode
  | BinaryNode
  | FunctionCallNode

export type CompiledFormula = {
  expression: string
  ast: FormulaAstNode
  dependencies: string[]
}

export type FormulaValueMap = Readonly<Record<string, number | null | undefined>>

