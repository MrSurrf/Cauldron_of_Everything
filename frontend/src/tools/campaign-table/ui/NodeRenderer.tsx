import { useEffect, useMemo, useRef, useState } from 'react'
import { Handle, NodeResizer, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { entityLabel } from '../model/library'
import type { TableNode } from '../model/table'
import { nodeVisual } from '../model/nodeGeometry'
import { NodeOutline, NodeView } from './NodeViews'
import { INSTANCE_DRAG_TYPE, useTableActions } from './tableContext'
import styles from './CampaignTable.module.css'

function plainText(value: string) {
  if (!value) return ''
  const separated = value.replace(/<\/?(?:p|div|li|h[1-6])(?:\s[^>]*)?>|<br\s*\/?>/gi, ' ')
  return typeof DOMParser === 'undefined' ? separated.trim() : new DOMParser().parseFromString(separated, 'text/html').body.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}

export function NodeRenderer({ id, data, type, selected }: NodeProps<TableNode>) {
  const actions = useTableActions()
  const draft = actions.draft?.id === id ? actions.draft : undefined
  const draftFinished = useRef(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const membersRef = useRef<HTMLDivElement>(null)
  const connectionSource = actions.connectionSource
  const visual = nodeVisual(data.entityType)
  const summary = useMemo(() => data.facts || plainText(data.description), [data.description, data.facts])
  useEffect(() => {
    if (!menuOpen && !membersOpen) return
    const close = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return
      if (menuOpen && !menuRef.current?.contains(event.target)) setMenuOpen(false)
      if (membersOpen && !membersRef.current?.contains(event.target)) setMembersOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); setMembersOpen(false) }
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape) }
  }, [menuOpen, membersOpen])
  if (draft) return <article className={`${styles.mindNode} ${styles.draftNode}`} aria-label={`Создать: ${entityLabel(draft.type)}`}>
    <span>{entityLabel(draft.type)}</span>
    <input autoFocus className="nodrag" aria-label="Название нового объекта" placeholder="Название"
      onPointerDown={event => event.stopPropagation()} onKeyDown={event => {
        event.stopPropagation()
        if (event.key === 'Enter') { event.preventDefault(); if (event.currentTarget.value.trim()) { draftFinished.current = true; draft.commit(event.currentTarget.value) } }
        if (event.key === 'Escape') { event.preventDefault(); draftFinished.current = true; draft.cancel() }
      }} onBlur={event => { if (draftFinished.current) return; draftFinished.current = true; if (event.currentTarget.value.trim()) draft.commit(event.currentTarget.value); else draft.cancel() }} />
  </article>

  const members = type === 'location' ? actions.diagram.nodes.filter(node => node.data.locationId === id) : []
  const localEntity = !data.reference
  const openEntity = () => localEntity ? actions.edit(id) : actions.open(id)
  return <article className={styles.mindNode} data-badge={visual.badge} data-shape={visual.shape} data-entity-type={data.entityType}
    data-selected={selected} data-has-state={Boolean(data.state)} data-connecting={Boolean(connectionSource && connectionSource !== id)}
    aria-label={data.title}>
    <NodeResizer isVisible={selected && !actions.readOnly && !connectionSource} minWidth={visual.badge ? 140 : 190} minHeight={visual.badge ? 200 : 80} color="var(--color-brand-bright)" />
    {/* Технические якоря нужны React Flow для регистрации ребра, не для его геометрии или взаимодействия. */}
    <Handle id="in" type="target" position={Position.Top} isConnectable={false} className={styles.internalAnchor} />
    {!visual.badge && <NodeOutline shape={visual.shape} />}
    <div className={styles.nodeTopline}>
      <span className={styles.nodeType}>{entityLabel(data.entityType)}</span>
      {members.length > 0 && <div ref={membersRef} className={`${styles.nodeMembers} nodrag nowheel`} onPointerDown={event => event.stopPropagation()}>
        <button type="button" className={styles.nodeMembersTrigger} aria-label={`Содержимое: ${members.length}`} aria-expanded={membersOpen}
          onClick={event => { event.stopPropagation(); setMembersOpen(value => !value); setMenuOpen(false) }}>{members.length} внутри</button>
        {membersOpen && <div className={styles.nodeMembersList}>
          {members.map(member => <div key={member.id} className={styles.member} draggable={!actions.readOnly} onDragStart={event => {
            event.stopPropagation(); event.dataTransfer.setData(INSTANCE_DRAG_TYPE, member.id); event.dataTransfer.effectAllowed = 'move'
          }}>
            <button type="button" onClick={event => { event.stopPropagation(); actions.open(member.id) }}>{member.data.title}</button>
            {!actions.readOnly && <><button type="button" title="Редактировать экземпляр" aria-label={`Редактировать: ${member.data.title}`} onClick={event => { event.stopPropagation(); actions.edit(member.id) }}>✎</button>
              <button type="button" title="Вернуть на холст" aria-label={`Извлечь: ${member.data.title}`} onClick={event => { event.stopPropagation(); actions.release(member.id) }}>↗</button></>}
          </div>)}
        </div>}
      </div>}
      <div ref={menuRef} className={`${styles.nodeActions} nodrag`} onPointerDown={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}>
        <button type="button" className={styles.nodeMenuTrigger} aria-label={`Действия: ${data.title}`} aria-expanded={menuOpen}
          onClick={event => { event.stopPropagation(); setMenuOpen(value => !value); setMembersOpen(false) }}>•••</button>
        {menuOpen && <div className={styles.nodeMenu} role="menu" aria-label={`Действия с узлом: ${data.title}`}>
          <button type="button" role="menuitem" onClick={event => { event.stopPropagation(); setMenuOpen(false); openEntity() }}>Открыть</button>
          <button type="button" role="menuitem" disabled={actions.readOnly} onClick={event => { event.stopPropagation(); setMenuOpen(false); actions.edit(id) }}>Редактировать</button>
          <button type="button" role="menuitem" disabled={actions.readOnly} onClick={event => { event.stopPropagation(); setMenuOpen(false); actions.startConnection(id) }}>Связать с…</button>
          {!actions.readOnly && actions.diagrams.length > 1 && <label className={styles.nodePlaceIn}>На другую схему
            <select className="nodrag" aria-label="Разместить Entity на схеме" value="" onChange={event => {
              event.stopPropagation(); if (event.target.value) actions.placeOnDiagram(id, event.target.value); setMenuOpen(false)
            }}><option value="" disabled>Выберите схему</option>{actions.diagrams.filter(item => item.id !== actions.diagram.id).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          </label>}
          <button type="button" role="menuitem" disabled={actions.readOnly} onClick={event => { event.stopPropagation(); setMenuOpen(false); actions.remove(id) }}>Удалить со схемы</button>
        </div>}
      </div>
    </div>
    <NodeView type={data.entityType} title={data.title} summary={summary} state={data.state} />
    <Handle id="out" type="source" position={Position.Top} isConnectable={false} className={styles.internalAnchor} />
  </article>
}
