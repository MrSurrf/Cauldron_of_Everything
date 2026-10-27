import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Handle, NodeResizer, Position, useStore } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { CSSProperties } from 'react'
import { entityLabel } from '../model/library'
import type { TableNode } from '../model/table'
import { canResizeNode, center, contourBox, contourPoint, EXPANDED_CREATURE_WIDTH, nodeMinimumSize, nodeVisual } from '../model/nodeGeometry'
import { Combobox, EditIcon, TrashIcon, Tooltip } from '../../../shared/ui'
import { NodeCreatureCard } from './NodeCreatureCard'
import { NodeOutline, NodeView } from './NodeViews'
import { INSTANCE_DRAG_TYPE, useNodeActions } from './tableContext'
import type { NodeMember } from './nodeMetadata'
import styles from './CampaignNodes.module.css'
import { useCreatureMorph } from './useCreatureMorph'

function plainText(value: string) {
  if (!value) return ''
  const separated = value.replace(/<\/?(?:p|div|li|h[1-6])(?:\s[^>]*)?>|<br\s*\/?>/gi, ' ')
  return typeof DOMParser === 'undefined' ? separated.trim() : new DOMParser().parseFromString(separated, 'text/html').body.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}

const emptyMembers: readonly NodeMember[] = []

export const NodeRenderer = memo(function NodeRenderer({ id, data, width, height, selected, dragging }: NodeProps<TableNode>) {
  const actions = useNodeActions()
  const zoom = useStore(state => state.transform[2])
  const draft = actions.draft?.id === id ? actions.draft : undefined
  const draftFinished = useRef(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const creatureExpanded = Boolean(data.display?.creatureExpanded)
  const { nodeRef, contentRef } = useCreatureMorph(data.entityType === 'creature' && !draft, creatureExpanded)
  const menuRef = useRef<HTMLDivElement>(null)
  const membersRef = useRef<HTMLDivElement>(null)
  const connectionSource = actions.connectionSource
  const arrivalKey = data.display?.arrivalKey
  const visual = nodeVisual(data.entityType)
  const minimum = nodeMinimumSize(data.entityType)
  const summary = useMemo(() => data.facts || plainText(data.description), [data.description, data.facts])
  useEffect(() => {
    const node = nodeRef.current
    if (!node || draft || arrivalKey === undefined) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reducedMotion.matches) return
    // Анимируется внутренний article: размеры и transform оболочки React Flow остаются стабильными.
    const animation = node.animate([
      { opacity: 0.3, translate: '0 -10px', filter: 'drop-shadow(0 10px 14px color-mix(in srgb, var(--node-accent) 36%, transparent))' },
      { opacity: 1, translate: '0 0', filter: 'drop-shadow(0 0 10px color-mix(in srgb, var(--node-accent) 24%, transparent))', offset: 0.7 },
      { opacity: 1, translate: '0 0', filter: 'drop-shadow(0 0 0 transparent)' },
    ], { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' })
    const stop = () => animation.cancel()
    reducedMotion.addEventListener('change', stop)
    node.addEventListener('pointerdown', stop)
    return () => { reducedMotion.removeEventListener('change', stop); node.removeEventListener('pointerdown', stop); animation.cancel() }
  }, [arrivalKey, draft, nodeRef])
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

  const members = actions.membersByContainer.get(id) ?? emptyMembers
  const box = contourBox(data.entityType, { x: 0, y: 0 }, width ?? visual.width, height ?? minimum.height, creatureExpanded)
  const origin = center(box)
  const localEntity = !data.reference
  const openEntity = () => localEntity ? actions.edit(id) : actions.open(id)
  return <article ref={nodeRef} className={styles.mindNode} data-badge={visual.badge && !creatureExpanded} data-shape={creatureExpanded ? 'rectangle' : visual.shape} data-entity-type={data.entityType}
    data-creature-expanded={data.entityType === 'creature' ? creatureExpanded : undefined}
    data-selected={selected} data-dragging={dragging} data-connection-source={connectionSource === id}
    data-drop-target={actions.dropTarget === id || undefined}
    data-connecting={Boolean(connectionSource && connectionSource !== id)} data-arrival-key={arrivalKey}
    aria-label={data.title} onContextMenu={event => { event.preventDefault(); event.stopPropagation(); if (!connectionSource) setMenuOpen(true) }}>
    {canResizeNode(data.entityType) && <NodeResizer isVisible={selected && !actions.readOnly && !connectionSource}
      minWidth={minimum.width} minHeight={minimum.height} handleClassName={styles.nodeResizeHandle} lineClassName={styles.nodeResizeLine}
      onResizeStart={actions.beginGesture} onResizeEnd={actions.endGesture} />}
    {/* Технические якоря нужны React Flow для регистрации ребра, не для его геометрии или взаимодействия. */}
    <Handle id="in" type="target" position={Position.Top} isConnectable={false} className={styles.internalAnchor} />
    {(!visual.badge || creatureExpanded) && <NodeOutline shape={creatureExpanded ? 'rectangle' : visual.shape} />}
    {!connectionSource && <div className={styles.nodeTopline}>
      {members.length > 0 && <div ref={membersRef} className={`${styles.nodeMembers} nodrag nowheel`} onPointerDown={event => event.stopPropagation()}>
        <button type="button" className={styles.nodeMembersTrigger} aria-label={`Содержимое: ${members.length}`} aria-expanded={membersOpen}
          onClick={event => { event.stopPropagation(); setMembersOpen(value => !value); setMenuOpen(false) }}>{members.length} внутри</button>
        {membersOpen && <div className={styles.nodeMembersList}>
          {members.map(member => <div key={member.id} className={styles.member} draggable={!actions.readOnly} onDragStart={event => {
            event.stopPropagation(); event.dataTransfer.setData(INSTANCE_DRAG_TYPE, member.id); event.dataTransfer.effectAllowed = 'move'
            actions.beginInstanceDrag(member.id)
          }}>
            <button type="button" onClick={event => { event.stopPropagation(); actions.open(member.id) }}>{member.title}</button>
            {!actions.readOnly && <><button type="button" title="Редактировать экземпляр" aria-label={`Редактировать: ${member.title}`} onClick={event => { event.stopPropagation(); actions.edit(member.id) }}>✎</button>
              <button type="button" title="Вернуть на холст" aria-label={`Извлечь: ${member.title}`} onClick={event => { event.stopPropagation(); actions.release(member.id) }}>↗</button></>}
          </div>)}
        </div>}
      </div>}
      <div ref={menuRef} className={`${styles.nodeActions} nodrag`} onPointerDown={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}>
        <div className={styles.nodeQuickActions}>
          {data.entityType === 'creature' && <Tooltip content={creatureExpanded ? 'Скрыть подробности' : 'Показать больше'}>
            <button type="button" className={styles.nodeMenuTrigger} aria-label={creatureExpanded ? 'Скрыть подробности' : 'Показать больше'} aria-expanded={creatureExpanded}
              onClick={event => {
                event.stopPropagation(); setMenuOpen(false)
                actions.toggleCreature(id)
              }}>
              <svg className={styles.nodeExpandArrow} data-expanded={creatureExpanded} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </Tooltip>}
          {!actions.readOnly && <>
          <button type="button" className={styles.nodeMenuTrigger} aria-label={`Редактировать: ${data.title}`} title="Редактировать"
            onClick={event => { event.stopPropagation(); setMenuOpen(false); actions.edit(id) }}><EditIcon /></button>
          <button type="button" className={styles.nodeMenuTrigger} aria-label={`Удалить со схемы: ${data.title}`} title="Удалить со схемы"
            onClick={event => { event.stopPropagation(); actions.remove(id) }}><TrashIcon /></button>
          </>}
        </div>
        {menuOpen && <div className={styles.nodeMenu} role="menu" aria-label={`Действия с узлом: ${data.title}`}>
          <button type="button" role="menuitem" onClick={event => { event.stopPropagation(); setMenuOpen(false); openEntity() }}>Открыть</button>
          <button type="button" role="menuitem" disabled={actions.readOnly} onClick={event => { event.stopPropagation(); setMenuOpen(false); actions.edit(id) }}>Редактировать</button>
          <button type="button" role="menuitem" disabled={actions.readOnly} onClick={event => { event.stopPropagation(); setMenuOpen(false); actions.startConnection(id) }}>Связать с…</button>
          {!actions.readOnly && actions.diagrams.length > 1 && <div className={styles.nodePlaceIn}>На другую схему
            <Combobox className="nodrag" aria-label="Разместить Entity на схеме" placeholder="Выберите схему" value={null}
              options={actions.diagrams.filter(item => item.id !== actions.diagramId).map(item => ({ value: item.id, label: item.name }))}
              onClick={event => event.stopPropagation()} onValueChange={value => { if (value !== null) { actions.placeOnDiagram(id, value); setMenuOpen(false) } }} />
          </div>}
          <button type="button" role="menuitem" disabled={actions.readOnly} onClick={event => { event.stopPropagation(); setMenuOpen(false); actions.remove(id) }}>Удалить со схемы</button>
        </div>}
      </div>
    </div>}
    {data.entityType === 'creature' ? <div className={styles.nodeCreatureViewport}>
      <div ref={contentRef} className={styles.nodeCreaturePresentation} style={{ width: creatureExpanded ? EXPANDED_CREATURE_WIDTH : visual.width }}>
        {creatureExpanded ? <NodeCreatureCard data={data} /> : <NodeView type={data.entityType} title={data.title} summary={summary} />}
      </div>
    </div> : <NodeView type={data.entityType} title={data.title} summary={summary} />}
    {!actions.readOnly && !connectionSource && ([['top', 'сверху'], ['right', 'справа'], ['bottom', 'снизу'], ['left', 'слева']] as const).map(([side, label]) => {
      const point = contourPoint(box, { x: origin.x + (side === 'left' ? -1000 : side === 'right' ? 1000 : 0),
        y: origin.y + (side === 'top' ? -1000 : side === 'bottom' ? 1000 : 0) })
      return <button key={side} type="button" className={`${styles.connectionPort} nodrag nopan`} data-side={side}
        style={{ left: point.x, top: point.y, '--port-scale': 1 / zoom } as CSSProperties}
        aria-label={`Соединить ${label}: ${data.title}`} title="Создать связь: нажмите или потяните к другой ноде"
        onPointerDown={event => actions.beginConnection(id, event)} onDoubleClick={event => event.stopPropagation()}
        onClick={event => {
          event.stopPropagation()
          setMenuOpen(false); setMembersOpen(false)
          actions.startConnection(id, { x: event.clientX, y: event.clientY })
        }} />
    })}
    <Handle id="out" type="source" position={Position.Top} isConnectable={false} className={styles.internalAnchor} />
  </article>
})
