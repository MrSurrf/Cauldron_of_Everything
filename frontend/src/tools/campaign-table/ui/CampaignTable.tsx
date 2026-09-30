import { useCallback, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { addEdge, applyEdgeChanges, applyNodeChanges, Background, Controls, ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react'
import type { Edge, XYPosition } from '@xyflow/react'
import { Button, Panel, TextInput } from '../../../shared/ui'
import { createDiagram, createTable, parseTable, serializeTable, TABLE_STORAGE_KEY } from '../model/table'
import type { CampaignTable as TableState, CreatureLink, CreatureNode as NodeType, Diagram } from '../model/table'
import { CreatureNode } from './CreatureNode'
import { BestiarySidebar, CREATURE_DRAG_TYPE } from './BestiarySidebar'
import '@xyflow/react/dist/style.css'
import styles from './CampaignTable.module.css'

const nodeTypes = { creature: CreatureNode }

function loadTable() {
  try {
    const raw = localStorage.getItem(TABLE_STORAGE_KEY)
    return { table: raw ? parseTable(raw) : createTable(), error: '' }
  } catch {
    return { table: createTable(), error: 'Не удалось восстановить схемы. Автосохранение отключено, чтобы не затереть прежние данные.' }
  }
}

function DiagramCanvas({ diagram, onChange, onSelect, selected }: {
  diagram: Diagram
  onChange: (update: (diagram: Diagram) => Diagram) => void
  onSelect: (creature: CreatureLink | null) => void
  selected: CreatureLink | null
}) {
  const flow = useReactFlow<NodeType, Edge>()
  const canvasRef = useRef<HTMLDivElement>(null)
  function add(creature: CreatureLink, position?: XYPosition) {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const center = flow.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
    // Повторное добавление того же существа создаёт независимый узел.
    const node: NodeType = {
      id: crypto.randomUUID(), type: 'creature',
      position: position ?? { x: center.x - 130 + (diagram.nodes.length % 5) * 20, y: center.y - 30 + (diagram.nodes.length % 5) * 20 },
      data: { creature: { id: creature.id, slug: creature.slug, name: creature.name } },
    }
    onChange(current => ({ ...current, nodes: [...current.nodes, node] }))
  }
  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    try {
      const creature: unknown = JSON.parse(event.dataTransfer.getData(CREATURE_DRAG_TYPE))
      if (!creature || typeof creature !== 'object' || !('id' in creature) || typeof creature.id !== 'string'
        || !('slug' in creature) || typeof creature.slug !== 'string' || !('name' in creature) || typeof creature.name !== 'string'
        || !creature.id || !creature.slug || !creature.name) return
      add({ id: creature.id, slug: creature.slug, name: creature.name }, flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }))
    } catch { /* Чужие перетаскиваемые данные не создают узел. */ }
  }
  return <>
    <section className={styles.board} aria-label="Схема кампании">
      <header className={styles.boardHeader}><div><h2>{diagram.name}</h2><p>{diagram.nodes.length} узлов · {diagram.edges.length} связей</p></div>
        <Button size="sm" variant="secondary" decoration="minimal" onClick={() => void flow.fitView({ padding: 0.25, maxZoom: 1 })}>Показать всё</Button>
      </header>
      <div ref={canvasRef} className={styles.canvas} onDrop={drop} onDragOver={event => {
        if (event.dataTransfer.types.includes(CREATURE_DRAG_TYPE)) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' }
      }}>
        <ReactFlow<NodeType, Edge> nodes={diagram.nodes} edges={diagram.edges} nodeTypes={nodeTypes}
          defaultViewport={diagram.viewport} minZoom={0.2} maxZoom={2} colorMode="dark"
          onNodesChange={changes => onChange(current => {
            const nodes = applyNodeChanges(changes, current.nodes)
            const ids = new Set(nodes.map(node => node.id))
            return { ...current, nodes, edges: current.edges.filter(edge => ids.has(edge.source) && ids.has(edge.target)) }
          })}
          onEdgesChange={changes => onChange(current => ({ ...current, edges: applyEdgeChanges(changes, current.edges) }))}
          onConnect={connection => onChange(current => ({ ...current, edges: addEdge(connection, current.edges) }))}
          isValidConnection={connection => connection.source !== connection.target}
          onNodeClick={(_, node) => onSelect(node.data.creature)} onPaneClick={() => onSelect(null)}
          onMoveEnd={(_, viewport) => onChange(current => ({ ...current, viewport }))}
          deleteKeyCode={['Backspace', 'Delete']} aria-label="Холст кампании"
        >
          <Background gap={24} size={1} color="var(--color-border-default)" />
          <Controls showInteractive={false} />
        </ReactFlow>
        {!diagram.nodes.length && <div className={styles.emptyCanvas}><span aria-hidden="true">✧</span><h3>Начните свою историю</h3><p>Перетащите существо из бестиария справа.<br />Соедините точки по краям двух узлов, чтобы создать связь.</p></div>}
      </div>
      <footer className={styles.boardFooter}>Перетаскивание — перемещение · Колесо — масштаб · Delete — удалить выбранное</footer>
    </section>
    <BestiarySidebar selected={selected} onSelect={onSelect} onAdd={creature => add(creature)} />
  </>
}

