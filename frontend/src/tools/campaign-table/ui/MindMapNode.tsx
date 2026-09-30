import { Handle, NodeResizer, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Button } from '../../../shared/ui'
import { entityLabel } from '../model/library'
import type { TableNode } from '../model/table'
import { INSTANCE_DRAG_TYPE, useTableActions } from './tableContext'
import styles from './CampaignTable.module.css'

export function MindMapNode({ id, data, type, selected, isConnectable }: NodeProps<TableNode>) {
  const actions = useTableActions()
  const members = actions.diagram.nodes.filter(node => node.data.locationId === id)
  const location = type === 'location'
  return <article className={styles.mindNode} data-selected={selected} data-location={location} aria-label={data.title}>
    <NodeResizer isVisible={selected && !actions.readOnly} minWidth={location ? 300 : 220} minHeight={location ? 200 : 130} color="var(--color-brand-bright)" />
    <Handle id="in" type="target" position={Position.Left} isConnectable={isConnectable && !actions.readOnly} aria-label="Входящая связь" />
    <header><span>{entityLabel(location ? 'location' : data.reference?.entityType ?? 'reference')}</span><h3>{data.title}</h3></header>
    {data.facts && <p className={styles.nodeFacts}>{data.facts}</p>}
    {data.state && <p className={styles.nodeState}>{data.state}</p>}
    {location && <div className={`${styles.members} nodrag nowheel`}>
      {!members.length && <p className={styles.hint}>Перетащите сюда существо, персонажа или NPC.</p>}
      {members.map(member => <div key={member.id} className={styles.member} draggable={!actions.readOnly} onDragStart={event => {
        event.stopPropagation(); event.dataTransfer.setData(INSTANCE_DRAG_TYPE, member.id); event.dataTransfer.effectAllowed = 'move'
      }}>
        <button type="button" onClick={event => { event.stopPropagation(); actions.open(member.id) }}>{member.data.title}</button>
        {!actions.readOnly && <><button type="button" title="Редактировать экземпляр" aria-label={`Редактировать: ${member.data.title}`} onClick={event => { event.stopPropagation(); actions.edit(member.id) }}>✎</button>
          <button type="button" title="Вернуть на холст" aria-label={`Извлечь: ${member.data.title}`} onClick={event => { event.stopPropagation(); actions.release(member.id) }}>↗</button></>}
      </div>)}
    </div>}
    <footer className="nodrag" onClick={event => event.stopPropagation()}>
      <Button size="sm" variant="secondary" decoration="bare" onClick={() => actions.open(id)}>Открыть</Button>
      {!actions.readOnly && <><Button size="sm" variant="secondary" decoration="bare" onClick={() => actions.edit(id)}>Изменить</Button>
        <button type="button" aria-label={`Удалить узел: ${data.title}`} onClick={() => actions.remove(id)}>×</button></>}
    </footer>
    <Handle id="out" type="source" position={Position.Right} isConnectable={isConnectable && !actions.readOnly} aria-label="Исходящая связь" />
  </article>
}
