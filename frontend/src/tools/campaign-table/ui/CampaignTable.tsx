import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { addEdge, applyEdgeChanges, applyNodeChanges, Background, Controls, ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react'
import type { XYPosition } from '@xyflow/react'
import { Button, Panel, TextInput } from '../../../shared/ui'
import { loadPublicTable } from '../model/campaignApi'
import type { LibraryReference } from '../model/library'
import { canContain, createDiagram, createInstance, createLocation, createTable, LEGACY_STORAGE_KEY, moveToLocation, parseTable, removeInstances, serializeTable, TABLE_STORAGE_KEY } from '../model/table'
import type { CampaignTable as TableState, Diagram, TableEdge, TableNode } from '../model/table'
import { MindMapNode } from './MindMapNode'
import { LibrarySidebar } from './LibrarySidebar'
import { ENTITY_DRAG_TYPE, INSTANCE_DRAG_TYPE, TableContext } from './tableContext'
import { TableInspector } from './TableInspector'
import type { Selection } from './TableInspector'
import '@xyflow/react/dist/style.css'
import styles from './CampaignTable.module.css'

const nodeTypes = { entity: MindMapNode, location: MindMapNode }
function loadTable() {
  try {
    const raw = localStorage.getItem(TABLE_STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
    return { table: raw ? parseTable(raw) : createTable(), error: '' }
  } catch {
    return { table: createTable(), error: 'Не удалось восстановить схемы. Автосохранение отключено, чтобы не затереть прежние данные.' }
  }
}

function locationAt(diagram: Diagram, position: XYPosition) {
  return [...diagram.nodes].reverse().find(node => node.type === 'location' && position.x >= node.position.x
    && position.y >= node.position.y && position.x <= node.position.x + (node.width ?? 340) && position.y <= node.position.y + (node.height ?? 260))?.id
}

function DiagramCanvas({ table, diagram, onChange, onLayout, readOnly }: {
  table: TableState; diagram: Diagram; readOnly: boolean
  onChange: (update: (diagram: Diagram) => Diagram) => void
  onLayout: (layout: Partial<TableState['layout']>) => void
}) {
  const flow = useReactFlow<TableNode, TableEdge>()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const center = () => {
    const rect = canvasRef.current?.getBoundingClientRect()
    return rect ? flow.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }) : { x: 100, y: 100 }
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
  const edit = (id: string) => setSelection({ kind: 'node', id, editing: true })
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
  return <TableContext.Provider value={{ diagram, readOnly, open, edit, remove, release, duplicate }}>
    <section className={styles.board} aria-label="Схема кампании">
      <header className={styles.boardHeader}><div>
        {readOnly ? <h2>{diagram.name}</h2> : <TextInput aria-label="Название схемы" value={diagram.name} onChange={event => onChange(current => ({ ...current, name: event.target.value }))} />}
        <p>{diagram.nodes.length} узлов · {diagram.edges.length} связей</p></div>
        <div className={styles.actions}>
          {!readOnly && <Button size="sm" variant="secondary" onClick={() => {
            const node = createLocation(center()); onChange(current => ({ ...current, nodes: [...current.nodes, node] })); edit(node.id)
          }}>+ Локация</Button>}
          <Button size="sm" variant="secondary" decoration="minimal" onClick={() => void flow.fitView({ padding: 0.25, maxZoom: 1 })}>Показать всё</Button>
        </div>
      </header>
      <div ref={canvasRef} className={styles.canvas} onDrop={drop} onDragOver={event => {
        if (!readOnly && event.dataTransfer.types.some(type => [ENTITY_DRAG_TYPE, INSTANCE_DRAG_TYPE].includes(type))) {
          event.preventDefault(); event.dataTransfer.dropEffect = event.dataTransfer.types.includes(INSTANCE_DRAG_TYPE) ? 'move' : 'copy'
        }
      }}>
        <ReactFlow<TableNode, TableEdge> nodes={diagram.nodes.map(node => ({ ...node, hidden: hidden.has(node.id) }))}
          edges={diagram.edges.map(edge => ({ ...edge, hidden: hidden.has(edge.source) || hidden.has(edge.target) }))} nodeTypes={nodeTypes}
          defaultViewport={diagram.viewport} minZoom={0.2} maxZoom={2} colorMode="dark"
          nodesDraggable={!readOnly} nodesConnectable={!readOnly} edgesReconnectable={false}
          onNodesChange={readOnly ? undefined : changes => onChange(current => {
            const removed = new Set(changes.filter(change => change.type === 'remove').map(change => change.id))
            const next = removed.size ? removeInstances(current, removed) : current
            return { ...next, nodes: applyNodeChanges(changes.filter(change => change.type !== 'remove'), next.nodes) }
          })}
          onNodeDragStop={readOnly ? undefined : (_, node) => {
            if (canContain(node)) onChange(current => moveToLocation(current, node.id, locationAt(current, {
              x: node.position.x + (node.width ?? 260) / 2, y: node.position.y + (node.height ?? 150) / 2,
            })))
          }}
          onEdgesChange={readOnly ? undefined : changes => onChange(current => ({ ...current, edges: applyEdgeChanges(changes, current.edges) }))}
          onConnect={readOnly ? undefined : connection => onChange(current => ({ ...current, edges: addEdge(connection, current.edges) }))}
          isValidConnection={connection => connection.source !== connection.target}
          onNodeClick={(_, node) => open(node.id)} onEdgeClick={(_, edge) => setSelection({ kind: 'edge', id: edge.id })}
          onPaneClick={() => setSelection(null)}
          onMoveEnd={readOnly ? undefined : (_, viewport) => onChange(current => ({ ...current, viewport }))}
          deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']} aria-label="Холст кампании"
        >
          <Background gap={24} size={1} color="var(--color-border-default)" /><Controls showInteractive={false} />
        </ReactFlow>
        {!diagram.nodes.length && <div className={styles.emptyCanvas}><h3>{readOnly ? 'Схема пуста' : 'Начните свою историю'}</h3><p>{readOnly ? 'На публичном столе пока нет узлов.' : 'Перетащите материал из библиотеки на холст. Соедините точки по краям узлов или создайте локацию для существ.'}</p></div>}
      </div>
      <footer className={styles.boardFooter}>{readOnly ? 'Публичный стол · только просмотр' : 'Перетаскивание — перемещение · Колесо — масштаб · Delete — удалить · Нажмите на связь, чтобы подписать её'}</footer>
    </section>
    {!readOnly && <LibrarySidebar section={table.layout.section} query={table.layout.query} width={table.layout.libraryWidth}
      onSection={section => onLayout({ section, query: '' })} onQuery={query => onLayout({ query })} onResize={libraryWidth => onLayout({ libraryWidth })} onOpen={openReference} onAdd={add} />}
    {selection && <TableInspector key={selection.kind === 'library' ? `library:${selection.reference.entityId}` : `${selection.kind}:${selection.id}`}
      selection={selection} width={table.layout.inspectorWidth} onResize={inspectorWidth => onLayout({ inspectorWidth })} onClose={() => setSelection(null)} onChange={onChange} onOpen={openReference} onAdd={add} />}
  </TableContext.Provider>
}

function Workspace({ table, commit, readOnly = false }: { table: TableState; commit: (update: (table: TableState) => TableState) => void; readOnly?: boolean }) {
  const [newName, setNewName] = useState('')
  const active = table.diagrams.find(diagram => diagram.id === table.activeId)!
  const changeDiagram = useCallback((update: (diagram: Diagram) => Diagram) => {
    if (!readOnly) commit(current => ({ ...current, diagrams: current.diagrams.map(diagram => diagram.id === active.id ? update(diagram) : diagram) }))
  }, [commit, active.id, readOnly])
  return <div className={styles.workspace} data-public={readOnly} style={{ '--library-width': `${table.layout.libraryWidth}px`, '--inspector-width': `${table.layout.inspectorWidth}px` } as CSSProperties}>
    <aside className={styles.diagrams} aria-label="Схемы кампании">
      <div className={styles.sectionHeading}><h2>Схемы</h2><span>{table.diagrams.length}</span></div>
      <nav className={styles.diagramList} aria-label="Выбор схемы">
        {table.diagrams.map(diagram => <button type="button" key={diagram.id} aria-current={diagram.id === active.id ? 'page' : undefined}
          onClick={() => commit(current => ({ ...current, activeId: diagram.id }))}><span aria-hidden="true">◇</span><span>{diagram.name}<small>{diagram.nodes.length} узлов</small></span></button>)}
      </nav>
      {!readOnly && <form className={styles.newDiagram} onSubmit={event => {
        event.preventDefault(); if (!newName.trim()) return
        const diagram = createDiagram(newName.trim())
        commit(current => ({ ...current, activeId: diagram.id, diagrams: [...current.diagrams, diagram] })); setNewName('')
      }}>
        <TextInput aria-label="Название новой схемы" placeholder="Название схемы" value={newName} maxLength={80} rootClassName={styles.search} onChange={event => setNewName(event.target.value)} />
        <Button type="submit" size="sm" variant="secondary" decoration="minimal" disabled={!newName.trim()}>+ Создать схему</Button>
      </form>}
      <Panel padding="compact" className={styles.note}><p>{readOnly ? 'Сервер предоставил только публичный документ.' : 'Локальный черновик в этом браузере. Не публикуется и не синхронизируется. Не используйте общий профиль браузера для приватных заметок.'}</p></Panel>
    </aside>
    <ReactFlowProvider key={active.id}><DiagramCanvas table={table} diagram={active} onChange={changeDiagram} readOnly={readOnly}
      onLayout={layout => commit(current => ({ ...current, layout: { ...current.layout, ...layout } }))} /></ReactFlowProvider>
  </div>
}

function PrivateTable() {
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
  return <><span className={styles.saveStatus} role="status">{saveError ? 'Не сохранено' : 'Закрытый черновик · сохраняется в этом браузере'}</span>
    {saveError && <p role="alert" className={styles.error}>{saveError}</p>}<Workspace table={table} commit={commit} /></>
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
    <header className={styles.heading}><div><p>Пространство кампании</p><h1>Мой стол</h1></div>
      <div className={styles.actions} role="group" aria-label="Режим стола">
        <Button size="sm" variant={publicMode ? 'secondary' : 'primary'} aria-pressed={!publicMode} onClick={() => setParams({})}>Закрытый стол</Button>
        <Button size="sm" variant={publicMode ? 'primary' : 'secondary'} aria-pressed={publicMode} onClick={() => setParams({ table: 'public', ...(campaignId ? { campaign: campaignId } : {}) })}>Публичный стол</Button>
      </div>
    </header>
    {publicMode ? <><form className={styles.publicForm} onSubmit={event => { event.preventDefault(); if (draftId.trim()) setParams({ table: 'public', campaign: draftId.trim() }) }}>
      <TextInput aria-label="ID кампании" placeholder="ID кампании" value={draftId} onChange={event => setDraftId(event.target.value)} /><Button size="sm" type="submit" disabled={!draftId.trim()}>Открыть публичный стол</Button>
    </form><PublicTable key={campaignId} campaignId={campaignId} /></> : <PrivateTable />}
  </main>
}
