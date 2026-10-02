import { useRef, useState } from 'react'
import { Button, ScrollArea, TextInput } from '../../../shared/ui'
import { ContentEditor } from '../../../shared/ui/ContentEditor'
import { entityLabel } from '../model/library'
import type { CanvasEntity, Diagram, TableNode } from '../model/table'
import { ResizeGrip } from './ResizeGrip'
import { useTableActions } from './tableContext'
import styles from './CampaignTable.module.css'

type EntityChanges = Partial<Pick<CanvasEntity, 'name' | 'description'>>

function NameField({ entity, readOnly, onUpdate }: { entity: CanvasEntity; readOnly: boolean; onUpdate: (changes: EntityChanges) => void }) {
  const [draftName, setDraftName] = useState(entity.name)
  const canceled = useRef(false)
  const save = () => {
    if (canceled.current) { canceled.current = false; setDraftName(entity.name); return }
    if (draftName.trim()) onUpdate({ name: draftName.trim() })
    else setDraftName(entity.name)
  }
  return <label className={styles.localEntityField}>Название
    <TextInput aria-label="Название Entity" value={draftName} readOnly={readOnly} onChange={event => { canceled.current = false; setDraftName(event.target.value) }}
      onBlur={save} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { canceled.current = true; event.currentTarget.blur() } }} />
  </label>
}

export function LocalEntityInspector({ entity, node, diagram, width, readOnly, onResize, onClose, onOpenFull, onUpdate }: {
  entity: CanvasEntity; node: TableNode; diagram: Diagram; width: number; readOnly: boolean
  onResize: (width: number) => void; onClose: () => void; onOpenFull: () => void; onUpdate: (changes: EntityChanges) => void
}) {
  const actions = useTableActions()
  const members = node.type === 'location' ? diagram.nodes.filter(item => item.data.locationId === node.id) : []
  const connectionCount = diagram.edges.filter(edge => edge.source === node.id || edge.target === node.id).length
  return <aside className={styles.localEntityPanel} aria-label="Инспектор объекта">
    <ResizeGrip label="Ширина Inspector" width={width} min={300} onResize={onResize} />
    <header className={styles.sectionHeading}><div><span className={styles.localEntityType}>{entityLabel(entity.entityType)}</span><h2>Inspector</h2></div>
      <Button size="sm" onClick={onClose} aria-label="Закрыть Inspector">×</Button></header>
    <ScrollArea aria-label="Inspector объекта" rootClassName={styles.panelScrollArea} contentClassName={styles.localEntityBody}>
      <NameField key={entity.id} entity={entity} readOnly={readOnly} onUpdate={onUpdate} />
      <div className={styles.localEntityField}><span>Краткое описание</span>
        <ContentEditor accessibleLabel="Описание Entity" value={entity.description} readOnly={readOnly}
          onValueChange={description => onUpdate({ description })} rows={3} renderPreview />
      </div>
      {members.length > 0 && <section className={styles.localEntitySection}><h3>Содержимое</h3>
        <ul>{members.map(member => <li key={member.id}>{member.data.title}</li>)}</ul>
      </section>}
      <p className={styles.localEntityMeta}>Связей: {connectionCount}</p>
      <Button size="sm" onClick={onOpenFull}>Открыть полностью</Button>
      {readOnly && <p className={styles.hint}>Только материалы, разрешённые сервером для публичного стола.</p>}
      {!readOnly && <details className={styles.localEntityActions}><summary>Дополнительные действия</summary>
        <button type="button" onClick={() => actions.duplicate(node.id)}>Дублировать размещение</button>
        <button type="button" onClick={() => { actions.remove(node.id); onClose() }}>Убрать со схемы</button>
      </details>}
    </ScrollArea>
  </aside>
}

export function LocalEntityEditor({ entity, diagramName, readOnly, onBack, onUpdate }: {
  entity: CanvasEntity; diagramName: string; readOnly: boolean; onBack: () => void; onUpdate: (changes: EntityChanges) => void
}) {
  return <section className={styles.localEntityEditor} aria-label="Редактор Entity">
    <nav className={styles.localEntityTabs} role="tablist" aria-label="Рабочие вкладки">
      <button type="button" role="tab" aria-selected="false" onClick={onBack}>{diagramName}</button>
      <button type="button" role="tab" aria-selected="true">{entity.name}</button>
    </nav>
    <ScrollArea aria-label="Редактор Entity" rootClassName={styles.panelScrollArea} contentClassName={styles.localEntityEditorBody} role="tabpanel">
      <span className={styles.localEntityType}>{entityLabel(entity.entityType)}</span>
      <h2>{entity.name}</h2>
      <NameField key={entity.id} entity={entity} readOnly={readOnly} onUpdate={onUpdate} />
      <label className={styles.localEntityField}>Описание</label>
      <ContentEditor accessibleLabel="Полное описание Entity" value={entity.description} readOnly={readOnly}
        onValueChange={description => onUpdate({ description })} rows={12} renderPreview showStructureActions />
    </ScrollArea>
  </section>
}
