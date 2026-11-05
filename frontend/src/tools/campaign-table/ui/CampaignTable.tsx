import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { applyEdgeChanges, Background, Controls, ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react'
import type { NodeChange, XYPosition } from '@xyflow/react'
import { fetchEncyclopedia } from '../../../entities/encyclopedia'
import type { EncyclopediaEntry } from '../../../entities/encyclopedia'
import { Button, Panel, Popover, TextInput } from '../../../shared/ui'
import {
  characterSheetActions,
  characterSheetReducer,
  createSpellFromEncyclopedia,
  equipmentDetailPatch,
  equipmentItemSource,
  spellDetailPatch,
  toCharacterEncyclopediaEntry,
} from '../../character-sheet'
import { loadPublicTable } from '../model/campaignApi'
import type { LibraryReference } from '../model/library'
import { canPlaceReference, entityLabel, entryReference } from '../model/library'
import { loadCampaignCharacter } from '../model/campaignCharacter'
import { loadInstanceStatBlock } from '../model/instanceStatBlock'
import { canPlaceInside, containerOf, moveInside } from '../model/nodeContainment'
import { applyDiagramNodeChanges, canContain, changeDiagram as updateDiagram, createCanvasObject, createDiagram, createInstance, createTable, duplicatePlacement, LEGACY_STORAGE_KEY, parseTable, placeCanvasObject, placeExistingEntity, removeInstances, resolveDiagram, resolveNode, serializeTable, TABLE_STORAGE_KEY, updateCanvasEntity, validReference } from '../model/table'
import type { CanvasEntity, EntityNode, NodeEntityType } from '../model/table'
import type { CampaignTable as TableState, Diagram, TableEdge, TableNode } from '../model/table'
import { NodeRenderer } from './NodeRenderer'
import { ConnectionPreview, ContourEdge } from './ContourEdge'
import { DepartingConnections } from './DepartingConnections'
import { useDepartingConnections } from './useDepartingConnections'
import { LibraryDragPreview } from './LibraryDragPreview'
import { useLibraryDrag } from './useLibraryDrag'
import { useNodeConnections } from './useNodeConnections'
import { nodeMinimumSize, nodeVisual } from '../model/nodeGeometry'
import { TableHistory } from '../model/tableHistory'
import { LocalEntityInspector } from './LocalEntityPanel'
import type { EntityChanges } from './LocalEntityPanel'
import { CampaignCharacterWorkspace } from './CampaignCharacterWorkspace'
import { LibrarySidebar } from './LibrarySidebar'
import { ENTITY_DRAG_TYPE, INSTANCE_DRAG_TYPE, TableContext } from './tableContext'
import type { TableActions } from './tableContext'
import { NodeActionsProvider } from './NodeActionsProvider'
import { projectFlowEdge, projectFlowNode } from './flowProjection'
import { TableInspector } from './TableInspector'
import type { Selection } from './TableInspector'
import '@xyflow/react/dist/style.css'
import styles from './CampaignTable.module.css'

const nodeTypes = { entity: NodeRenderer, location: NodeRenderer, note: NodeRenderer }
const edgeTypes = { contour: ContourEdge }
const creatableTypes = ['location', 'note', 'playerCharacter', 'npc', 'quest', 'faction'] as const
const wikiEntityTypes = new Set<NodeEntityType>(creatableTypes)
const supportsWiki = (type: string): type is NodeEntityType => wikiEntityTypes.has(type as NodeEntityType)
type CreationAnchor = { menuX: number; menuY: number; position: XYPosition }
type HistoryControls = { beginGesture: () => void; endGesture: () => void; undo: () => void; redo: () => void }
type Commit = (update: (table: TableState) => TableState, options?: { transient: boolean }) => void
const noHistory: HistoryControls = { beginGesture: () => {}, endGesture: () => {}, undo: () => {}, redo: () => {} }
const noDiagrams: Diagram[] = []
function eventPointer(event: MouseEvent | TouchEvent): XYPosition | undefined {
  const pointer = 'clientX' in event ? event : event.touches[0] ?? event.changedTouches[0]
  return pointer ? { x: pointer.clientX, y: pointer.clientY } : undefined
}
function loadTable() {
  try {
    const raw = localStorage.getItem(TABLE_STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
    return { table: raw ? parseTable(raw) : createTable(), error: '' }
  } catch {
    return { table: createTable(), error: 'Не удалось восстановить схемы. Автосохранение отключено, чтобы не затереть прежние данные.' }
  }
}

function focusIsEditing() {
  const focused = document.activeElement
  return focused instanceof Element && Boolean(focused.closest('input, textarea, select, [contenteditable], [role="textbox"], [role="menu"], button'))
}

function DiagramCanvas({ table, diagram, selection, focusNodeId, onFocusHandled, onOpenEntity, setSelection,
  canGoBack, canGoForward, onBack, onForward,
  onChange, onNodeChanges, onLayout, onPlaceObject, onUpdateEntity, onDuplicate, onPlaceExisting, onSelectDiagram,
  onCreateDiagram, libraryCollapsed, onToggleLibrary, readOnly, history }: {
  table: TableState; diagram: Diagram; readOnly: boolean
  selection: Selection | null
  focusNodeId: string | null
  onFocusHandled: () => void
  onOpenEntity: (entityId: string) => void
  setSelection: (selection: Selection | null) => void
  canGoBack: boolean
  canGoForward: boolean
  onBack: () => void
  onForward: () => void
  history: HistoryControls
  onChange: (update: (diagram: Diagram) => Diagram, options?: { transient: boolean }) => void
  onNodeChanges: (changes: NodeChange<TableNode>[]) => void
  onLayout: (layout: Partial<TableState['layout']>) => void
  onPlaceObject: (object: { entity: CanvasEntity; node: EntityNode }, name: string) => void
  onDuplicate: (id: string, placementId: string) => void
  onPlaceExisting: (entityId: string, diagramId: string) => void
  onUpdateEntity: (id: string, changes: EntityChanges) => void
  onSelectDiagram: (id: string) => void; onCreateDiagram: (name: string) => void
  libraryCollapsed: boolean; onToggleLibrary: () => void
}) {
  const flow = useReactFlow<TableNode, TableEdge>()
  const canvasRef = useRef<HTMLDivElement>(null)
  const libraryDrag = useLibraryDrag(canvasRef)
  const [arrivals, setArrivals] = useState<ReadonlyMap<string, number>>(() => new Map())
  const { connections: departingConnections, capture: captureDepartingConnections } = useDepartingConnections(canvasRef)
  const creationRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<CreationAnchor | null>(null)
  const [draft, setDraft] = useState<{ entity: CanvasEntity; node: EntityNode } | null>(null)
  const connections = useNodeConnections(diagram, readOnly, flow.screenToFlowPosition, onChange,
    () => captureDepartingConnections(new Set(), true))
  const { source: connectionSource, target: connectionTarget, pointer: connectionPointer } = connections
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [transferPending, setTransferPending] = useState(false)
  const transfer = useRef<AbortController | null>(null)
  useEffect(() => () => transfer.current?.abort(), [])
  useEffect(() => {
    if (!focusNodeId) return
    const node = diagram.nodes.find(item => item.id === focusNodeId)
    if (!node) return
    const frame = requestAnimationFrame(() => {
      void flow.fitView({ nodes: [node], duration: 280, padding: 0.35, maxZoom: 1 })
      onFocusHandled()
    })
    return () => cancelAnimationFrame(frame)
  }, [diagram.nodes, flow, focusNodeId, onFocusHandled])
  useEffect(() => {
    const finish = () => { setDropTarget(null); setDraggedNodeId(null) }
    document.addEventListener('dragend', finish)
    window.addEventListener('blur', finish)
    return () => { document.removeEventListener('dragend', finish); window.removeEventListener('blur', finish) }
  }, [])
  const [editorEntityId, setEditorEntityId] = useState<string | null>(null)
  const [schemesOpen, setSchemesOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [expandedCreatures, setExpandedCreatures] = useState<ReadonlySet<string>>(() => new Set())
  const [creatureMeasurements, setCreatureMeasurements] = useState<ReadonlyMap<string, NonNullable<TableNode['measured']>>>(() => new Map())
  useEffect(() => {
    if (!selection || editorEntityId) return
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || focusIsEditing()) return
      setSelection(null)
    }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [editorEntityId, selection, setSelection])
  useEffect(() => {
    if (readOnly || editorEntityId || draft || transferPending) return
    const handleHistory = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.altKey || !(event.ctrlKey || event.metaKey) || event.code !== 'KeyZ') return
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable], [role="textbox"]')) return
      event.preventDefault()
      setSelection(null); setAnchor(null); connections.cancel(false); setNotice(null)
      if (event.shiftKey) history.redo(); else history.undo()
    }
    document.addEventListener('keydown', handleHistory)
    return () => document.removeEventListener('keydown', handleHistory)
  }, [readOnly, editorEntityId, draft, transferPending, history, connections, setSelection])
  const linking = connectionSource !== null && diagram.nodes.some(node => node.id === connectionSource && !containerOf(node))
  const cancelConnection = connections.cancel
  const center = () => {
    const rect = canvasRef.current?.getBoundingClientRect()
    return rect ? flow.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }) : { x: 100, y: 100 }
  }
  const findContainer = (current: Diagram, source: TableNode, position: XYPosition) => {
    if (!canContain(source)) return undefined
    // Персонаж имеет приоритет перед локацией; не создаём и не сортируем массив на каждом движении.
    for (const character of [true, false]) for (let index = current.nodes.length - 1; index >= 0; index--) {
      const target = current.nodes[index]
      if ((target.data.entityType === 'playerCharacter') !== character || containerOf(target) || !canPlaceInside(source, target)) continue
      const size = flow.getNode(target.id)?.measured
      if (position.x >= target.position.x && position.y >= target.position.y
        && position.x <= target.position.x + (size?.width ?? nodeVisual(target.data.entityType).width)
        && position.y <= target.position.y + (size?.height ?? nodeMinimumSize(target.data.entityType).height)) return target
    }
  }
  const findPointerContainer = (source: TableNode, pointer: XYPosition) => {
    if (!canContain(source)) return undefined
    const element = document.elementFromPoint(pointer.x, pointer.y)
    // Чарлист в инспекторе — такая же цель, как нода персонажа, но только его снаряжение.
    if (element?.closest('[data-campaign-panel]')) {
      const character = selection?.kind === 'node' ? diagram.nodes.find(node => node.id === selection.id) : undefined
      return element.closest('[data-campaign-character-drop="item"], [data-character-sheet-slot="equipment"]') && character?.data.entityType === 'playerCharacter'
        && canPlaceInside(source, character) ? character : undefined
    }
    return findContainer(diagram, source, flow.screenToFlowPosition(pointer))
  }
  async function prepareTransfer(source: TableNode, target: TableNode) {
    if (target.data.entityType !== 'playerCharacter') return undefined
    const controller = new AbortController()
    transfer.current?.abort(); transfer.current = controller
    setTransferPending(true)
    try {
      const [character, item] = await Promise.all([
        loadCampaignCharacter(target.data, controller.signal), loadInstanceStatBlock(source.data, controller.signal),
      ])
      if (controller.signal.aborted) throw new DOMException('Перенос отменён.', 'AbortError')
      return { character, item }
    } finally {
      if (transfer.current === controller) { transfer.current = null; setTransferPending(false) }
    }
  }
  async function putInside(id: string, target: TableNode | undefined, position?: XYPosition) {
    const source = diagram.nodes.find(node => node.id === id)
    if (!source || transfer.current) return
    try {
      const prepared = target ? await prepareTransfer(source, target) : undefined
      onChange(current => {
        // За время загрузки нельзя восстановить удалённую ноду или затереть уже сохранённые правки.
        if (!current.nodes.some(node => node.id === id) || (target && !current.nodes.some(node => node.id === target.id))) return current
        const ready = prepared ? { ...current, nodes: current.nodes.map(node => node.id === target?.id
          ? { ...node, data: { ...node.data, campaignCharacter: node.data.campaignCharacter ?? prepared.character } }
          : node.id === id ? { ...node, data: { ...node.data, statBlock: node.data.statBlock ?? prepared.item } } : node) } : current
        return moveInside(ready, id, target?.id, position)
      })
      if (target) setNotice(`«${source.data.title}» помещён внутрь «${target.data.title}». Ctrl+Z — отменить.`)
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setNotice(error instanceof Error ? error.message : 'Не удалось перенести предмет. Он остался на схеме.')
    } finally { setDropTarget(null) }
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
  async function add(reference: LibraryReference, position?: XYPosition) {
    if (readOnly || !canPlaceReference(reference)) return
    const origin = center()
    const object = createInstance(reference, position ?? { x: origin.x - 90 + diagram.nodes.length % 5 * 24, y: origin.y - 75 + diagram.nodes.length % 5 * 24 })
    const target = position ? findContainer(diagram, resolveNode(object.node, object.entity), position) : undefined
    try {
      const prepared = target ? await prepareTransfer(resolveNode(object.node, object.entity), target) : undefined
      if (target) {
        object.node.data = { ...object.node.data, locationId: target.type === 'location' ? target.id : undefined,
          containerId: target.data.entityType === 'playerCharacter' ? target.id : undefined }
        if (prepared) {
          object.entity.statBlock = prepared.item
          onChange(current => ({ ...current, nodes: current.nodes.map(node => node.id === target.id
            ? { ...node, data: { ...node.data, campaignCharacter: node.data.campaignCharacter ?? prepared.character } } : node) }))
        }
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Не удалось загрузить снаряжение.'); return }
    setArrivals(current => new Map(current).set(object.node.id, performance.now()))
    onPlaceObject(object, object.entity.name)
    if (target) setNotice(`«${object.entity.name}» помещён внутрь «${target.data.title}». Ctrl+Z — отменить.`)
  }
  function drop(event: DragEvent<HTMLDivElement>) {
    if (readOnly) return
    event.preventDefault()
    libraryDrag.finish()
    setDropTarget(null); setDraggedNodeId(null)
    setAnchor(null)
    const position = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY })
    const instance = event.dataTransfer.getData(INSTANCE_DRAG_TYPE)
    if (instance) {
      const source = diagram.nodes.find(node => node.id === instance)
      if (source) void putInside(instance, findContainer(diagram, source, position), position)
      return
    }
    try {
      const reference: unknown = JSON.parse(event.dataTransfer.getData(ENTITY_DRAG_TYPE))
      if (validReference(reference)) add(reference, position)
    } catch { /* Чужой payload не создаёт узел. */ }
  }
  const open = (id: string) => {
    const data = diagram.nodes.find(node => node.id === id)?.data
    if (data) setSelection({ kind: 'node', id, editing: false })
  }
  const edit = (id: string) => {
    const data = diagram.nodes.find(node => node.id === id)?.data
    if (data) setSelection({ kind: 'node', id, editing: true })
  }
  const openReference = (reference: LibraryReference) => setSelection({ kind: 'library', reference })
  async function openWikiLink(target: string) {
    const entryMatch = target.match(/^\/encyclopedia\/entry\/([^/?#]+)\/?/)
    const match = target.match(/^\/encyclopedia\/(bestiary|creature|item|spell|class|race|background|feat|sidekick|reference)\/([^/?#]+)\/?/)
    if (!entryMatch && !match) {
      if (target.startsWith('/')) window.location.assign(target)
      return
    }
    const controller = new AbortController()
    try {
      let entry: EncyclopediaEntry | undefined
      if (entryMatch) {
        entry = await fetchEncyclopedia<EncyclopediaEntry>(`${encodeURIComponent(decodeURIComponent(entryMatch[1]))}/`, controller.signal)
      } else if (match) {
        const type = match[1] === 'bestiary' ? 'creature' : match[1]
        const slug = decodeURIComponent(match[2])
        const params = new URLSearchParams({ type, slug, page_size: '1' })
        const page = await fetchEncyclopedia<{ results: EncyclopediaEntry[] }>(`?${params}`, controller.signal)
        entry = page.results[0]
      }
      if (!entry) throw new Error('Запись энциклопедии не найдена.')
      openReference(entryReference(entry))
    } catch (cause: unknown) {
      setNotice(cause instanceof Error ? cause.message : 'Не удалось открыть ссылку энциклопедии.')
    }
  }
  async function copyReferenceToCharacter(reference: LibraryReference, entityId: string) {
    if (transfer.current || reference.source !== 'encyclopedia' || !['item', 'spell'].includes(reference.entityType)) return
    const entity = table.entities.find(item => item.id === entityId)
    const targetNode = table.diagrams.flatMap(item => resolveDiagram(table, item).nodes).find(item => item.data.entityId === entityId)
    if (!entity || !targetNode || entity.entityType !== 'playerCharacter') return
    const controller = new AbortController()
    transfer.current = controller
    setTransferPending(true)
    try {
      const [campaignCharacter, detail] = await Promise.all([
        entity.campaignCharacter ? Promise.resolve(structuredClone(entity.campaignCharacter)) : loadCampaignCharacter(targetNode.data, controller.signal),
        fetchEncyclopedia<EncyclopediaEntry>(`${encodeURIComponent(reference.entityId)}/`, controller.signal),
      ])
      const entry = toCharacterEncyclopediaEntry(detail)
      if (!entry || (entry.entityType !== 'item' && entry.entityType !== 'spell')) throw new Error('Эту запись нельзя добавить персонажу.')
      let document = campaignCharacter.document
      if (entry.entityType === 'item') {
        document = characterSheetReducer(document, characterSheetActions.importEquipmentItem(entry.id, equipmentItemSource(entry)))
        document = characterSheetReducer(document, characterSheetActions.enrichEquipmentItem(entry.id, equipmentDetailPatch(detail)))
      } else {
        const spell = createSpellFromEncyclopedia(entry)
        if (!spell) throw new Error(`Для «${entry.name}» не указан уровень заклинания.`)
        const existing = document.spellcasting?.spells.find(candidate => candidate.entityId === entry.id)
        document = characterSheetReducer(document, characterSheetActions.addSpell(spell))
        document = characterSheetReducer(document, characterSheetActions.updateSpell(existing?.id ?? spell.id, spellDetailPatch(detail)))
      }
      if (controller.signal.aborted) return
      onUpdateEntity(entityId, { campaignCharacter: { ...campaignCharacter, document } })
      setNotice(`${entry.name} добавлен${entry.entityType === 'item' ? '' : 'о'} в кампанийную версию персонажа.`)
    } catch (cause: unknown) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) setNotice(cause instanceof Error ? cause.message : 'Не удалось добавить запись персонажу.')
    } finally {
      if (transfer.current === controller) { transfer.current = null; setTransferPending(false) }
    }
  }
  const remove = (id: string) => {
    if (readOnly) return
    captureDepartingConnections(new Set(diagram.edges.filter(edge => edge.source === id || edge.target === id).map(edge => edge.id)))
    onChange(current => removeInstances(current, new Set([id])))
  }
  const removeEdge = (id: string) => {
    if (readOnly) return
    captureDepartingConnections(new Set([id]))
    onChange(current => ({ ...current, edges: current.edges.filter(edge => edge.id !== id) }))
    setSelection(null)
  }
  const release = (id: string) => { if (!readOnly) onChange(current => moveInside(current, id)) }
  const duplicate = (id: string) => {
    if (readOnly) return
    const placementId = crypto.randomUUID()
    onDuplicate(id, placementId)
    if (diagram.nodes.find(node => node.id === id)?.data.reference) setSelection({ kind: 'node', id: placementId, editing: true })
  }
  const hidden = useMemo(() => new Set(diagram.nodes.filter(node => containerOf(node)).map(node => node.id)), [diagram.nodes])
  const localEntities = useMemo(() => new Map(table.entities.map(entity => [entity.id, entity])), [table.entities])
  const displayDiagram = diagram
  const visibleNodes = useMemo(() => draft ? [...diagram.nodes, resolveNode(draft.node, draft.entity)] : diagram.nodes, [diagram.nodes, draft])
  const selectedNode = selection?.kind === 'node' ? diagram.nodes.find(node => node.id === selection.id) : undefined
  const selectedEntity = selectedNode && supportsWiki(selectedNode.data.entityType) ? localEntities.get(selectedNode.data.entityId) : undefined
  const resolvedDiagrams = useMemo(() => selectedEntity ? table.diagrams.map(item => resolveDiagram(table, item)) : noDiagrams,
    [selectedEntity, table])
  const flowNodes = useMemo(() => visibleNodes.map(node => projectFlowNode(node, {
    expanded: expandedCreatures.has(node.id), hidden: hidden.has(node.id), linking, draft: node.id === draft?.node.id,
    arrivalKey: arrivals.get(node.id), measured: node.data.entityType === 'creature' ? creatureMeasurements.get(node.id) : undefined,
  })), [visibleNodes, expandedCreatures, hidden, linking, draft, arrivals, creatureMeasurements])
  const flowEdges = useMemo(() => diagram.edges.map(edge => projectFlowEdge(edge,
    selection?.kind === 'edge' && selection.id === edge.id, hidden.has(edge.source) || hidden.has(edge.target))),
  [diagram.edges, selection, hidden])
  const editedEntity = localEntities.get(editorEntityId ?? '')
  const editedCharacter = editedEntity?.entityType === 'playerCharacter' && editedEntity.campaignCharacter
    ? editedEntity : undefined
  const closeSelection = () => {
    const id = selectedNode?.id
    setSelection(null)
    if (id) onNodeChanges([{ id, type: 'select', selected: false }])
  }
  const tableActions: TableActions = { diagram: displayDiagram, readOnly, open, edit, remove, removeEdge, release, duplicate,
    toggleCreature: id => setExpandedCreatures(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    }),
    beginGesture: history.beginGesture, endGesture: history.endGesture,
    diagrams: table.diagrams, connectionSource: linking ? connectionSource : null, dropTarget,
    beginInstanceDrag: id => { setDraggedNodeId(id); setNotice(null) },
    placeInside: (id, targetId) => { if (!readOnly) void putInside(id, diagram.nodes.find(node => node.id === targetId)) },
    beginConnection: connections.begin,
    startConnection: (id, pointer) => { setAnchor(null); connections.start(id, pointer) },
    placeOnDiagram: (id, diagramId) => { const node = diagram.nodes.find(item => item.id === id); if (node && !readOnly) onPlaceExisting(node.data.entityId, diagramId) },
    draft: draft ? { id: draft.node.id, type: draft.entity.entityType as NodeEntityType,
      commit: name => { if (!name.trim()) return; onPlaceObject(draft, name); setDraft(null) },
      cancel: () => setDraft(null) } : undefined }
  return <TableContext.Provider value={tableActions}><NodeActionsProvider value={tableActions}>
    {editedCharacter && <CampaignCharacterWorkspace key={editedCharacter.id} document={editedCharacter.campaignCharacter!.document} diagramName={diagram.name}
      onBack={() => setEditorEntityId(null)} onChange={document => onUpdateEntity(editedCharacter.id, {
        campaignCharacter: { ...editedCharacter.campaignCharacter!, document },
      })} />}
    <section className={styles.board} aria-label="Схема кампании" aria-hidden={Boolean(editedCharacter)}
      inert={editedCharacter ? true : undefined}>
      <header className={styles.boardHeader}><div className={styles.schemeHeading}>
        <Popover aria-label="Схемы кампании" className={styles.schemePopover} open={schemesOpen} onOpenChange={setSchemesOpen} content={<div className={styles.schemeMenu}>
          <nav aria-label="Выбор схемы">{table.diagrams.map(item => <button type="button" key={item.id} aria-current={item.id === diagram.id ? 'page' : undefined}
            onClick={() => { setSelection(null); onSelectDiagram(item.id); setSchemesOpen(false) }}><span>{item.name}</span><small>{item.nodes.length}</small></button>)}</nav>
          {!readOnly && <><label>Название схемы<TextInput rootClassName={styles.search} aria-label="Название схемы" value={diagram.name}
            onChange={event => onChange(current => ({ ...current, name: event.target.value }))} /></label>
            <form onSubmit={event => { event.preventDefault(); if (!newName.trim()) return; onCreateDiagram(newName.trim()); setNewName(''); setSchemesOpen(false) }}>
              <TextInput rootClassName={styles.search} aria-label="Название новой схемы" placeholder="Новая схема" value={newName} maxLength={80} onChange={event => setNewName(event.target.value)} />
              <Button size="sm" variant="secondary" decoration="minimal" className={styles.toolButton} type="submit" disabled={!newName.trim()}>Создать</Button>
            </form></>}
        </div>}><Button size="sm" variant="secondary" decoration="bare" className={styles.toolButton} aria-label={`Выбрать схему: ${diagram.name}`}>{diagram.name} <span aria-hidden="true">⌄</span></Button></Popover>
        <span className={styles.schemeCount}>{diagram.nodes.length} узлов · {diagram.edges.length} связей</span>
        <Button size="sm" variant="secondary" decoration="bare" className={styles.toolButton} onClick={() => void flow.fitView({ padding: 0.25, maxZoom: 1 })}>Показать всё</Button>
      </div>
        <div className={styles.actions}>
          {!readOnly && libraryCollapsed && <Button size="sm" variant="secondary" decoration="bare" className={styles.toolButton} onClick={onToggleLibrary}>Библиотека</Button>}
        </div>
      </header>
      <div ref={canvasRef} className={styles.canvas} data-cursor-light-background="" data-linking={linking}
        data-transfer-pending={transferPending || undefined}
        data-library-drop-zone={libraryDrag.drag?.overCanvas || undefined} onDrop={drop}
        onPointerMove={event => { if (linking) connections.setPointer(flow.screenToFlowPosition({ x: event.clientX, y: event.clientY })) }}
        onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as globalThis.Node | null)) setDropTarget(null) }} onDragOver={event => {
        if (!readOnly && event.dataTransfer.types.some(type => [ENTITY_DRAG_TYPE, INSTANCE_DRAG_TYPE].includes(type))) {
          event.preventDefault(); event.dataTransfer.dropEffect = event.dataTransfer.types.includes(INSTANCE_DRAG_TYPE) ? 'move' : 'copy'
          const instance = draggedNodeId ?? event.dataTransfer.getData(INSTANCE_DRAG_TYPE)
          let source = diagram.nodes.find(node => node.id === instance)
          if (!source && libraryDrag.drag) {
            const object = createInstance(libraryDrag.drag.reference, { x: 0, y: 0 })
            source = resolveNode(object.node, object.entity)
          }
          setDropTarget(source ? findContainer(diagram, source, flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }))?.id ?? null : null)
        }
      }}>
        <ReactFlow<TableNode, TableEdge> nodes={flowNodes} edges={flowEdges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
          defaultViewport={diagram.viewport} minZoom={0.2} maxZoom={2} colorMode="dark"
          nodesDraggable={!readOnly && !linking && !transferPending} nodesConnectable={false} edgesReconnectable={false}
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
            onNodeChanges(persistedChanges)
          }}
          onNodeDragStart={readOnly ? undefined : (_, node) => { history.beginGesture(); setDraggedNodeId(node.id); setNotice(null) }}
          onNodeDrag={readOnly ? undefined : (event, node) => {
            const pointer = eventPointer(event)
            const target = pointer ? findPointerContainer(node, pointer) : findContainer(diagram, node, node.position)
            setDropTarget(target?.id ?? null)
          }}
          onNodeDragStop={readOnly ? undefined : async (event, node) => {
            setDraggedNodeId(null); setDropTarget(null)
            try { if (canContain(node)) {
              const pointer = eventPointer(event)
              const position = pointer ? flow.screenToFlowPosition(pointer)
                : { x: node.position.x + (node.width ?? 260) / 2, y: node.position.y + (node.height ?? 150) / 2 }
              const target = pointer ? findPointerContainer(node, pointer) : findContainer(diagram, node, position)
              await putInside(node.id, target)
            } } finally { history.endGesture() }
          }}
          onEdgesChange={readOnly ? undefined : changes => {
            captureDepartingConnections(new Set(changes.filter(change => change.type === 'remove').map(change => change.id)))
            onChange(current => ({ ...current, edges: applyEdgeChanges(changes, current.edges) }),
              { transient: changes.every(change => change.type === 'select') })
          }}
          onNodeClick={(_, node) => {
            if (connections.ignoreClick()) return
            setAnchor(null)
            if (linking && !readOnly) {
              if (node.id !== connectionSource && node.id !== draft?.node.id) {
                connections.finish(node.id)
              }
              return
            }
            if (node.id !== draft?.node.id) setSelection({ kind: 'node', id: node.id, editing: false })
          }}
          onNodeMouseEnter={(_, node) => { if (linking && node.id !== connectionSource && node.id !== draft?.node.id) connections.setTarget(node.id) }}
          onNodeMouseLeave={() => connections.setTarget(null)}
          onNodeDoubleClick={(_, node) => { if (!linking && node.id !== draft?.node.id) open(node.id) }}
          onEdgeClick={(_, edge) => { setAnchor(null); setSelection({ kind: 'edge', id: edge.id }) }}
          onPaneClick={() => { if (!connections.ignoreClick()) { setAnchor(null); cancelConnection() } }}
          onPaneContextMenu={event => { if (readOnly) return; event.preventDefault(); showCreationAt(event.clientX, event.clientY) }}
          onMoveStart={() => setAnchor(null)}
          onMoveEnd={readOnly ? undefined : (_, viewport) => onChange(current => ({ ...current, viewport }))}
          deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']} onBeforeDelete={async ({ edges }) => {
            if (focusIsEditing()) return false
            captureDepartingConnections(new Set(edges.map(edge => edge.id)))
            return true
          }} aria-label="Холст кампании"
        >
          <Background gap={24} size={1} color="var(--color-border-default)" /><Controls showInteractive={false} />
          {linking && <ConnectionPreview source={connectionSource!} target={connectionTarget} pointer={connectionPointer} />}
          <DepartingConnections connections={departingConnections} />
        </ReactFlow>
        {(dropTarget || libraryDrag.drag?.overCanvas) && <div className={styles.dropHint} role="status">{dropTarget
          ? `Поместить внутрь: ${diagram.nodes.find(node => node.id === dropTarget)?.data.title}${diagram.nodes.find(node => node.id === dropTarget)?.data.entityType === 'playerCharacter' ? ' · Снаряжение' : ''}`
          : 'Отпустите материал на холст'}</div>}
        {transferPending && <div className={styles.dropHint} role="status">Добавляем предмет в снаряжение…</div>}
        {notice && !dropTarget && !transferPending && <div className={styles.transferNotice} role="status">{notice}<button type="button" aria-label="Скрыть уведомление" onClick={() => setNotice(null)}>×</button></div>}
        {linking && <div className={styles.connectionMode} role="status">Выберите второй узел <button type="button" onClick={() => cancelConnection()}>Отмена · Esc</button></div>}
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
    </section>
    {selectedNode && selectedEntity && !editedCharacter && <LocalEntityInspector key={selectedEntity.id} entity={selectedEntity}
      node={selectedNode} diagram={displayDiagram} diagrams={resolvedDiagrams} entities={table.entities}
      width={table.layout.inspectorWidth} readOnly={readOnly}
      onResize={inspectorWidth => onLayout({ inspectorWidth })} onClose={closeSelection}
      canGoBack={canGoBack} canGoForward={canGoForward} onBack={onBack} onForward={onForward}
      onOpenFull={() => setEditorEntityId(selectedEntity.id)} onOpenEntity={onOpenEntity}
      onOpenLink={target => { void openWikiLink(target) }}
      onDropReference={reference => { void copyReferenceToCharacter(reference, selectedEntity.id) }}
      onUpdate={changes => onUpdateEntity(selectedEntity.id, changes)} />}
    {!readOnly && !libraryCollapsed && <LibrarySidebar section={table.layout.section} query={table.layout.query} width={table.layout.libraryWidth}
      onCollapse={onToggleLibrary} onSection={section => onLayout({ section, query: '' })}
      onQuery={query => onLayout({ query })} onResize={libraryWidth => onLayout({ libraryWidth })} onOpen={openReference} onAdd={add}
      onLibraryDragStart={(reference, pointer) => { cancelConnection(); setAnchor(null); libraryDrag.begin(reference, pointer) }} onLibraryDragEnd={libraryDrag.finish} />}
    {selection && !selectedEntity && !editedCharacter && <TableInspector key={selection.kind === 'library' ? `library:${selection.reference.entityId}` : `${selection.kind}:${selection.id}`}
      selection={selection} width={table.layout.inspectorWidth} onResize={inspectorWidth => onLayout({ inspectorWidth })} onClose={() => setSelection(null)} onChange={onChange} onOpen={openReference} onAdd={add} />}
    <LibraryDragPreview drag={libraryDrag.drag} />
  </NodeActionsProvider></TableContext.Provider>
}

