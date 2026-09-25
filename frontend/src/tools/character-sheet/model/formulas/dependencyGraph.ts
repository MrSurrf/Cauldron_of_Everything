import type { FormulaOperationResult } from './formula.types'

export type FormulaDependencyGraph = {
  order: string[]
  dependencies: Record<string, string[]>
}

export function buildFormulaDependencyGraph(
  dependencyMap: Readonly<Record<string, readonly string[]>>,
): FormulaOperationResult<FormulaDependencyGraph> {
  const nodeNames = Object.keys(dependencyMap)
  const nodes = new Set(nodeNames)
  const dependencies = Object.fromEntries(
    nodeNames.map((node) => [
      node,
      [...new Set(dependencyMap[node])].filter((dependency) => nodes.has(dependency)),
    ]),
  )
  const state: Record<string, 'visiting' | 'visited' | undefined> = {}
  const path: string[] = []
  const order: string[] = []

  const visit = (node: string): FormulaOperationResult<null> => {
    if (state[node] === 'visited') return { ok: true, value: null }
    if (state[node] === 'visiting') {
      const cycleStart = path.indexOf(node)
      const cycle = [...path.slice(Math.max(0, cycleStart)), node]
      return {
        ok: false,
        error: {
          code: 'CIRCULAR_DEPENDENCY',
          message: `Циклическая зависимость: ${cycle.join(' → ')}`,
          fieldId: node,
          cycle,
        },
      }
    }

    state[node] = 'visiting'
    path.push(node)
    for (const dependency of dependencies[node] ?? []) {
      const result = visit(dependency)
      if (!result.ok) return result
    }
    path.pop()
    state[node] = 'visited'
    order.push(node)
    return { ok: true, value: null }
  }

  for (const node of nodeNames) {
    const result = visit(node)
    if (!result.ok) return result
  }

  return { ok: true, value: { order, dependencies } }
}

