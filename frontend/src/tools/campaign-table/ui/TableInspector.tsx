import { useEffect, useState } from 'react'
import { CreatureFullView, getCreatureById } from '../../../entities/creature'
import type { CreatureEntity } from '../../../entities/creature'
import { fetchEncyclopedia } from '../../../entities/encyclopedia'
import type { EncyclopediaEntry } from '../../../entities/encyclopedia'
import { Button, Combobox, ScrollArea, TextInput } from '../../../shared/ui'
import { ContentEditor } from '../../../shared/ui/ContentEditor'
import { RichContent } from '../../../shared/ui/RichContent'
import { campaignRequest } from '../model/campaignApi'
import type { OwnedMaterial } from '../model/campaignApi'
import { canPlaceReference, entityLabel } from '../model/library'
import { EntityReferenceLinks } from './EntityReferenceLinks'
import { hasInstanceEditor } from '../model/instanceStatBlock'
import { InstanceStatBlockPanel } from './InstanceStatBlockPanel'
import { NodePanelHeader } from './NodePanelHeader'
import type { LibraryReference } from '../model/library'
import { canContain } from '../model/table'
import { canPlaceInside, containerOf } from '../model/nodeContainment'
import { canResizeNode, nodeMinimumSize, nodeVisual } from '../model/nodeGeometry'
import type { Diagram, TableNode } from '../model/table'
import { ResizeGrip } from './ResizeGrip'
import { useTableActions } from './tableContext'
import { EdgeAppearanceControls } from './EdgeAppearanceControls'
import styles from './CampaignTable.module.css'
import panelStyles from './CampaignPanels.module.css'

export type Selection = { kind: 'node'; id: string; editing: boolean } | { kind: 'edge'; id: string } | { kind: 'library'; reference: LibraryReference }
const ignoreChange = () => {}

function SourceCard({ reference, onOpen }: { reference: LibraryReference; onOpen: (ref: LibraryReference) => void }) {
  const [result, setResult] = useState<{ creature?: CreatureEntity; entry?: EncyclopediaEntry; material?: OwnedMaterial; error?: string } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      if (reference.source === 'encyclopedia') {
        if (reference.entityType === 'creature') {
          const creature = await getCreatureById(reference.entityId, controller.signal)
          if (!creature) throw new Error('Существо больше не доступно.')
          return { creature }
        }
        return { entry: await fetchEncyclopedia<EncyclopediaEntry>(`${encodeURIComponent(reference.entityId)}/`, controller.signal) }
      }
      return { material: await campaignRequest<OwnedMaterial>(`${reference.source === 'character' ? 'characters' : 'campaigns'}/${encodeURIComponent(reference.entityId)}/`, controller.signal) }
    }
    void load().then(value => { if (!controller.signal.aborted) setResult(value) }).catch((error: unknown) => {
      if (!controller.signal.aborted) setResult({ error: error instanceof Error ? error.message : 'Карточка недоступна.' })
    })
    return () => controller.abort()
  }, [reference])
  return <EntityReferenceLinks onOpen={onOpen}>
    {!result && <p role="status">Загрузка карточки…</p>}
    {result?.error && <p role="alert">{result.error}</p>}
    {result?.creature && <CreatureFullView entity={result.creature} className={styles.fullCard} />}
    {result?.entry && <><h3 className={styles.inspectorTitle}>{result.entry.name}</h3>{result.entry.content_html
      ? <RichContent html={result.entry.content_html} /> : <p className={styles.plainContent}>{result.entry.content_text || 'Описание отсутствует.'}</p>}</>}
    {result?.material && <><h3 className={styles.inspectorTitle}>{result.material.name}</h3><ContentEditor rootClassName={panelStyles.contentEditor} accessibleLabel="Описание материала" value={result.material.description} onValueChange={ignoreChange} readOnly renderPreview /></>}
  </EntityReferenceLinks>
}