function Workspace({ table, commit, readOnly = false, history = noHistory }: { table: TableState; commit: Commit; readOnly?: boolean; history?: HistoryControls }) {
  const [libraryCollapsed, setLibraryCollapsed] = useState(false)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null)
  const [wikiNavigation, setWikiNavigation] = useState<{ entries: Array<{ diagramId: string; nodeId: string }>; index: number }>({ entries: [], index: -1 })
  const active = resolveDiagram(table, table.diagrams.find(diagram => diagram.id === table.activeId)!)
  const changeDiagram = useCallback((update: (diagram: Diagram) => Diagram, options?: { transient: boolean }) => {
    if (!readOnly) commit(current => updateDiagram(current, active.id, update), options)
  }, [commit, active.id, readOnly])
  const changeNodes = useCallback((changes: NodeChange<TableNode>[]) => {
    if (readOnly) return
    // После blur/pointercancel браузер может продолжить прежний drag без нового onNodeDragStart.
    if (changes.some(change => (change.type === 'position' && change.dragging)
      || (change.type === 'dimensions' && change.resizing))) history.beginGesture()
    const transient = changes.every(change => change.type === 'select' || (change.type === 'dimensions' && !change.setAttributes))
    commit(current => applyDiagramNodeChanges(current, active.id, changes), { transient })
  }, [commit, active.id, readOnly, history])
  const select = useCallback((next: Selection | null) => {
    setSelection(next)
    if (next?.kind !== 'node') return
    const placement = table.diagrams.flatMap(diagram => diagram.nodes.map(node => ({ diagramId: diagram.id, node })))
      .find(item => item.node.id === next.id)
    const entity = table.entities.find(item => item.id === placement?.node.data.entityId)
    if (!placement || !entity || !supportsWiki(entity.entityType)) return
    setWikiNavigation(current => {
      if (current.entries[current.index]?.nodeId === placement.node.id) return current
      const entries = [...current.entries.slice(0, current.index + 1), { diagramId: placement.diagramId, nodeId: placement.node.id }]
      return { entries, index: entries.length - 1 }
    })
  }, [table.diagrams, table.entities])
  const openEntity = useCallback((entityId: string) => {
    const current = table.diagrams.find(diagram => diagram.id === table.activeId)?.nodes.find(node => node.data.entityId === entityId)
    const elsewhere = table.diagrams.flatMap(diagram => diagram.nodes.map(node => ({ diagramId: diagram.id, node })))
      .find(placement => placement.node.data.entityId === entityId)
    const target = current ? { diagramId: table.activeId, node: current } : elsewhere
    if (!target) return
    select({ kind: 'node', id: target.node.id, editing: false })
    setFocusNodeId(target.node.id)
    if (target.diagramId !== table.activeId) commit(value => ({ ...value, activeId: target.diagramId }))
  }, [commit, select, table])
  const navigateWiki = useCallback((direction: -1 | 1) => {
    const index = wikiNavigation.index + direction
    const target = wikiNavigation.entries[index]
    if (!target) return
    setWikiNavigation(current => ({ ...current, index }))
    setSelection({ kind: 'node', id: target.nodeId, editing: false })
    setFocusNodeId(target.nodeId)
    if (target.diagramId !== table.activeId) commit(value => ({ ...value, activeId: target.diagramId }))
  }, [commit, table.activeId, wikiNavigation])
  const focusHandled = useCallback(() => setFocusNodeId(null), [])
  return <div className={styles.workspace} data-public={readOnly} data-collapsed={libraryCollapsed}
    style={{ '--library-width': table.layout.libraryWidth === 336 ? '30%' : `${table.layout.libraryWidth}px`, '--inspector-width': `${table.layout.inspectorWidth}px` } as CSSProperties}>
    <ReactFlowProvider key={active.id}><DiagramCanvas table={table} diagram={active} selection={selection} setSelection={select}
      focusNodeId={focusNodeId} onFocusHandled={focusHandled} onOpenEntity={openEntity}
      canGoBack={wikiNavigation.index > 0} canGoForward={wikiNavigation.index >= 0 && wikiNavigation.index < wikiNavigation.entries.length - 1}
      onBack={() => navigateWiki(-1)} onForward={() => navigateWiki(1)}
      onChange={changeDiagram} onNodeChanges={changeNodes} readOnly={readOnly} history={history}
      libraryCollapsed={libraryCollapsed} onToggleLibrary={() => setLibraryCollapsed(value => !value)}
      onSelectDiagram={id => commit(current => ({ ...current, activeId: id }))}
      onCreateDiagram={name => { const diagram = createDiagram(name); setSelection(null); commit(current => ({ ...current, activeId: diagram.id, diagrams: [...current.diagrams, diagram] })) }}
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
      <button type="button" aria-pressed={!publicMode} onClick={onPrivate}>Закрытый</button>
      <button type="button" aria-pressed={publicMode} onClick={onPublic}>Публичный</button>
    </div>
    {publicMode && <form className={styles.publicForm} onSubmit={event => { event.preventDefault(); onOpenPublic?.() }}>
      <TextInput rootClassName={styles.search} aria-label="ID кампании" placeholder="ID кампании" value={draftId ?? ''} onChange={event => onDraftId?.(event.target.value)} />
      <Button size="sm" variant="secondary" decoration="minimal" className={styles.toolButton} type="submit" disabled={!draftId?.trim()}>Открыть</Button>
    </form>}
  </header>
}