export function CampaignTable() {
  const [initial] = useState(loadTable)
  const [table, setTable] = useState(initial.table)
  const currentRef = useRef(table)
  const [saveError, setSaveError] = useState(initial.error)
  const [selected, setSelected] = useState<CreatureLink | null>(null)
  const [newName, setNewName] = useState('')
  const active = table.diagrams.find(diagram => diagram.id === table.activeId)!
  const commit = useCallback((update: (table: TableState) => TableState) => {
    const next = update(currentRef.current)
    currentRef.current = next
    setTable(next)
    if (initial.error) return
    try {
      // Синхронное сохранение каждой правки, без потери последнего движения при перезагрузке.
      localStorage.setItem(TABLE_STORAGE_KEY, serializeTable(next))
      setSaveError('')
    } catch { setSaveError('Изменения не сохранены: хранилище браузера недоступно или заполнено.') }
  }, [initial.error])
  const changeDiagram = useCallback((update: (diagram: Diagram) => Diagram) => {
    // Отложенное событие прежнего холста не должно менять уже выбранную схему.
    commit(current => ({ ...current, diagrams: current.diagrams.map(diagram => diagram.id === active.id ? update(diagram) : diagram) }))
  }, [commit, active.id])

  return <main className={styles.page}>
    <header className={styles.heading}><div><p>Пространство кампании</p><h1>Мой стол</h1></div>
      <span className={styles.saveStatus} role="status">{saveError ? 'Не сохранено' : 'Сохраняется в этом браузере'}</span>
    </header>
    {saveError && <p role="alert" className={styles.error}>{saveError}</p>}
    <div className={styles.workspace}>
      <aside className={styles.diagrams} aria-label="Схемы кампании">
        <div className={styles.sectionHeading}><h2>Схемы</h2><span>{table.diagrams.length}</span></div>
        <nav className={styles.diagramList} aria-label="Выбор схемы">
          {table.diagrams.map(diagram => <button type="button" key={diagram.id} aria-current={diagram.id === active.id ? 'page' : undefined}
            onClick={() => { setSelected(null); commit(current => ({ ...current, activeId: diagram.id })) }}>
            <span aria-hidden="true">◇</span><span>{diagram.name}<small>{diagram.nodes.length} узлов</small></span>
          </button>)}
        </nav>
        <form className={styles.newDiagram} onSubmit={event => {
          event.preventDefault()
          if (!newName.trim()) return
          const diagram = createDiagram(newName.trim())
          commit(current => ({ ...current, activeId: diagram.id, diagrams: [...current.diagrams, diagram] }))
          setNewName(''); setSelected(null)
        }}>
          <TextInput aria-label="Название новой схемы" placeholder="Название схемы" value={newName} maxLength={80} rootClassName={styles.search} onChange={event => setNewName(event.target.value)} />
          <Button type="submit" size="sm" variant="secondary" decoration="minimal" disabled={!newName.trim()}>+ Создать схему</Button>
        </form>
        <Panel padding="compact" className={styles.note}><p>Схемы доступны в этом браузере. Каждая хранит свои узлы и связи.</p></Panel>
      </aside>
      <ReactFlowProvider key={active.id}>
        <DiagramCanvas diagram={active} onChange={changeDiagram} onSelect={setSelected} selected={selected} />
      </ReactFlowProvider>
    </div>
  </main>
}
