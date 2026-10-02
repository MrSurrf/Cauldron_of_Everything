import { useEffect, useState } from 'react'
import { CreatureFullView, getCreatureById } from '../../../entities/creature'
import type { CreatureEntity } from '../../../entities/creature'
import { fetchEncyclopedia } from '../../../entities/encyclopedia'
import type { EncyclopediaEntry } from '../../../entities/encyclopedia'
import { Button, TextInput } from '../../../shared/ui'
import { ContentEditor } from '../../../shared/ui/ContentEditor'
import { RichContent } from '../../../shared/ui/RichContent'
import { campaignRequest } from '../model/campaignApi'
import type { OwnedMaterial } from '../model/campaignApi'
import { canPlaceReference } from '../model/library'
import { EntityReferenceLinks } from './EntityReferenceLinks'
import { hasInstanceEditor } from '../model/instanceStatBlock'
import { InstanceStatBlockPanel } from './InstanceStatBlockPanel'
import type { LibraryReference } from '../model/library'
import { canContain, moveToLocation } from '../model/table'
import { canResizeNode } from '../model/nodeGeometry'
import type { Diagram, TableNode } from '../model/table'
import { ResizeGrip } from './ResizeGrip'
import { useTableActions } from './tableContext'
import styles from './CampaignTable.module.css'

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
    {result?.entry && <><h3>{result.entry.name}</h3>{result.entry.content_html
      ? <RichContent html={result.entry.content_html} /> : <p className={styles.plainContent}>{result.entry.content_text || 'Описание отсутствует.'}</p>}</>}
    {result?.material && <><h3>{result.material.name}</h3><ContentEditor accessibleLabel="Описание материала" value={result.material.description} onValueChange={ignoreChange} readOnly renderPreview /></>}
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
  return <aside className={styles.inspectorWindow} aria-label="Карточка и редактор">
    <ResizeGrip label="Ширина карточки" width={width} min={300} onResize={onResize} />
    <header className={styles.sectionHeading}><h2>{edge ? 'Связь' : editing ? 'Редактор экземпляра' : 'Карточка'}</h2><Button size="sm" onClick={onClose} aria-label="Закрыть карточку">×</Button></header>
    <div className={styles.inspectorBody}>
      {node && <>
        <h3>{node.data.title}</h3>
        {!readOnly && <div className={styles.actions}><Button size="sm" onClick={() => editing ? actions.open(node.id) : actions.edit(node.id)}>{editing ? 'Просмотр' : 'Редактировать экземпляр'}</Button>
          <Button size="sm" variant="secondary" onClick={() => actions.duplicate(node.id)}>Дублировать</Button></div>}
        {hasInstanceEditor(node.data.entityType) && <InstanceStatBlockPanel key={node.data.entityId} data={node.data} editing={editing} readOnly={readOnly}
          onOpen={onOpen}
          onChange={changes => changeNode(item => ({ ...item, data: { ...item.data, ...changes } }))} />}
        {editing ? <div className={styles.editorFields}>
          {!hasInstanceEditor(node.data.entityType) && <>
            <label>Название<TextInput aria-label="Название экземпляра" value={node.data.title} onChange={event => field('title', event.target.value)} /></label>
            <label>Ключевые данные<TextInput aria-label="Ключевые данные" value={node.data.facts} onChange={event => field('facts', event.target.value)} /></label>
          </>}
          <label>Описание</label><ContentEditor accessibleLabel="Описание экземпляра" value={node.data.description} onValueChange={value => field('description', value)} rows={5} renderPreview showStructureActions />
          <details className={styles.placementDetails}><summary>Размещение на схеме</summary>
          <div className={styles.geometry}>{(['x', 'y', 'width', 'height'] as const).filter(key => key === 'x' || key === 'y' || canResizeNode(node.data.entityType)).map(key => <label key={key}>{({ x: 'X', y: 'Y', width: 'Ширина', height: 'Высота' })[key]}
            <input aria-label={`Узел: ${key}`} type="number" value={key === 'x' || key === 'y' ? node.position[key] : node[key] ?? 260} onChange={event => {
              const value = event.target.valueAsNumber
              if (!Number.isFinite(value)) return
              changeNode(item => key === 'x' || key === 'y' ? { ...item, position: { ...item.position, [key]: value } }
                : { ...item, [key]: Math.max(key === 'width' ? (item.type === 'location' ? 300 : 220) : (item.type === 'location' ? 200 : 130), value) })
            }} /></label>)}</div>
          {canContain(node) && <label>Расположение<select aria-label="Локация экземпляра" value={node.data.locationId ?? ''} onChange={event => onChange(current => moveToLocation(current, node.id, event.target.value || undefined))}>
            <option value="">На холсте</option>{diagram.nodes.filter(item => item.type === 'location').map(item => <option key={item.id} value={item.id}>{item.data.title}</option>)}
          </select></label>}
          </details>
          <p className={styles.hint}>Изменяется Entity этого экземпляра во всех её размещениях. Оригинал в библиотеке остаётся прежним.</p>
          <Button size="sm" variant="secondary" onClick={() => actions.remove(node.id)}>{node.type === 'location' ? 'Удалить локацию, освободить содержимое' : 'Удалить экземпляр'}</Button>
        </div> : <>
          {!hasInstanceEditor(node.data.entityType) && node.data.facts && <p>{node.data.facts}</p>}
          {node.data.description && <ContentEditor accessibleLabel="Описание экземпляра" value={node.data.description} onValueChange={ignoreChange} readOnly renderPreview />}
        </>}
        {node.type === 'location' && <section><h3>Содержимое</h3>{diagram.nodes.filter(item => item.data.locationId === node.id).map(item => <div key={item.id} className={styles.member}>
          <button type="button" onClick={() => actions.open(item.id)}>{item.data.title}</button>{!readOnly && <><button type="button" onClick={() => actions.edit(item.id)}>Изменить / перенести</button><button type="button" onClick={() => actions.release(item.id)}>Извлечь</button></>}
        </div>)}</section>}
      </>}
      {edge && <div className={styles.editorFields}>
        <label>Подпись<TextInput aria-label="Подпись связи" value={edge.label ?? ''} readOnly={readOnly} onChange={event => onChange(current => ({ ...current, edges: current.edges.map(item => item.id === edge.id ? { ...item, label: event.target.value } : item) }))} /></label>
        <ContentEditor accessibleLabel="Описание связи" value={edge.data?.description ?? ''} readOnly={readOnly} renderPreview onValueChange={description => onChange(current => ({ ...current, edges: current.edges.map(item => item.id === edge.id ? { ...item, data: { ...item.data, description } } : item) }))} />
        {(['source', 'target'] as const).map(key => <label key={key}>{key === 'source' ? 'Откуда' : 'Куда'}<select aria-label={key === 'source' ? 'Начало связи' : 'Конец связи'} value={edge[key]} disabled={readOnly} onChange={event => onChange(current => ({ ...current, edges: current.edges.map(item => item.id === edge.id ? { ...item, [key]: event.target.value } : item) }))}>
          {diagram.nodes.filter(item => item.id !== edge[key === 'source' ? 'target' : 'source']).map(item => <option key={item.id} value={item.id}>{item.data.title}</option>)}
        </select></label>)}
        {!readOnly && <Button size="sm" onClick={() => onChange(current => ({ ...current, edges: current.edges.filter(item => item.id !== edge.id) }))}>Удалить связь</Button>}
      </div>}
      {reference && !readOnly && !editing && (selection.kind === 'library' || !node || !hasInstanceEditor(node.data.entityType)) && <>
        {selection.kind === 'library' && canPlaceReference(reference) && <Button size="sm" onClick={() => onAdd(reference)}>Добавить на холст</Button>}
        {node && <p className={styles.hint}>Энциклопедический оригинал / исходный материал</p>}
        <SourceCard key={`${reference.source}:${reference.entityId}`} reference={reference} onOpen={onOpen} />
      </>}
      {readOnly && <p className={styles.hint}>Только материалы, разрешённые сервером для публичного стола.</p>}
    </div>
  </aside>
}