export function TableInspector({ selection, width, onResize, onClose, onChange, onOpen, onAdd }: {
  selection: Selection; width: number; onResize: (width: number) => void; onClose: () => void
  onChange: (update: (diagram: Diagram) => Diagram) => void; onOpen: (ref: LibraryReference) => void; onAdd: (ref: LibraryReference) => void
}) {
  const actions = useTableActions()
  const { diagram, readOnly } = actions
  const node = selection.kind === 'node' ? diagram.nodes.find(item => item.id === selection.id) : undefined
  const edge = selection.kind === 'edge' ? diagram.edges.find(item => item.id === selection.id) : undefined
  const reference = selection.kind === 'library' ? selection.reference : node?.data.reference
  const editing = selection.kind === 'node' && selection.editing && !readOnly
  if (selection.kind !== 'library' && !node && !edge) return null
  const changeNode = (update: (node: TableNode) => TableNode) => {
    if (node && !readOnly) onChange(current => ({ ...current, nodes: current.nodes.map(item => item.id === node.id ? update(item) : item) }))
  }
  const field = (key: 'title' | 'facts' | 'description', value: string) => changeNode(item => ({ ...item, data: { ...item.data, [key]: value } }))
  return <aside className={`${styles.inspectorWindow} ${panelStyles.panel}`} aria-label="Карточка и редактор" data-campaign-panel="inspector"
    data-inventory-drop-target={Boolean(node && actions.dropTarget === node.id) || undefined}>
    <ResizeGrip label="Ширина карточки" width={width} min={300} onResize={onResize} />
    <NodePanelHeader title={edge ? 'Связь' : entityLabel(node?.data.entityType ?? reference!.entityType)} closeLabel="Закрыть карточку" onClose={onClose} />
    <ScrollArea key={editing ? 'editing' : 'viewing'} aria-label="Карточка и редактор" rootClassName={styles.panelScrollArea}
      className={`${styles.inspectorBody} ${panelStyles.body}`} contentClassName={panelStyles.contentTransition} data-panel-transition={editing ? 'editing' : 'viewing'}>
      {node && <>
        {!hasInstanceEditor(node.data.entityType) && <h3 className={styles.inspectorTitle}>{node.data.title}</h3>}
        {!readOnly && <div className={panelStyles.actions}><Button size="sm" variant="secondary" decoration="bare" className={panelStyles.action} onClick={() => editing ? actions.open(node.id) : actions.edit(node.id)}>{editing ? 'Просмотр' : 'Редактировать экземпляр'}</Button>
          <Button size="sm" variant="secondary" decoration="bare" className={panelStyles.action} onClick={() => actions.duplicate(node.id)}>Дублировать</Button></div>}
        {hasInstanceEditor(node.data.entityType) && <InstanceStatBlockPanel key={node.data.entityId} data={node.data} editing={editing} readOnly={readOnly}
          onOpen={onOpen}
          onChange={changes => changeNode(item => ({ ...item, data: { ...item.data, ...changes } }))} />}
        {editing ? <div className={styles.editorFields}>
          {!hasInstanceEditor(node.data.entityType) && <>
            <label>Название<TextInput rootClassName={panelStyles.fieldControl} aria-label="Название экземпляра" value={node.data.title} onChange={event => field('title', event.target.value)} /></label>
            <label>Ключевые данные<TextInput rootClassName={panelStyles.fieldControl} aria-label="Ключевые данные" value={node.data.facts} onChange={event => field('facts', event.target.value)} /></label>
          </>}
          <label>Описание</label><ContentEditor rootClassName={panelStyles.contentEditor} accessibleLabel="Описание экземпляра" value={node.data.description} onValueChange={value => field('description', value)} rows={5} renderPreview showStructureActions />
          <details className={`${styles.placementDetails} ${panelStyles.disclosure}`}><summary>Размещение на схеме</summary>
          <div className={styles.geometry}>{(['x', 'y', 'width', 'height'] as const).filter(key => key === 'x' || key === 'y' || canResizeNode(node.data.entityType)).map(key => <label key={key}>{({ x: 'X', y: 'Y', width: 'Ширина', height: 'Высота' })[key]}
            <input aria-label={`Узел: ${key}`} type="number" min={key === 'width' || key === 'height' ? nodeMinimumSize(node.data.entityType)[key] : undefined}
              value={key === 'x' || key === 'y' ? node.position[key] : node[key] ?? (key === 'width' ? nodeVisual(node.data.entityType).width : node.measured?.height ?? nodeMinimumSize(node.data.entityType).height)} onChange={event => {
              const value = event.target.valueAsNumber
              if (!Number.isFinite(value)) return
              changeNode(item => key === 'x' || key === 'y' ? { ...item, position: { ...item.position, [key]: value } }
                : { ...item, [key]: Math.max(nodeMinimumSize(item.data.entityType)[key], value) })
            }} /></label>)}</div>
          {canContain(node) && <div className={styles.statField}><span>Расположение</span><Combobox rootClassName={panelStyles.fieldControl} aria-label="Локация экземпляра" value={containerOf(node) ?? ''}
            options={[{ value: '', label: 'На холсте' }, ...diagram.nodes.filter(item => canPlaceInside(node, item)).map(item => ({ value: item.id, label: item.data.title }))]}
            onValueChange={value => { if (value !== null) actions.placeInside(node.id, value || undefined) }} />
          </div>}
          </details>
          <p className={styles.hint}>Изменяется Entity этого экземпляра во всех её размещениях. Оригинал в библиотеке остаётся прежним.</p>
          <Button size="sm" variant="secondary" decoration="bare" className={`${panelStyles.action} ${panelStyles.danger}`} onClick={() => actions.remove(node.id)}>{node.type === 'location' ? 'Удалить локацию, освободить содержимое' : 'Удалить экземпляр'}</Button>
        </div> : <>
          {!hasInstanceEditor(node.data.entityType) && node.data.facts && <p>{node.data.facts}</p>}
          {node.data.description && <ContentEditor rootClassName={panelStyles.contentEditor} accessibleLabel="Описание экземпляра" value={node.data.description} onValueChange={ignoreChange} readOnly renderPreview />}
        </>}
        {(node.type === 'location' || node.data.entityType === 'playerCharacter') && <section><h3 className={styles.inspectorTitle}>Содержимое</h3>{diagram.nodes.filter(item => containerOf(item) === node.id).map(item => <div key={item.id} className={styles.member}>
          <button type="button" onClick={() => actions.open(item.id)}>{item.data.title}</button>{!readOnly && <><button type="button" onClick={() => actions.edit(item.id)}>Изменить / перенести</button><button type="button" onClick={() => actions.release(item.id)}>Извлечь</button></>}
        </div>)}</section>}
      </>}
      {edge && <div className={styles.editorFields}>
        <label>Подпись<TextInput rootClassName={panelStyles.fieldControl} aria-label="Подпись связи" value={edge.label ?? ''} readOnly={readOnly} onChange={event => onChange(current => ({ ...current, edges: current.edges.map(item => item.id === edge.id ? { ...item, label: event.target.value } : item) }))} /></label>
        <EdgeAppearanceControls data={edge.data} disabled={readOnly} onChange={patch => {
          if (!readOnly) onChange(current => ({ ...current, edges: current.edges.map(item => item.id === edge.id ? { ...item, data: { ...item.data, ...patch } } : item) }))
        }} />
        <ContentEditor rootClassName={panelStyles.contentEditor} accessibleLabel="Описание связи" value={edge.data?.description ?? ''} readOnly={readOnly} renderPreview onValueChange={description => onChange(current => ({ ...current, edges: current.edges.map(item => item.id === edge.id ? { ...item, data: { ...item.data, description } } : item) }))} />
        {(['source', 'target'] as const).map(key => <div key={key} className={styles.statField}><span>{key === 'source' ? 'Откуда' : 'Куда'}</span><Combobox rootClassName={panelStyles.fieldControl} aria-label={key === 'source' ? 'Начало связи' : 'Конец связи'} value={edge[key]} readOnly={readOnly}
          options={diagram.nodes.filter(item => item.id !== edge[key === 'source' ? 'target' : 'source']).map(item => ({ value: item.id, label: item.data.title }))}
          onValueChange={value => { if (value !== null) onChange(current => ({ ...current, edges: current.edges.map(item => item.id === edge.id ? { ...item, [key]: value } : item) })) }} />
        </div>)}
        {!readOnly && <Button size="sm" variant="secondary" decoration="bare" className={`${panelStyles.action} ${panelStyles.danger}`} onClick={() => actions.removeEdge(edge.id)}>Удалить связь</Button>}
      </div>}
      {reference && !readOnly && !editing && (selection.kind === 'library' || !node || !hasInstanceEditor(node.data.entityType)) && <>
        {selection.kind === 'library' && canPlaceReference(reference) && <Button size="sm" decoration="minimal" className={panelStyles.action} onClick={() => onAdd(reference)}>Добавить на холст</Button>}
        {node && <p className={styles.hint}>Энциклопедический оригинал / исходный материал</p>}
        <SourceCard key={`${reference.source}:${reference.entityId}`} reference={reference} onOpen={onOpen} />
      </>}
      {readOnly && <p className={styles.hint}>Только материалы, разрешённые сервером для публичного стола.</p>}
    </ScrollArea>
  </aside>
}
