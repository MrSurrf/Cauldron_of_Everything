import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { addEdge, applyEdgeChanges, applyNodeChanges, Background, Controls, ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react'
import type { XYPosition } from '@xyflow/react'
import { Button, Panel, Popover, TextInput } from '../../../shared/ui'
import { loadPublicTable } from '../model/campaignApi'
import type { LibraryReference } from '../model/library'
import { canPlaceReference, entityLabel } from '../model/library'
import { hasInstanceEditor } from '../model/instanceStatBlock'
import { canContain, changeDiagram as updateDiagram, createCanvasObject, createDiagram, createInstance, createTable, duplicatePlacement, LEGACY_STORAGE_KEY, moveToLocation, parseTable, placeCanvasObject, placeExistingEntity, removeInstances, resolveDiagram, resolveNode, serializeTable, TABLE_STORAGE_KEY, updateCanvasEntity, validReference } from '../model/table'
import type { CanvasEntity, EntityNode, NodeEntityType } from '../model/table'
import type { CampaignTable as TableState, Diagram, TableEdge, TableNode } from '../model/table'
import { NodeRenderer } from './NodeRenderer'
import { ConnectionPreview, ContourEdge } from './ContourEdge'
import { canResizeNode, EXPANDED_CREATURE_WIDTH, nodeVisual } from '../model/nodeGeometry'
import { TableHistory } from '../model/tableHistory'
import { LocalEntityEditor, LocalEntityInspector } from './LocalEntityPanel'
import { LibrarySidebar } from './LibrarySidebar'
import { ENTITY_DRAG_TYPE, INSTANCE_DRAG_TYPE, TableContext } from './tableContext'
import { TableInspector } from './TableInspector'
import type { Selection } from './TableInspector'
import '@xyflow/react/dist/style.css'
import styles from './CampaignTable.module.css'

const nodeTypes = { entity: NodeRenderer, location: NodeRenderer, note: NodeRenderer }
const edgeTypes = { contour: ContourEdge }
const creatableTypes = ['location', 'note', 'playerCharacter', 'npc', 'quest', 'faction'] as const
type CreationAnchor = { menuX: number; menuY: number; position: XYPosition }
type HistoryControls = { beginGesture: () => void; endGesture: () => void; undo: () => void; redo: () => void }
const noHistory: HistoryControls = { beginGesture: () => {}, endGesture: () => {}, undo: () => {}, redo: () => {} }
function loadTable() {
  try {
    const raw = localStorage.getItem(TABLE_STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
    return { table: raw ? parseTable(raw) : createTable(), error: '' }
  } catch {
    return { table: createTable(), error: 'Не удалось восстановить схемы. Автосохранение отключено, чтобы не затереть прежние данные.' }
  }
}

function locationAt(diagram: Diagram, position: XYPosition, measured: (id: string) => { width?: number; height?: number } | undefined) {
  return [...diagram.nodes].reverse().find(node => {
    if (node.type !== 'location') return false
    const size = measured(node.id)
    return position.x >= node.position.x && position.y >= node.position.y
      && position.x <= node.position.x + (size?.width ?? node.width ?? 340)
      && position.y <= node.position.y + (size?.height ?? node.height ?? 260)
  })?.id
}

function compactNode(node: TableNode, expanded = false): TableNode {
  if (node.data.entityType === 'creature' && expanded) return {
    ...node, width: EXPANDED_CREATURE_WIDTH, height: undefined, data: { ...node.data, display: { creatureExpanded: true } },
  }
  return canResizeNode(node.data.entityType)
    ? { ...node, width: node.width ?? nodeVisual(node.data.entityType).width }
    : { ...node, width: nodeVisual(node.data.entityType).width, height: undefined }
}

function focusIsEditing() {
  const focused = document.activeElement
  return focused instanceof Element && Boolean(focused.closest('input, textarea, select, [contenteditable], [role="textbox"], [role="menu"], button'))
}

function DiagramCanvas({ table, diagram, onChange, onLayout, onPlaceObject, onUpdateEntity, onDuplicate, onPlaceExisting, onSelectDiagram, onCreateDiagram, libraryCollapsed, onToggleLibrary, readOnly, history }: {
  table: TableState; diagram: Diagram; readOnly: boolean
  history: HistoryControls
  onChange: (update: (diagram: Diagram) => Diagram) => void
  onLayout: (layout: Partial<TableState['layout']>) => void
  onPlaceObject: (object: { entity: CanvasEntity; node: EntityNode }, name: string) => void
  onDuplicate: (id: string, placementId: string) => void
  onPlaceExisting: (entityId: string, diagramId: string) => void
  onUpdateEntity: (id: string, changes: Partial<Pick<CanvasEntity, 'name' | 'description'>>) => void
  onSelectDiagram: (id: string) => void; onCreateDiagram: (name: string) => void
  libraryCollapsed: boolean; onToggleLibrary: () => void
}) {
  const flow = useReactFlow<TableNode, TableEdge>()
  const canvasRef = useRef<HTMLDivElement>(null)
  const creationRef = useRef<HTMLDivElement>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [anchor, setAnchor] = useState<CreationAnchor | null>(null)
  const [draft, setDraft] = useState<{ entity: CanvasEntity; node: EntityNode } | null>(null)
  const [connectionSource, setConnectionSource] = useState<string | null>(null)
  const [connectionTarget, setConnectionTarget] = useState<string | null>(null)
  const [connectionPointer, setConnectionPointer] = useState<XYPosition | null>(null)
  const [editorEntityId, setEditorEntityId] = useState<string | null>(null)
  const [schemesOpen, setSchemesOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [expandedCreatures, setExpandedCreatures] = useState<ReadonlySet<string>>(() => new Set())
  const [creatureMeasurements, setCreatureMeasurements] = useState<ReadonlyMap<string, NonNullable<TableNode['measured']>>>(() => new Map())
  useEffect(() => {
    if (readOnly || editorEntityId || draft) return
    const handleHistory = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.altKey || !(event.ctrlKey || event.metaKey) || event.code !== 'KeyZ') return
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable], [role="textbox"]')) return
      event.preventDefault()
      setSelection(null); setAnchor(null); setConnectionSource(null); setConnectionTarget(null); setConnectionPointer(null)
      if (event.shiftKey) history.redo(); else history.undo()
    }
    document.addEventListener('keydown', handleHistory)
    return () => document.removeEventListener('keydown', handleHistory)
  }, [readOnly, editorEntityId, draft, history])
  const linking = connectionSource !== null && diagram.nodes.some(node => node.id === connectionSource && !node.data.locationId)
  const cancelConnection = () => { setConnectionSource(null); setConnectionTarget(null); setConnectionPointer(null) }
  useEffect(() => {
    if (!connectionSource) return
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setConnectionSource(null); setConnectionTarget(null); setConnectionPointer(null) } }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [connectionSource])
  const center = () => {
    const rect = canvasRef.current?.getBoundingClientRect()
    return rect ? flow.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }) : { x: 100, y: 100 }
  }
  const findLocation = (current: Diagram, position: XYPosition) => locationAt(current, position, id => flow.getNode(id)?.measured)
  useEffect(() => {
    if (!anchor) return
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node && !creationRef.current?.contains(event.target)) {
        setAnchor(null)
      }
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [anchor])
  function showCreationAt(clientX: number, clientY: number) {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect || readOnly) return
    cancelConnection()
    const x = clientX - rect.left
    const y = clientY - rect.top
    setAnchor({ menuX: Math.max(8, Math.min(x + 8, rect.width - 212)),
      menuY: Math.max(8, Math.min(y + 8, rect.height - 320)), position: flow.screenToFlowPosition({ x: clientX, y: clientY }) })
    setSelection(null)
  }
  function beginCreation(type: NodeEntityType) {
    if (!anchor) return
    setDraft(createCanvasObject(type, anchor.position))
    setAnchor(null)
  }
  function add(reference: LibraryReference, position?: XYPosition) {
    if (readOnly || !canPlaceReference(reference)) return
    const origin = center()
    const object = createInstance(reference, position ?? { x: origin.x - 90 + diagram.nodes.length % 5 * 24, y: origin.y - 75 + diagram.nodes.length % 5 * 24 })
    if (position && canContain(resolveNode(object.node, object.entity))) object.node.data.locationId = findLocation(diagram, position)
    onPlaceObject(object, object.entity.name)
  }
  function drop(event: DragEvent<HTMLDivElement>) {
    if (readOnly) return
    event.preventDefault()
    setAnchor(null)
    const position = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY })
    const instance = event.dataTransfer.getData(INSTANCE_DRAG_TYPE)
    if (instance) { onChange(current => moveToLocation(current, instance, findLocation(current, position), position)); return }
    try {
      const reference: unknown = JSON.parse(event.dataTransfer.getData(ENTITY_DRAG_TYPE))
      if (validReference(reference)) add(reference, position)
    } catch { /* Чужой payload не создаёт узел. */ }
  }
  const open = (id: string) => {
    const data = diagram.nodes.find(node => node.id === id)?.data
    if (data && !data.reference && !hasInstanceEditor(data.entityType)) setEditorEntityId(data.entityId)
    else setSelection({ kind: 'node', id, editing: false })
  }
  const edit = (id: string) => {
    const data = diagram.nodes.find(node => node.id === id)?.data
    if (data && !data.reference && !hasInstanceEditor(data.entityType)) setEditorEntityId(data.entityId)
    else setSelection({ kind: 'node', id, editing: true })
  }
  const openReference = (reference: LibraryReference) => setSelection({ kind: 'library', reference })
  const remove = (id: string) => { if (!readOnly) onChange(current => removeInstances(current, new Set([id]))) }
  const release = (id: string) => { if (!readOnly) onChange(current => moveToLocation(current, id)) }
  const duplicate = (id: string) => {
    if (readOnly) return
    const placementId = crypto.randomUUID()
    onDuplicate(id, placementId)
    if (diagram.nodes.find(node => node.id === id)?.data.reference) setSelection({ kind: 'node', id: placementId, editing: true })
  }
  const hidden = new Set(diagram.nodes.filter(node => node.data.locationId).map(node => node.id))
  const localEntities = new Map(table.entities?.map(entity => [entity.id, entity]) ?? [])
  const displayDiagram = diagram
  const visibleNodes = draft ? [...diagram.nodes, resolveNode(draft.node, draft.entity)] : diagram.nodes
  const selectedNode = selection?.kind === 'node' ? diagram.nodes.find(node => node.id === selection.id) : undefined
  const selectedEntity = selectedNode && !selectedNode.data.reference && !hasInstanceEditor(selectedNode.data.entityType) ? localEntities.get(selectedNode.data.entityId) : undefined
  const editedEntity = localEntities.get(editorEntityId ?? '')
  const closeSelection = () => {
    const id = selectedNode?.id
    setSelection(null)
    if (id) onChange(current => ({ ...current, nodes: current.nodes.map(node => node.id === id ? { ...node, selected: false } : node) }))
  }
  return <TableContext.Provider value={{ diagram: displayDiagram, readOnly, open, edit, remove, release, duplicate,
    toggleCreature: id => setExpandedCreatures(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    }),
    beginGesture: history.beginGesture, endGesture: history.endGesture,
    diagrams: table.diagrams, connectionSource: linking ? connectionSource : null,
    startConnection: (id, pointer) => { if (!readOnly) { setConnectionSource(id); setConnectionTarget(null); setConnectionPointer(pointer ? flow.screenToFlowPosition(pointer) : null); setAnchor(null); setSelection(null) } },
    placeOnDiagram: (id, diagramId) => { const node = diagram.nodes.find(item => item.id === id); if (node && !readOnly) onPlaceExisting(node.data.entityId, diagramId) },
    draft: draft ? { id: draft.node.id, type: draft.entity.entityType as NodeEntityType,
      commit: name => { if (!name.trim()) return; onPlaceObject(draft, name); setDraft(null) },
      cancel: () => setDraft(null) } : undefined }}>
    {editedEntity ? <LocalEntityEditor key={editedEntity.id} entity={editedEntity} diagramName={diagram.name} readOnly={readOnly}
      onBack={() => setEditorEntityId(null)} onUpdate={changes => onUpdateEntity(editedEntity.id, changes)} /> : <section className={styles.board} aria-label="Схема кампании">
      <header className={styles.boardHeader}><div className={styles.schemeHeading}>
        <Popover aria-label="Схемы кампании" open={schemesOpen} onOpenChange={setSchemesOpen} content={<div className={styles.schemeMenu}>
          <nav aria-label="Выбор схемы">{table.diagrams.map(item => <button type="button" key={item.id} aria-current={item.id === diagram.id ? 'page' : undefined}
            onClick={() => { onSelectDiagram(item.id); setSchemesOpen(false) }}><span>{item.name}</span><small>{item.nodes.length}</small></button>)}</nav>
          {!readOnly && <><label>Название схемы<TextInput aria-label="Название схемы" value={diagram.name}
            onChange={event => onChange(current => ({ ...current, name: event.target.value }))} /></label>
            <form onSubmit={event => { event.preventDefault(); if (!newName.trim()) return; onCreateDiagram(newName.trim()); setNewName(''); setSchemesOpen(false) }}>
              <TextInput aria-label="Название новой схемы" placeholder="Новая схема" value={newName} maxLength={80} onChange={event => setNewName(event.target.value)} />
              <Button size="sm" type="submit" disabled={!newName.trim()}>Создать</Button>
            </form></>}
        </div>}><Button size="sm" variant="secondary" aria-label={`Выбрать схему: ${diagram.name}`}>{diagram.name} <span aria-hidden="true">⌄</span></Button></Popover>
        <span className={styles.schemeCount}>{diagram.nodes.length} узлов · {diagram.edges.length} связей</span>
        {!readOnly && libraryCollapsed && <Button size="sm" variant="secondary" onClick={onToggleLibrary}>Библиотека</Button>}
      </div>
        <div className={styles.actions}>
          <Button size="sm" variant="secondary" decoration="minimal" onClick={() => void flow.fitView({ padding: 0.25, maxZoom: 1 })}>Показать всё</Button>
        </div>
      </header>
      <div ref={canvasRef} className={styles.canvas} data-cursor-light-background="" data-linking={linking} onDrop={drop}
        onPointerMove={event => { if (linking) setConnectionPointer(flow.screenToFlowPosition({ x: event.clientX, y: event.clientY })) }} onDragOver={event => {
        if (!readOnly && event.dataTransfer.types.some(type => [ENTITY_DRAG_TYPE, INSTANCE_DRAG_TYPE].includes(type))) {
          event.preventDefault(); event.dataTransfer.dropEffect = event.dataTransfer.types.includes(INSTANCE_DRAG_TYPE) ? 'move' : 'copy'
        }
      }}>
        <ReactFlow<TableNode, TableEdge> nodes={visibleNodes.map(node => ({ ...compactNode(node, expandedCreatures.has(node.id)), hidden: hidden.has(node.id),
          measured: node.data.entityType === 'creature' ? creatureMeasurements.get(node.id) ?? node.measured : node.measured,
          className: [node.className, linking ? 'nopan' : undefined].filter(Boolean).join(' '), draggable: node.id === draft?.node.id ? false : node.draggable }))}
          edges={diagram.edges.map(edge => ({ ...edge, type: 'contour', sourceHandle: 'out', targetHandle: 'in', hidden: hidden.has(edge.source) || hidden.has(edge.target) }))} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
          defaultViewport={diagram.viewport} minZoom={0.2} maxZoom={2} colorMode="dark"
          nodesDraggable={!readOnly && !linking} nodesConnectable={false} edgesReconnectable={false}
          onNodesChange={changes => {
            // React Flow требует актуальных measured при следующем контролируемом рендере.
            // Эти размеры живут только в UI: раскрытие не меняет документ и историю.
            const measurements = changes.filter(change => change.type === 'dimensions' && change.dimensions
              && diagram.nodes.find(node => node.id === change.id)?.data.entityType === 'creature')
            if (measurements.length) setCreatureMeasurements(current => {
              const next = new Map(current)
              for (const change of measurements) if (change.type === 'dimensions' && change.dimensions) next.set(change.id, change.dimensions)
              return next
            })
            if (readOnly) return
            // Анимационные измерения существа — не resize размещения и не шаг Undo.
            const persistedChanges = changes.filter(change => (!('id' in change) || change.id !== draft?.node.id)
              && !(change.type === 'dimensions' && diagram.nodes.find(node => node.id === change.id)?.data.entityType === 'creature'))
            if (!persistedChanges.length) return
            onChange(current => {
              const removed = new Set(persistedChanges.filter(change => change.type === 'remove').map(change => change.id))
              const next = removed.size ? removeInstances(current, removed) : current
              return { ...next, nodes: applyNodeChanges(persistedChanges.filter(change => change.type !== 'remove'), next.nodes) }
            })
          }}
          onNodeDragStart={readOnly ? undefined : history.beginGesture}
          onNodeDragStop={readOnly ? undefined : (event, node) => {
            if (canContain(node)) {
              const position = 'clientX' in event ? flow.screenToFlowPosition({ x: event.clientX, y: event.clientY })
                : { x: node.position.x + (node.width ?? 260) / 2, y: node.position.y + (node.height ?? 150) / 2 }
              onChange(current => moveToLocation(current, node.id, findLocation(current, position)))
            }
            history.endGesture()
          }}
          onEdgesChange={readOnly ? undefined : changes => onChange(current => ({ ...current, edges: applyEdgeChanges(changes, current.edges) }))}
          onNodeClick={(_, node) => {
            setAnchor(null)
            if (linking && !readOnly) {
              if (node.id !== connectionSource && node.id !== draft?.node.id) {
                onChange(current => ({ ...current, edges: addEdge({ id: crypto.randomUUID(), source: connectionSource!, target: node.id }, current.edges) })); cancelConnection()
              }
              return
            }
            if (node.id !== draft?.node.id) setSelection({ kind: 'node', id: node.id, editing: false })
          }}
          onNodeMouseEnter={(_, node) => { if (linking && node.id !== connectionSource && node.id !== draft?.node.id) setConnectionTarget(node.id) }}
          onNodeMouseLeave={() => setConnectionTarget(null)}
          onNodeDoubleClick={(_, node) => { if (!linking && node.id !== draft?.node.id) open(node.id) }}
          onEdgeClick={(_, edge) => { setAnchor(null); setSelection({ kind: 'edge', id: edge.id }) }}
          onPaneClick={() => { setSelection(null); setAnchor(null); cancelConnection() }}
          onPaneContextMenu={event => { if (readOnly) return; event.preventDefault(); showCreationAt(event.clientX, event.clientY) }}
          onMoveStart={() => setAnchor(null)}
          onMoveEnd={readOnly ? undefined : (_, viewport) => onChange(current => ({ ...current, viewport }))}
          deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']} onBeforeDelete={async () => !focusIsEditing()} aria-label="Холст кампании"
        >
          <Background gap={24} size={1} color="var(--color-border-default)" /><Controls showInteractive={false} />
          {linking && <ConnectionPreview source={connectionSource!} target={connectionTarget} pointer={connectionPointer} />}
        </ReactFlow>
        {linking && <div className={styles.connectionMode} role="status">Выберите второй узел <button type="button" onClick={cancelConnection}>Отмена · Esc</button></div>}
        {anchor && !readOnly && !draft && <div ref={creationRef} className={styles.creationLayer}>
          <div className={styles.creationMenu} role="menu" aria-label="Действия с холстом"
            style={{ left: anchor.menuX, top: anchor.menuY }}>
            <span>Создать</span>
            {creatableTypes.map(type => <button key={type} type="button" role="menuitem" onClick={() => beginCreation(type)}>{entityLabel(type)}</button>)}
            <span>Добавить существующее</span>
            <button type="button" role="menuitem" disabled>Пока недоступно</button>
          </div>
        </div>}
        {!diagram.nodes.length && !draft && <div className={styles.emptyCanvas}><h3>{readOnly ? 'Схема пуста' : 'Начните свою историю'}</h3><p>{readOnly ? 'На публичном столе пока нет узлов.' : 'Нажмите правой кнопкой на холст или перетащите материал из библиотеки.'}</p></div>}
      </div>
    </section>}
    {selectedNode && selectedEntity && !editedEntity && <LocalEntityInspector key={selectedEntity.id} entity={selectedEntity}
      node={selectedNode} diagram={displayDiagram} width={table.layout.inspectorWidth} readOnly={readOnly}
      onResize={inspectorWidth => onLayout({ inspectorWidth })} onClose={closeSelection}
      onOpenFull={() => setEditorEntityId(selectedEntity.id)} onUpdate={changes => onUpdateEntity(selectedEntity.id, changes)} />}
    {!readOnly && !libraryCollapsed && <LibrarySidebar section={table.layout.section} query={table.layout.query} width={table.layout.libraryWidth}
      onCollapse={onToggleLibrary} onSection={section => onLayout({ section, query: '' })}
      onQuery={query => onLayout({ query })} onResize={libraryWidth => onLayout({ libraryWidth })} onOpen={openReference} onAdd={add} />}
    {selection && !selectedEntity && !editedEntity && <TableInspector key={selection.kind === 'library' ? `library:${selection.reference.entityId}` : `${selection.kind}:${selection.id}`}
      selection={selection} width={table.layout.inspectorWidth} onResize={inspectorWidth => onLayout({ inspectorWidth })} onClose={() => setSelection(null)} onChange={onChange} onOpen={openReference} onAdd={add} />}
  </TableContext.Provider>
}

