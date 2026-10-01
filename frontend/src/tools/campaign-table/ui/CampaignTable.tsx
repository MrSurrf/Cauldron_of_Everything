import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { addEdge, applyEdgeChanges, applyNodeChanges, Background, Controls, ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react'
import type { XYPosition } from '@xyflow/react'
import { Button, Panel, Popover, TextInput } from '../../../shared/ui'
import { loadPublicTable } from '../model/campaignApi'
import type { LibraryReference } from '../model/library'
import { canContain, createCanvasObject, createDiagram, createInstance, createTable, LEGACY_STORAGE_KEY, materializeLegacyLocations, moveToLocation, parseTable, placeCanvasObject, removeInstances, serializeTable, TABLE_STORAGE_KEY, updateCanvasEntity } from '../model/table'
import type { CanvasEntity } from '../model/table'
import type { CampaignTable as TableState, Diagram, TableEdge, TableNode } from '../model/table'
import { MindMapNode } from './MindMapNode'
import { LocalEntityEditor, LocalEntityInspector } from './LocalEntityPanel'
import { LibrarySidebar } from './LibrarySidebar'
import { ENTITY_DRAG_TYPE, INSTANCE_DRAG_TYPE, TableContext } from './tableContext'
import { TableInspector } from './TableInspector'
import type { Selection } from './TableInspector'
import '@xyflow/react/dist/style.css'
import styles from './CampaignTable.module.css'

const nodeTypes = { entity: MindMapNode, location: MindMapNode, note: MindMapNode }
type CreationAnchor = { menuX: number; menuY: number; position: XYPosition }
function loadTable() {
  try {
    const raw = localStorage.getItem(TABLE_STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
    return { table: raw ? materializeLegacyLocations(parseTable(raw)) : createTable(), error: '' }
  } catch {
    return { table: createTable(), error: 'Не удалось восстановить схемы. Автосохранение отключено, чтобы не затереть прежние данные.' }
  }
}

function locationAt(diagram: Diagram, position: XYPosition) {
  return [...diagram.nodes].reverse().find(node => node.type === 'location' && position.x >= node.position.x
    && position.y >= node.position.y && position.x <= node.position.x + (node.width ?? 340) && position.y <= node.position.y + (node.height ?? 260))?.id
}

function DiagramCanvas({ table, diagram, onChange, onLayout, onPlaceObject, onUpdateEntity, onSelectDiagram, onCreateDiagram, libraryCollapsed, onToggleLibrary, readOnly }: {
  table: TableState; diagram: Diagram; readOnly: boolean
  onChange: (update: (diagram: Diagram) => Diagram) => void
  onLayout: (layout: Partial<TableState['layout']>) => void
  onPlaceObject: (object: { entity: CanvasEntity; node: TableNode }, name: string) => void
  onUpdateEntity: (id: string, changes: Partial<Pick<CanvasEntity, 'name' | 'description'>>) => void
  onSelectDiagram: (id: string) => void; onCreateDiagram: (name: string) => void
  libraryCollapsed: boolean; onToggleLibrary: () => void
}) {
  const flow = useReactFlow<TableNode, TableEdge>()
  const canvasRef = useRef<HTMLDivElement>(null)
  const creationRef = useRef<HTMLDivElement>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [anchor, setAnchor] = useState<CreationAnchor | null>(null)
  const [draft, setDraft] = useState<{ entity: CanvasEntity; node: TableNode } | null>(null)
  const [editorEntityId, setEditorEntityId] = useState<string | null>(null)
  const [schemesOpen, setSchemesOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const center = () => {
    const rect = canvasRef.current?.getBoundingClientRect()
    return rect ? flow.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }) : { x: 100, y: 100 }
  }
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
    const x = clientX - rect.left
    const y = clientY - rect.top
    setAnchor({ menuX: Math.max(8, Math.min(x + 8, rect.width - 212)),
      menuY: Math.max(8, Math.min(y + 8, rect.height - 176)), position: flow.screenToFlowPosition({ x: clientX, y: clientY }) })
    setSelection(null)
  }
  function beginCreation(type: 'location' | 'note') {
    if (!anchor) return
    setDraft(createCanvasObject(type, anchor.position))
    setAnchor(null)
  }
  function add(reference: LibraryReference, position?: XYPosition) {
    if (readOnly) return
    const origin = center()
    const node = createInstance(reference, position ?? { x: origin.x - 130 + diagram.nodes.length % 5 * 24, y: origin.y - 75 + diagram.nodes.length % 5 * 24 })
    onChange(current => {
      const next = { ...current, nodes: [...current.nodes, node] }
      return position && canContain(node) ? moveToLocation(next, node.id, locationAt(current, position)) : next
    })
  }
  function drop(event: DragEvent<HTMLDivElement>) {
    if (readOnly) return
    event.preventDefault()
    setAnchor(null)
    const position = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY })
    const instance = event.dataTransfer.getData(INSTANCE_DRAG_TYPE)
    if (instance) { onChange(current => moveToLocation(current, instance, locationAt(current, position), position)); return }
    try {
      const reference = JSON.parse(event.dataTransfer.getData(ENTITY_DRAG_TYPE)) as LibraryReference
      // Проверяем внешние DnD-данные тем же валидатором, что и сохранение.
      const test = createTable()
      test.diagrams[0].nodes = [createInstance(reference, position)]
      parseTable(serializeTable(test))
      add(reference, position)
    } catch { /* Чужой payload не создаёт узел. */ }
  }
  const open = (id: string) => setSelection({ kind: 'node', id, editing: false })
  const edit = (id: string) => {
    const localId = diagram.nodes.find(node => node.id === id)?.data.localEntityId
    if (localId && table.entities?.some(entity => entity.id === localId)) setEditorEntityId(localId)
    else setSelection({ kind: 'node', id, editing: true })
  }
  const openReference = (reference: LibraryReference) => setSelection({ kind: 'library', reference })
  const remove = (id: string) => { if (!readOnly) onChange(current => removeInstances(current, new Set([id]))) }
  const release = (id: string) => { if (!readOnly) onChange(current => moveToLocation(current, id)) }
  const duplicate = (id: string) => {
    if (readOnly) return
    const original = diagram.nodes.find(node => node.id === id)
    if (!original) return
    const copy: TableNode = { ...structuredClone(original), id: crypto.randomUUID(), selected: false,
      position: { x: original.position.x + 40, y: original.position.y + 40 } }
    onChange(current => ({ ...current, nodes: [...current.nodes, copy] }))
    edit(copy.id)
  }
  const hidden = new Set(diagram.nodes.filter(node => node.data.locationId).map(node => node.id))
  const localEntities = new Map(table.entities?.map(entity => [entity.id, entity]) ?? [])
  const displayDiagram = { ...diagram, nodes: diagram.nodes.map(node => {
    const entity = localEntities.get(node.data.localEntityId ?? '')
    return entity ? { ...node, data: { ...node.data, title: entity.name } } : node
  }) }
  const visibleNodes = draft ? [...displayDiagram.nodes, draft.node] : displayDiagram.nodes
  const selectedNode = selection?.kind === 'node' ? diagram.nodes.find(node => node.id === selection.id) : undefined
  const selectedEntity = localEntities.get(selectedNode?.data.localEntityId ?? '')
  const editedEntity = localEntities.get(editorEntityId ?? '')
  const closeSelection = () => {
    const id = selectedNode?.id
    setSelection(null)
    if (id) onChange(current => ({ ...current, nodes: current.nodes.map(node => node.id === id ? { ...node, selected: false } : node) }))
  }
  return <TableContext.Provider value={{ diagram: displayDiagram, readOnly, open, edit, remove, release, duplicate,
    draft: draft ? { id: draft.node.id, type: draft.entity.entityType,
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
      <div ref={canvasRef} className={styles.canvas} onDrop={drop} onDragOver={event => {
        if (!readOnly && event.dataTransfer.types.some(type => [ENTITY_DRAG_TYPE, INSTANCE_DRAG_TYPE].includes(type))) {
          event.preventDefault(); event.dataTransfer.dropEffect = event.dataTransfer.types.includes(INSTANCE_DRAG_TYPE) ? 'move' : 'copy'
        }
      }}>
        <ReactFlow<TableNode, TableEdge> nodes={visibleNodes.map(node => ({ ...node, hidden: hidden.has(node.id), draggable: node.id === draft?.node.id ? false : node.draggable }))}
          edges={diagram.edges.map(edge => ({ ...edge, hidden: hidden.has(edge.source) || hidden.has(edge.target) }))} nodeTypes={nodeTypes}
          defaultViewport={diagram.viewport} minZoom={0.2} maxZoom={2} colorMode="dark"
          nodesDraggable={!readOnly} nodesConnectable={!readOnly} edgesReconnectable={false}
          onNodesChange={readOnly ? undefined : changes => {
            const persistedChanges = changes.filter(change => !('id' in change) || change.id !== draft?.node.id)
            if (!persistedChanges.length) return
            onChange(current => {
              const removed = new Set(persistedChanges.filter(change => change.type === 'remove').map(change => change.id))
              const next = removed.size ? removeInstances(current, removed) : current
              return { ...next, nodes: applyNodeChanges(persistedChanges.filter(change => change.type !== 'remove'), next.nodes) }
            })
          }}
          onNodeDragStop={readOnly ? undefined : (_, node) => {
            if (canContain(node)) onChange(current => moveToLocation(current, node.id, locationAt(current, {
              x: node.position.x + (node.width ?? 260) / 2, y: node.position.y + (node.height ?? 150) / 2,
            })))
          }}
          onEdgesChange={readOnly ? undefined : changes => onChange(current => ({ ...current, edges: applyEdgeChanges(changes, current.edges) }))}
          onConnect={readOnly ? undefined : connection => onChange(current => ({ ...current, edges: addEdge(connection, current.edges) }))}
          isValidConnection={connection => connection.source !== connection.target}
          onNodeClick={(_, node) => { setAnchor(null); if (node.id !== draft?.node.id) open(node.id) }}
          onNodeDoubleClick={(_, node) => { const id = node.data.localEntityId; if (id && localEntities.has(id)) setEditorEntityId(id) }}
          onEdgeClick={(_, edge) => { setAnchor(null); setSelection({ kind: 'edge', id: edge.id }) }}
          onPaneClick={() => { setSelection(null); setAnchor(null) }}
          onPaneContextMenu={event => { if (readOnly) return; event.preventDefault(); showCreationAt(event.clientX, event.clientY) }}
          onMoveStart={() => setAnchor(null)}
          onMoveEnd={readOnly ? undefined : (_, viewport) => onChange(current => ({ ...current, viewport }))}
          deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']} aria-label="Холст кампании"
        >
          <Background gap={24} size={1} color="var(--color-border-default)" /><Controls showInteractive={false} />
        </ReactFlow>
        {anchor && !readOnly && !draft && <div ref={creationRef} className={styles.creationLayer}>
          <div className={styles.creationMenu} role="menu" aria-label="Действия с холстом"
            style={{ left: anchor.menuX, top: anchor.menuY }}>
            <span>Создать</span>
            <button type="button" role="menuitem" onClick={() => beginCreation('location')}>Локация</button>
            <button type="button" role="menuitem" onClick={() => beginCreation('note')}>Заметка</button>
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

function Workspace({ table, commit, readOnly = false }: { table: TableState; commit: (update: (table: TableState) => TableState) => void; readOnly?: boolean }) {
  const [libraryCollapsed, setLibraryCollapsed] = useState(false)
  const active = table.diagrams.find(diagram => diagram.id === table.activeId)!
  const changeDiagram = useCallback((update: (diagram: Diagram) => Diagram) => {
    if (!readOnly) commit(current => ({ ...current, diagrams: current.diagrams.map(diagram => diagram.id === active.id ? update(diagram) : diagram) }))
  }, [commit, active.id, readOnly])
  return <div className={styles.workspace} data-public={readOnly} data-collapsed={libraryCollapsed}
    style={{ '--library-width': table.layout.libraryWidth === 336 ? '30%' : `${table.layout.libraryWidth}px`, '--inspector-width': `${table.layout.inspectorWidth}px` } as CSSProperties}>
    <ReactFlowProvider key={active.id}><DiagramCanvas table={table} diagram={active} onChange={changeDiagram} readOnly={readOnly}
      libraryCollapsed={libraryCollapsed} onToggleLibrary={() => setLibraryCollapsed(value => !value)}
      onSelectDiagram={id => commit(current => ({ ...current, activeId: id }))}
      onCreateDiagram={name => { const diagram = createDiagram(name); commit(current => ({ ...current, activeId: diagram.id, diagrams: [...current.diagrams, diagram] })) }}
      onPlaceObject={(object, name) => commit(current => placeCanvasObject(current, active.id, object, name))}
      onUpdateEntity={(id, changes) => { if (!readOnly) commit(current => updateCanvasEntity(current, id, changes)) }}
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
  const [saveError, setSaveError] = useState(initial.error)
  const commit = useCallback((update: (table: TableState) => TableState) => {
    const next = update(currentRef.current)
    currentRef.current = next; setTable(next)
    if (initial.error) return
    try { localStorage.setItem(TABLE_STORAGE_KEY, serializeTable(next)); setSaveError('') }
    catch { setSaveError('Изменения не сохранены: хранилище браузера недоступно или заполнено.') }
  }, [initial.error])
  return <><TableToolbar publicMode={false} status={saveError ? 'Не сохранено' : 'Сохранено в этом браузере'} onPrivate={onPrivate} onPublic={onPublic} />
    {saveError && <p role="alert" className={styles.error}>{saveError}</p>}<Workspace table={table} commit={commit} /></>
}

function PublicTable({ campaignId }: { campaignId: string }) {
  const [table, setTable] = useState<TableState | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!campaignId) return
    const controller = new AbortController()
    void loadPublicTable(campaignId, controller.signal).then(value => { if (!controller.signal.aborted) setTable(materializeLegacyLocations(value)) }).catch((reason: unknown) => {
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
