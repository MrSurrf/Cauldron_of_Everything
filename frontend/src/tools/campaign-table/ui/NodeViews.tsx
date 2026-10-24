import { useLayoutEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import type { EntityType } from '../../../entities/base'
import type { NodeEntityType } from '../model/table'
import { nodeVisual, NOTE_FOLD_SIZE, shapePolygon } from '../model/nodeGeometry'
import type { NodeShape } from '../model/nodeGeometry'
import styles from './CampaignNodes.module.css'

export type NodeViewProps = { title: string; summary: string }
export function NodeOutline({ shape }: { shape: NodeShape }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ width: 120, height: 120 })
  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const observer = new ResizeObserver(() => {
      // client-размеры не включают масштаб viewport; SVG bbox может быть в единицах viewBox.
      const width = svg.clientWidth, height = svg.clientHeight
      if (width <= 0 || height <= 0) return
      setSize(previous => previous.width === width && previous.height === height ? previous : { width, height })
    })
    observer.observe(svg.parentElement ?? svg)
    return () => observer.disconnect()
  }, [])
  const { width, height } = size
  const fold = Math.min(NOTE_FOLD_SIZE, width / 3, height / 3)
  return <svg ref={svgRef} className={styles.nodeOutline} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
    {shape === 'circle' ? <circle cx={width / 2} cy={height / 2} r={Math.min(width, height) / 2} vectorEffect="non-scaling-stroke" />
      : <polygon points={shapePolygon(shape, width, height).map(point => point.join(',')).join(' ')} vectorEffect="non-scaling-stroke" />}
    {shape === 'note' && <path className={styles.noteFold} d={`M${width - fold} 0 V${fold} H${width} Z`} vectorEffect="non-scaling-stroke" />}
  </svg>
}
// Нейтральные пиктограммы типов: не подменяют отсутствующие портреты или данные.
const glyphs = {
  playerCharacter: 'M38 42a12 14 0 1 0 24 0a12 14 0 1 0-24 0 M25 80q0-22 25-22t25 22 M39 23l11-9 11 9',
  npc: 'M38 40a12 14 0 1 0 24 0a12 14 0 1 0-24 0 M25 80q0-22 25-22t25 22',
  creature: 'M25 64l8-32 14 12 17-16 11 33-18 13-21-4z M42 56h2 M60 52h2',
  spell: 'M50 24v52 M24 50h52 M32 32l36 36 M68 32L32 68 M44 44h12v12H44z',
  item: 'M41 22h18v10l-3 5v11q22 19 9 30H35q-13-11 9-30V37l-3-5z M33 63h34',
  faction: 'M28 30l22 12 22-12-6 29-16 18-16-18z M50 42v35 M28 30l22 23 22-23',
  location: 'M20 78V40h16v-9h9v9h10v-9h9v9h16v38z M43 78V61h14v17 M26 40V25h10v15 M64 40V25h10v15',
  quest: 'M28 25h40v52H28z M38 38h20 M38 49h20 M38 60h12',
  note: 'M28 22h33l13 13v43H28z M61 22v14h13 M39 48h24 M39 59h24',
}
function Glyph({ type }: { type: keyof typeof glyphs }) {
  return <svg className={styles.nodeGlyph} viewBox="0 0 100 100" aria-hidden="true"><path d={glyphs[type]} /></svg>
}
function Caption({ title, summary }: NodeViewProps) {
  return <div className={styles.nodeCaption}><h3>{title}</h3>{summary && <p className={styles.nodeSummary}>{summary}</p>}</div>
}
function Badge({ type, ...props }: NodeViewProps & { type: keyof typeof glyphs }) {
  const level = type === 'spell' ? props.summary.match(/(?:уровень|ур\.?|level)\s*(\d+)/i)?.[1] : undefined
  return <><div className={styles.nodeBadge}><NodeOutline shape={nodeVisual(type).shape} />
    {type !== 'spell' && type !== 'faction' && <Glyph type={type} />}
    {type === 'playerCharacter' && <span className={styles.characterDiamond} aria-hidden="true" />}
    {level !== undefined && <span className={styles.spellLevel} aria-label={`Уровень заклинания: ${level}`}><span>{level}</span></span>}
  </div><Caption {...props} summary={type === 'spell' ? '' : props.summary} /></>
}
export const CharacterNode = (props: NodeViewProps) => <Badge type="playerCharacter" {...props} />
export const NpcNode = (props: NodeViewProps) => <Badge type="npc" {...props} />
export const CreatureNode = (props: NodeViewProps) => {
  const parts = props.summary.split(' · ').filter(part => !/^(крошечный|маленький|средний|большой|огромный|громадный|tiny|small|medium|large|huge|gargantuan)$/i.test(part.trim()))
  const challenge = parts.filter(part => /^ПО\s/i.test(part))
  const species = parts.filter(part => !/^ПО\s/i.test(part))
  return <Badge type="creature" {...props} summary={[...species, ...challenge].join(' · ')} />
}
export const SpellNode = (props: NodeViewProps) => <Badge type="spell" {...props} />
export const ItemNode = (props: NodeViewProps) => <Badge type="item" {...props} />
export const FactionNode = (props: NodeViewProps) => <Badge type="faction" {...props} />
export const LocationNode = (props: NodeViewProps) => <><div className={styles.locationScene}><img className={styles.locationImage} src="/tools/survey/start/background.png" alt="" draggable={false} /></div><Caption {...props} /></>
export const QuestNode = (props: NodeViewProps) => <div className={styles.nodeCardContent}><Glyph type="quest" /><Caption {...props} /><span className={styles.questArrow} aria-hidden="true">›</span></div>
export const NoteNode = (props: NodeViewProps) => <><span className={styles.noteIcon} aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="M4 5h12M4 10h12M4 15h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span><Caption {...props} /></>
const views = { playerCharacter: CharacterNode, npc: NpcNode, creature: CreatureNode, spell: SpellNode, item: ItemNode,
  faction: FactionNode, location: LocationNode, quest: QuestNode, note: NoteNode } satisfies Record<NodeEntityType, ComponentType<NodeViewProps>>
export function NodeView({ type, ...props }: NodeViewProps & { type: EntityType }) {
  const View = type in views ? views[type as keyof typeof views] : Caption
  return <View {...props} />
}