function Workspace({ table, commit, readOnly = false, history = noHistory }: { table: TableState; commit: (update: (table: TableState) => TableState) => void; readOnly?: boolean; history?: HistoryControls }) {
  const [libraryCollapsed, setLibraryCollapsed] = useState(false)
  const active = resolveDiagram(table, table.diagrams.find(diagram => diagram.id === table.activeId)!)
  const changeDiagram = useCallback((update: (diagram: Diagram) => Diagram) => {
    if (!readOnly) commit(current => updateDiagram(current, active.id, update))
  }, [commit, active.id, readOnly])
  return <div className={styles.workspace} data-public={readOnly} data-collapsed={libraryCollapsed}
    style={{ '--library-width': table.layout.libraryWidth === 336 ? '30%' : `${table.layout.libraryWidth}px`, '--inspector-width': `${table.layout.inspectorWidth}px` } as CSSProperties}>
    <ReactFlowProvider key={active.id}><DiagramCanvas table={table} diagram={active} onChange={changeDiagram} readOnly={readOnly} history={history}
      libraryCollapsed={libraryCollapsed} onToggleLibrary={() => setLibraryCollapsed(value => !value)}
      onSelectDiagram={id => commit(current => ({ ...current, activeId: id }))}
      onCreateDiagram={name => { const diagram = createDiagram(name); commit(current => ({ ...current, activeId: diagram.id, diagrams: [...current.diagrams, diagram] })) }}
      onPlaceObject={(object, name) => { if (!readOnly) commit(current => placeCanvasObject(current, active.id, object, name)) }}
      onUpdateEntity={(id, changes) => { if (!readOnly) commit(current => updateCanvasEntity(current, id, changes)) }}
      onDuplicate={(id, placementId) => { if (!readOnly) commit(current => duplicatePlacement(current, active.id, id, placementId)) }}
      onPlaceExisting={(entityId, diagramId) => { if (!readOnly) commit(current => placeExistingEntity(current, diagramId, entityId, { x: 100, y: 100 })) }}
      onLayout={layout => commit(current => ({ ...current, layout: { ...current.layout, ...layout } }))} /></ReactFlowProvider>
  </div>
}

