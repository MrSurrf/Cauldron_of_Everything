import type { CampaignTable, StoredDiagram } from './table'

type Graph = Pick<StoredDiagram, 'nodes' | 'edges'>
type Change = { before: Graph; after: Graph }
const graph = (diagram: StoredDiagram): Graph => ({
  nodes: diagram.nodes.map(({ id, type, data, position, width, height }) => ({ id, type, data: { ...data }, position: { ...position }, width, height })),
  edges: diagram.edges.map(({ id, source, target, label, data }) => ({ id, source, target, label, data: data ? { ...data } : undefined })),
})

/** История графа по схемам. Entity, viewport, выделение и layout не откатываются. */
export class TableHistory {
  private past = new Map<string, Change[]>()
  private future = new Map<string, Change[]>()
  private transaction: CampaignTable | null = null

  begin(table: CampaignTable) { this.transaction ??= table }
  end(table: CampaignTable) {
    const before = this.transaction
    this.transaction = null
    if (before) this.record(before, table)
  }
  record(before: CampaignTable, after: CampaignTable) {
    if (this.transaction) return
    for (const diagram of after.diagrams) {
      const previous = before.diagrams.find(item => item.id === diagram.id)
      if (!previous) continue
      const change = { before: graph(previous), after: graph(diagram) }
      if (JSON.stringify(change.before) === JSON.stringify(change.after)) continue
      this.past.set(diagram.id, [...(this.past.get(diagram.id) ?? []), change].slice(-100))
      this.future.delete(diagram.id)
    }
  }
  undo(table: CampaignTable) { return this.travel(table, false) }
  redo(table: CampaignTable) { return this.travel(table, true) }
  private travel(table: CampaignTable, redo: boolean): CampaignTable {
    if (this.transaction) return table
    const from = redo ? this.future : this.past
    const to = redo ? this.past : this.future
    const stack = from.get(table.activeId)
    const change = stack?.pop()
    if (!change) return table
    to.set(table.activeId, [...(to.get(table.activeId) ?? []), change])
    const restored = structuredClone(redo ? change.after : change.before)
    return { ...table, diagrams: table.diagrams.map(diagram => diagram.id === table.activeId ? { ...diagram, ...restored } : diagram) }
  }
}
