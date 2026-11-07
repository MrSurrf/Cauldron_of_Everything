import { useLayoutEffect, useRef, useState } from 'react'
import type { ComponentType, CSSProperties } from 'react'
import type { EntityType } from '../../../entities/base'
import { ItemKindIcon } from '../../../entities/item'
import { getSpellSchool, SpellSchoolIcon } from '../../../entities/spell'
import bestiaryIconUrl from '../../../shared/ui/icons/assets/bestiary.svg?url&no-inline'
import npcCharacterIconUrl from '../../../shared/ui/icons/assets/npc-character.svg?url&no-inline'
import playerCharacterIconUrl from '../../../shared/ui/icons/assets/player-character.svg?url&no-inline'
import type { NodeEntityType } from '../model/table'
import { nodeVisual, NOTE_FOLD_SIZE, shapePolygon } from '../model/nodeGeometry'
import type { NodeShape } from '../model/nodeGeometry'
import { LocationNodeFrame } from './LocationNodeFrame'
import styles from './CampaignNodes.module.css'

export type NodeViewProps = {
  title: string
  summary: string
  classification?: string
  school?: string
  level?: number
  ritual?: boolean
  concentration?: boolean
  imageSrc?: string
}
export function NodeOutline({ shape, location = false }: { shape: NodeShape; location?: boolean }) {
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
  if (location) return <LocationNodeFrame width={width} height={height} svgRef={svgRef} />
  return <svg ref={svgRef} className={styles.nodeOutline} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
    {shape === 'circle' ? <circle cx={width / 2} cy={height / 2} r={Math.min(width, height) / 2} vectorEffect="non-scaling-stroke" />
      : <polygon points={shapePolygon(shape, width, height).map(point => point.join(',')).join(' ')} vectorEffect="non-scaling-stroke" />}
    {shape === 'note' && <path className={styles.noteFold} d={`M${width - fold} 0 V${fold} H${width} Z`} vectorEffect="non-scaling-stroke" />}
  </svg>
}
const glyphs = {
  spell: 'M50 24v52 M24 50h52 M32 32l36 36 M68 32L32 68 M44 44h12v12H44z',
  faction: 'M28 30l22 12 22-12-6 29-16 18-16-18z M50 42v35 M28 30l22 23 22-23',
  location: 'M20 78V40h16v-9h9v9h10v-9h9v9h16v38z M43 78V61h14v17 M26 40V25h10v15 M64 40V25h10v15',
  quest: 'M28 25h40v52H28z M38 38h20 M38 49h20 M38 60h12',
  note: 'M28 22h33l13 13v43H28z M61 22v14h13 M39 48h24 M39 59h24',
}
function Glyph({ type }: { type: keyof typeof glyphs }) {
  return <svg className={styles.nodeGlyph} viewBox="0 0 100 100" aria-hidden="true"><path d={glyphs[type]} /></svg>
}
type BadgeType = 'playerCharacter' | 'npc' | 'creature' | 'spell' | 'item' | 'faction'
const badgeIconUrls: Partial<Record<BadgeType, string>> = {
  playerCharacter: playerCharacterIconUrl,
  npc: npcCharacterIconUrl,
  creature: bestiaryIconUrl,
}
type NodeIconStyle = CSSProperties & { '--node-icon-url': string }
function BadgeIcon({ type }: { type: BadgeType }) {
  const url = badgeIconUrls[type]
  if (!url) return null
  return <span
    className={styles.nodeEntityIcon}
    data-entity-icon={type}
    style={{ '--node-icon-url': `url("${url}")` } as NodeIconStyle}
    aria-hidden="true"
  />
}
function Caption({ title, summary }: NodeViewProps) {
  return <div className={styles.nodeCaption}><h3>{title}</h3>{summary && <p className={styles.nodeSummary}>{summary}</p>}</div>
}
function SpellMarker({ kind, label, value, title, consumesSlot }: {
  kind: 'level' | 'concentration' | 'ritual'
  label: string
  value: string
  title: string
  consumesSlot?: boolean
}) {
  return <span className={styles.spellMarker} data-spell-marker={kind} data-consumes-slot={consumesSlot || undefined}
    aria-label={label} title={title}><span>{value}</span></span>
}
function Badge({ type, ...props }: NodeViewProps & { type: BadgeType }) {
  const legacyLevel = type === 'spell' ? props.summary.match(/(?:уровень|ур\.?|level)\s*(\d+)/i)?.[1] : undefined
  const level = type === 'spell' ? props.level ?? (legacyLevel === undefined ? undefined : Number(legacyLevel)) : undefined
  const school = type === 'spell' ? getSpellSchool(props.school) : undefined
  return <><div className={styles.nodeBadge}><NodeOutline shape={nodeVisual(type).shape} />
    {props.imageSrc
      ? <img className={styles.nodeImage} data-entity-image={type} src={props.imageSrc} alt="" draggable={false} />
      : type === 'item'
      ? <ItemKindIcon classification={props.classification} colorMode="inherit" className={styles.nodeItemIcon} />
      : type === 'spell' && school
      ? <SpellSchoolIcon school={school} className={styles.nodeSpellIcon} />
      : <BadgeIcon type={type} />}
    {type === 'faction' && <Glyph type="faction" />}
    {type === 'playerCharacter' && <span className={styles.characterDiamond} aria-hidden="true" />}
    {level !== undefined && <SpellMarker kind="level" label={`Уровень заклинания: ${level}`} value={String(level)}
      title={level > 0 ? `Заклинание ${level}-го уровня · требует ячейку` : 'Заговор · ячейка не требуется'} consumesSlot={level > 0} />}
    {type === 'spell' && props.concentration && <SpellMarker kind="concentration" label="Требуется концентрация"
      title="Требуется концентрация" value="К" />}
    {type === 'spell' && props.ritual && <SpellMarker kind="ritual" label="Можно сотворить как ритуал"
      title="Можно сотворить как ритуал" value="Р" />}
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
export const LocationNode = (props: NodeViewProps) => <><div className={styles.locationScene}><img className={styles.locationImage}
  data-custom-image={Boolean(props.imageSrc) || undefined} src={props.imageSrc ?? '/tools/survey/start/background.png'} alt="" draggable={false} /></div>
  <div className={styles.nodeCaption}>
    <h3>{props.title}</h3>
    <p className={`${styles.nodeSummary} ${styles.locationSummary}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" /></svg>
      <span>{props.summary || 'Локация кампании'}</span>
    </p>
  </div></>
export const QuestNode = (props: NodeViewProps) => <div className={styles.nodeCardContent}><Glyph type="quest" /><Caption {...props} /><span className={styles.questArrow} aria-hidden="true">›</span></div>
export const NoteNode = (props: NodeViewProps) => <><span className={styles.noteIcon} aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="M4 5h12M4 10h12M4 15h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span><Caption {...props} /></>
const views = { playerCharacter: CharacterNode, npc: NpcNode, creature: CreatureNode, spell: SpellNode, item: ItemNode,
  faction: FactionNode, location: LocationNode, quest: QuestNode, note: NoteNode } satisfies Record<NodeEntityType, ComponentType<NodeViewProps>>
export function NodeView({ type, ...props }: NodeViewProps & { type: EntityType }) {
  const View = type in views ? views[type as keyof typeof views] : Caption
  return <View {...props} />
}