function TableToolbar({ publicMode, status, onPrivate, onPublic, draftId, onDraftId, onOpenPublic }: {
  publicMode: boolean; status: string; onPrivate: () => void; onPublic: () => void
  draftId?: string; onDraftId?: (value: string) => void; onOpenPublic?: () => void
}) {
  return <header className={styles.heading}>
    <h1>Мой стол</h1><span className={styles.saveStatus} role="status">{status}</span>
    <div className={styles.tableModes} role="group" aria-label="Режим стола">
      <Button size="sm" variant={publicMode ? 'secondary' : 'primary'} aria-pressed={!publicMode} onClick={onPrivate}>Закрытый</Button>
      <Button size="sm" variant={publicMode ? 'primary' : 'secondary'} aria-pressed={publicMode} onClick={onPublic}>Публичный</Button>
    </div>
    {publicMode && <form className={styles.publicForm} onSubmit={event => { event.preventDefault(); onOpenPublic?.() }}>
      <TextInput aria-label="ID кампании" placeholder="ID кампании" value={draftId ?? ''} onChange={event => onDraftId?.(event.target.value)} />
      <Button size="sm" type="submit" disabled={!draftId?.trim()}>Открыть</Button>
    </form>}
  </header>
}

function PrivateTable({ onPrivate, onPublic }: { onPrivate: () => void; onPublic: () => void }) {
  const [initial] = useState(loadTable)
  const [table, setTable] = useState(initial.table)
  const currentRef = useRef(table)
  const [history] = useState(() => new TableHistory())
  const [saveError, setSaveError] = useState(initial.error)
  const persist = useCallback((next: TableState) => {
    currentRef.current = next; setTable(next)
    if (initial.error) return
    try { localStorage.setItem(TABLE_STORAGE_KEY, serializeTable(next)); setSaveError('') }
    catch { setSaveError('Изменения не сохранены: хранилище браузера недоступно или заполнено.') }
  }, [initial.error])
  const commit = useCallback((update: (table: TableState) => TableState) => {
    const next = update(currentRef.current)
    history.record(currentRef.current, next)
    persist(next)
  }, [history, persist])
  const historyControls: HistoryControls = {
    beginGesture: () => history.begin(currentRef.current), endGesture: () => history.end(currentRef.current),
    undo: () => persist(history.undo(currentRef.current)), redo: () => persist(history.redo(currentRef.current)),
  }
  return <><TableToolbar publicMode={false} status={saveError ? 'Не сохранено' : 'Сохранено в этом браузере'} onPrivate={onPrivate} onPublic={onPublic} />
    {saveError && <p role="alert" className={styles.error}>{saveError}</p>}<Workspace table={table} commit={commit} history={historyControls} /></>
}

