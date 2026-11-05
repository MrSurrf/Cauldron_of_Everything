import type { CampaignTable, StoredDiagram } from './table'
import { changeDiagram, resolveDiagram } from './table'
import { parseContentSource } from '../../../shared/ui/ContentEditor'

type Graph = Pick<StoredDiagram, 'nodes' | 'edges'>
type Change = { before: Graph; after: Graph }
const graph = (table: CampaignTable, diagram: StoredDiagram): Graph => ({
  nodes: diagram.nodes.map(({ id, type, data, position, width, height }) => {
    const owner = data.containerId ? diagram.nodes.find(node => node.id === data.containerId) : undefined
    const character = owner ? table.entities.find(entity => entity.id === owner.data.entityId)?.campaignCharacter : undefined
    const key = encodeURIComponent(JSON.stringify([diagram.id, id]))
    const source = character?.document.equipmentContentText
    const widget = source ? parseContentSource(source).find(block => block.kind === 'item' && block.attributes['campaign-placement'] === key) : undefined
    return { id, type, data: { ...data, ...(widget && source ? { equipmentSource: source.slice(widget.sourceRange.start, widget.sourceRange.end) } : {}) }, position: { ...position }, width, height }
  }),
  edges: diagram.edges.map(({ id, source, target, label, data }) => ({ id, source, target, label, data: data ? { ...data } : undefined })),
})
// Кэш виджета нужен для восстановления удалённого предмета, но правки его текста — не шаг истории графа.
const signature = (graph: Graph) => JSON.stringify({ ...graph, nodes: graph.nodes.map(node => ({ ...node, data: { ...node.data, equipmentSource: undefined } })) })

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
      if (previous.nodes === diagram.nodes && previous.edges === diagram.edges) continue
      const change = { before: graph(before, previous), after: graph(after, diagram) }
      if (signature(change.before) === signature(change.after)) continue
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
    return changeDiagram(table, table.activeId, current => resolveDiagram(table, { ...current, ...restored }))
  }
}