function PrivateTable({ onPrivate, onPublic }: { onPrivate: () => void; onPublic: () => void }) {
  const [initial] = useState(loadTable)
  const [table, setTable] = useState(initial.table)
  const currentRef = useRef(table)
  const [history] = useState(() => new TableHistory())
  const [saveError, setSaveError] = useState(initial.error)
  const gesture = useRef(false)
  const pendingSave = useRef(false)
  const flushSave = useCallback(() => {
    if (!pendingSave.current || initial.error) return
    pendingSave.current = false
    try { localStorage.setItem(TABLE_STORAGE_KEY, serializeTable(currentRef.current)); setSaveError('') }
    catch { setSaveError('Изменения не сохранены: хранилище браузера недоступно или заполнено.') }
  }, [initial.error])
  const persist = useCallback((next: TableState, transient = false) => {
    if (next === currentRef.current) return
    currentRef.current = next; setTable(next)
    if (transient) return
    pendingSave.current = true
    if (!gesture.current) flushSave()
  }, [flushSave])
  const commit: Commit = useCallback((update, options) => {
    const next = update(currentRef.current)
    if (next === currentRef.current) return
    if (!options?.transient) history.record(currentRef.current, next)
    persist(next, options?.transient)
  }, [history, persist])
  const endGesture = useCallback(() => {
    if (gesture.current) {
      gesture.current = false
      history.end(currentRef.current)
    }
    flushSave()
  }, [history, flushSave])
  const historyControls: HistoryControls = useMemo(() => ({
    beginGesture: () => { gesture.current = true; history.begin(currentRef.current) }, endGesture,
    undo: () => persist(history.undo(currentRef.current)), redo: () => persist(history.redo(currentRef.current)),
  }), [history, persist, endGesture])
  useEffect(() => {
    // Незавершённый жест тоже сохраняется при уходе со страницы или потере окна.
    const hidden = () => { if (document.visibilityState === 'hidden') endGesture() }
    window.addEventListener('pagehide', endGesture)
    window.addEventListener('blur', endGesture)
    document.addEventListener('visibilitychange', hidden)
    document.addEventListener('pointercancel', endGesture)
    return () => {
      window.removeEventListener('pagehide', endGesture)
      window.removeEventListener('blur', endGesture)
      document.removeEventListener('visibilitychange', hidden)
      document.removeEventListener('pointercancel', endGesture)
      endGesture()
    }
  }, [endGesture])
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