function PublicTable({ campaignId }: { campaignId: string }) {
  const [table, setTable] = useState<TableState | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!campaignId) return
    const controller = new AbortController()
    void loadPublicTable(campaignId, controller.signal).then(value => { if (!controller.signal.aborted) setTable(value) }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Публичный стол недоступен.')
    })
    return () => controller.abort()
  }, [campaignId])
  if (!campaignId) return <Panel><p>Введите ID кампании для загрузки публичного стола. Требуется серверный API; локальные закрытые схемы здесь не отображаются.</p></Panel>
  if (error) return <Panel><p role="alert">{error}</p><p>Закрытые материалы не загружались. Публичный API должен быть подключён бэкенд-разработчиком.</p></Panel>
  if (!table) return <p role="status">Проверка доступа и загрузка публичного стола…</p>
  return <Workspace table={table} commit={update => setTable(current => current ? update(current) : current)} readOnly />
}

export function CampaignTable() {
  const [params, setParams] = useSearchParams()
  const publicMode = params.get('table') === 'public'
  const campaignId = params.get('campaign') ?? ''
  const [draftId, setDraftId] = useState(campaignId)
  return <main className={styles.page}>
    {publicMode ? <><TableToolbar publicMode status="Просмотр с сервера" onPrivate={() => setParams({})}
      onPublic={() => setParams({ table: 'public', ...(campaignId ? { campaign: campaignId } : {}) })}
      draftId={draftId} onDraftId={setDraftId} onOpenPublic={() => { if (draftId.trim()) setParams({ table: 'public', campaign: draftId.trim() }) }} />
      <PublicTable key={campaignId} campaignId={campaignId} /></> : <PrivateTable onPrivate={() => setParams({})}
        onPublic={() => setParams({ table: 'public', ...(campaignId ? { campaign: campaignId } : {}) })} />}
  </main>
}
