import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Button,
  CampaignWikiImageField,
  Checkbox,
  EditIcon,
  IconButton,
  ScrollArea,
  Select,
  TextInput,
  useCampaignWikiImage,
} from '../../../shared/ui'
import { ContentEditor } from '../../../shared/ui/ContentEditor'
import { entityLabel } from '../model/library'
import type { LibraryReference } from '../model/library'
import { loadCampaignCharacter } from '../model/campaignCharacter'
import { validReference } from '../model/table'
import type { CanvasEntity, Diagram, InstanceData, NodeEntityType, TableNode } from '../model/table'
import type { EntityWiki, WikiSection, WikiVisibility } from '../model/wiki'
import { CampaignCharacterWiki } from './CampaignCharacterWiki'
import { WikiLinkPicker } from './WikiLinkPicker'
import { ResizeGrip } from './ResizeGrip'
import { ENTITY_DRAG_TYPE, useTableActions } from './tableContext'
import { prepareInspectorRelations } from './inspectorRelations'
import type { InspectorMember } from './inspectorRelations'
import tableStyles from './CampaignTable.module.css'
import styles from './CampaignWikiPanel.module.css'

export type EntityChanges = Partial<Pick<CanvasEntity, 'name' | 'description' | 'wiki' | 'campaignCharacter'>>

const visibilityOptions = [
  { value: 'master', label: 'Только мастер' },
  { value: 'players', label: 'Мастер и игроки' },
  { value: 'public', label: 'Публично' },
] as const

const entityCopy: Partial<Record<NodeEntityType, { description: string; members: string }>> = {
  location: { description: 'Описание', members: 'Обитатели и объекты' },
  npc: { description: 'Биография', members: 'Содержимое' },
  playerCharacter: { description: 'Краткое описание', members: 'Кампанийные предметы' },
  faction: { description: 'Описание', members: 'Участники' },
  quest: { description: 'Описание квеста', members: 'Содержимое' },
  note: { description: 'Заметка', members: 'Содержимое' },
}

type EntityLink = {
  id: string
  entityId: string
  name: string
  type: string
  onRelease?: () => void
}

function commaValues(value: string) {
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

function NameField({ entity, onUpdate }: {
  entity: CanvasEntity
  onUpdate: (changes: EntityChanges) => void
}) {
  const [draft, setDraft] = useState(entity.name)
  const canceled = useRef(false)

  function save() {
    if (canceled.current) {
      canceled.current = false
      setDraft(entity.name)
      return
    }
    if (draft.trim()) onUpdate({ name: draft.trim() })
    else setDraft(entity.name)
  }

  return <TextInput rootClassName={styles.titleInput} aria-label="Название страницы" value={draft}
    onChange={event => { canceled.current = false; setDraft(event.target.value) }} onBlur={save}
    onKeyDown={event => {
      if (event.key === 'Enter') event.currentTarget.blur()
      if (event.key === 'Escape') { canceled.current = true; event.currentTarget.blur() }
    }} />
}

function WikiBlock({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return <section className={`${styles.wikiSection} ${className}`} data-wiki-section>
    <h3>{title}</h3>
    {children}
  </section>
}

function WikiPropertiesEditor({ wiki, onChange }: {
  wiki: EntityWiki
  onChange: (wiki: EntityWiki) => void
}) {
  return <WikiBlock title="Свойства" className={styles.properties}>
    <label><span>Псевдонимы</span><TextInput value={wiki.aliases.join(', ')} placeholder="Через запятую"
      onChange={event => onChange({ ...wiki, aliases: commaValues(event.target.value) })} /></label>
    <label><span>Мир</span><TextInput value={wiki.world} placeholder="Например, Срединный мир"
      onChange={event => onChange({ ...wiki, world: event.target.value })} /></label>
    <label><span>Статус</span><TextInput value={wiki.status} placeholder="Активен, разрушена…"
      onChange={event => onChange({ ...wiki, status: event.target.value })} /></label>
    <label><span>Теги</span><TextInput value={wiki.tags.join(', ')} placeholder="Через запятую"
      onChange={event => onChange({ ...wiki, tags: commaValues(event.target.value) })} /></label>
    {wiki.customProperties.map(property => <div className={styles.customProperty} key={property.id}>
      <TextInput aria-label="Название свойства" value={property.label} placeholder="Свойство"
        onChange={event => onChange({ ...wiki, customProperties: wiki.customProperties.map(item => item.id === property.id ? { ...item, label: event.target.value } : item) })} />
      <TextInput aria-label={`Значение свойства ${property.label || ''}`} value={property.value} placeholder="Значение"
        onChange={event => onChange({ ...wiki, customProperties: wiki.customProperties.map(item => item.id === property.id ? { ...item, value: event.target.value } : item) })} />
      <button type="button" aria-label="Удалить свойство" onClick={() => onChange({ ...wiki, customProperties: wiki.customProperties.filter(item => item.id !== property.id) })}>×</button>
    </div>)}
    <button className={styles.addProperty} type="button" onClick={() => onChange({ ...wiki, customProperties: [...wiki.customProperties, { id: crypto.randomUUID(), label: '', value: '' }] })}>+ Добавить свойство</button>
  </WikiBlock>
}

function WikiPropertiesView({ wiki }: { wiki: EntityWiki }) {
  const entries = [
    ...(wiki.aliases.length ? [{ label: 'Также известен как', value: wiki.aliases.join(', ') }] : []),
    ...(wiki.world ? [{ label: 'Мир', value: wiki.world }] : []),
    ...wiki.customProperties.filter(property => property.label || property.value).map(property => ({
      label: property.label || 'Свойство', value: property.value || '—',
    })),
  ]
  if (!entries.length) return null
  return <WikiBlock title="Свойства">
    <dl className={styles.readProperties}>{entries.map(entry => <div key={`${entry.label}:${entry.value}`}>
      <dt>{entry.label}</dt><dd>{entry.value}</dd>
    </div>)}</dl>
  </WikiBlock>
}

function WikiSections({ sections, editing, publicView, onChange, onLinkActivate }: {
  sections: WikiSection[]
  editing: boolean
  publicView: boolean
  onChange: (sections: WikiSection[]) => void
  onLinkActivate: (target: string) => void
}) {
  const visibleSections = sections.filter(section => (!publicView || section.visibility === 'public')
    && (editing || Boolean(section.title.trim() || section.content.trim())))
  const update = (id: string, changes: Partial<WikiSection>) => onChange(sections.map(section => section.id === id ? { ...section, ...changes } : section))

  if (!editing && !visibleSections.length) return null
  return <section className={styles.sections} aria-label="Разделы страницы">
    {visibleSections.map(section => <details className={`${styles.wikiSection} ${styles.section}`} data-wiki-section
      key={section.id} open={!section.collapsedByDefault}>
      <summary>
        <strong>{section.title || 'Без названия'}</strong>
        {!publicView && section.visibility !== 'public' && <small>{visibilityOptions.find(option => option.value === section.visibility)?.label}</small>}
      </summary>
      {editing && <div className={styles.sectionTools}>
        <TextInput aria-label="Название раздела" value={section.title} placeholder="Название раздела"
          onChange={event => update(section.id, { title: event.target.value })} />
        <Select aria-label="Видимость раздела" value={section.visibility} options={visibilityOptions}
          onValueChange={value => update(section.id, { visibility: value as WikiVisibility })} />
        <Checkbox label="Свёрнут" checked={section.collapsedByDefault}
          onCheckedChange={checked => update(section.id, { collapsedByDefault: checked })} />
        <button type="button" aria-label="Удалить раздел" onClick={() => onChange(sections.filter(item => item.id !== section.id))}>×</button>
      </div>}
      <ContentEditor rootClassName={styles.editor} accessibleLabel={`Содержимое раздела ${section.title || ''}`}
        value={section.content} readOnly={!editing} renderPreview autoGrow rows={editing ? 5 : 2}
        showStructureActions={editing} showTextScaleControls={editing}
        viewerAudience={publicView ? 'public' : 'master'} inheritedVisibility={section.visibility}
        onLinkActivate={(target, event) => { event.preventDefault(); onLinkActivate(target) }}
        onValueChange={content => update(section.id, { content })} />
    </details>)}
    {editing && <button className={styles.addSection} type="button" onClick={() => onChange([...sections, {
      id: crypto.randomUUID(), title: 'Новый раздел', content: '', visibility: 'master', collapsedByDefault: false,
    }])}>+ Новый раздел</button>}
  </section>
}

function WikiEntityLinks({ title, items, editing, onOpenEntity }: {
  title: string
  items: EntityLink[]
  editing: boolean
  onOpenEntity: (entityId: string) => void
}) {
  if (!items.length) return null
  return <WikiBlock title={title}>
    <ul className={styles.entityLinks}>{items.map(item => <li key={item.id}>
      <button type="button" onClick={() => onOpenEntity(item.entityId)}>
        <strong>{item.name}</strong><small>{item.type}</small>
      </button>
      {editing && item.onRelease && <button className={styles.release} type="button" onClick={item.onRelease}>Извлечь</button>}
    </li>)}</ul>
  </WikiBlock>
}

function CampaignCharacterContent({ entity, data, onUpdate, onOpenFull }: {
  entity: CanvasEntity
  data: InstanceData
  onUpdate: (changes: EntityChanges) => void
  onOpenFull: () => void
}) {
  const [error, setError] = useState('')
  const updateRef = useRef(onUpdate)
  useEffect(() => { updateRef.current = onUpdate }, [onUpdate])

  useEffect(() => {
    if (entity.campaignCharacter) return
    const controller = new AbortController()
    void loadCampaignCharacter(data, controller.signal)
      .then(campaignCharacter => { if (!controller.signal.aborted) updateRef.current({ campaignCharacter }) })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Не удалось открыть персонажа.') })
    return () => controller.abort()
  }, [entity.campaignCharacter, data])

  if (error) return <p className={styles.error} role="alert">{error}</p>
  if (!entity.campaignCharacter) return <p className={styles.loading} role="status">Готовим версию персонажа для этой кампании…</p>
  return <CampaignCharacterWiki document={entity.campaignCharacter.document} onOpenFull={onOpenFull} />
}

function relatedGroups(type: string, related: CanvasEntity[]) {
  if (type === 'location') {
    return [
      { title: 'Связанные места', items: related.filter(item => item.entityType === 'location') },
      { title: 'Связанные сущности', items: related.filter(item => item.entityType !== 'location') },
    ]
  }
  if (type === 'faction') {
    return [
      { title: 'Участники и связи', items: related.filter(item => ['playerCharacter', 'npc'].includes(item.entityType)) },
      { title: 'Территория', items: related.filter(item => item.entityType === 'location') },
      { title: 'Другие связи', items: related.filter(item => !['playerCharacter', 'npc', 'location'].includes(item.entityType)) },
    ]
  }
  return [{ title: type === 'npc' || type === 'playerCharacter' ? 'Связи' : 'Связанные страницы', items: related }]
}

type InspectorProps = {
  entity: CanvasEntity
  node: TableNode
  diagram: Diagram
  diagrams: Diagram[]
  entities: CanvasEntity[]
  width: number
  readOnly: boolean
  canGoBack?: boolean
  canGoForward?: boolean
  onResize: (width: number) => void
  onClose: () => void
  onBack?: () => void
  onForward?: () => void
  onOpenFull: () => void
  onOpenEntity: (entityId: string) => void
  onOpenLink: (target: string) => void
  onDropReference?: (reference: LibraryReference) => void
  onUpdate: (changes: EntityChanges) => void
}

/** Контекст холста меняется при движении; содержимое панели получает только смысловые изменения. */
export function LocalEntityInspector(props: InspectorProps) {
  const actions = useTableActions()
  const latest = useRef({ props, actions })
  useLayoutEffect(() => { latest.current = { props, actions } }, [props, actions])
  const [commands] = useState(() => ({
    onResize: (width: number) => latest.current.props.onResize(width),
    onClose: () => latest.current.props.onClose(),
    onBack: () => latest.current.props.onBack?.(),
    onForward: () => latest.current.props.onForward?.(),
    onOpenFull: () => latest.current.props.onOpenFull(),
    onOpenEntity: (id: string) => latest.current.props.onOpenEntity(id),
    onOpenLink: (target: string) => latest.current.props.onOpenLink(target),
    onDropReference: (reference: LibraryReference) => latest.current.props.onDropReference?.(reference),
    onUpdate: (changes: EntityChanges) => latest.current.props.onUpdate(changes),
    release: (id: string) => latest.current.actions.release(id),
    duplicate: (id: string) => latest.current.actions.duplicate(id),
    remove: (id: string) => latest.current.actions.remove(id),
  }))
  const { entity, node, diagram, diagrams, entities, width, readOnly, canGoBack, canGoForward } = props
  const [relations, setRelations] = useState(() => prepareInspectorRelations(node.id, entity.id, diagram, diagrams, entities))
  if (relations.nodeId !== node.id || relations.entityId !== entity.id || relations.diagram !== diagram
    || relations.diagrams !== diagrams || relations.entities !== entities) {
    setRelations(prepareInspectorRelations(node.id, entity.id, diagram, diagrams, entities, relations))
  }
  return <InspectorContent entity={entity} nodeId={node.id} nodeData={node.data} entities={entities}
    members={relations.members} related={relations.related} placements={relations.placements}
    width={width} readOnly={readOnly} canGoBack={canGoBack} canGoForward={canGoForward} {...commands} />
}

type InspectorContentProps = Omit<InspectorProps, 'node' | 'diagram' | 'diagrams'> & {
  nodeId: string
  nodeData: InstanceData
  members: InspectorMember[]
  related: CanvasEntity[]
  placements: number
  release: (id: string) => void
  duplicate: (id: string) => void
  remove: (id: string) => void
}
const InspectorContent = memo(function InspectorContent({ entity, nodeId, nodeData, entities, members, related, placements, width, readOnly,
  canGoBack = false, canGoForward = false, onResize, onClose, onBack, onForward, onOpenFull,
  onOpenEntity, onOpenLink, onDropReference, onUpdate, release, duplicate, remove }: InspectorContentProps) {
  const [editing, setEditing] = useState(false)
  const [characterDropActive, setCharacterDropActive] = useState(false)
  const wiki = entity.wiki
  const cover = useCampaignWikiImage(wiki.media.coverAssetId)
  const avatar = useCampaignWikiImage(wiki.media.avatarAssetId)
  const avatarSrc = avatar.src ?? (entity.entityType === 'playerCharacter'
    ? entity.campaignCharacter?.document.identity.portraitUrl ?? undefined : undefined)
  const copy = entityCopy[entity.entityType as NodeEntityType] ?? { description: 'Описание', members: 'Содержимое' }
  const propertyCount = wiki.aliases.length + Number(Boolean(wiki.world))
    + wiki.customProperties.filter(property => property.label || property.value).length
  const groups = relatedGroups(entity.entityType, related)
  const hasSidebar = Boolean(propertyCount || members.length || groups.some(group => group.items.length))

  function activateLink(target: string) {
    if (target.startsWith('#entity:')) onOpenEntity(decodeURIComponent(target.slice('#entity:'.length)))
    else onOpenLink(target)
  }

  const memberLinks: EntityLink[] = members.map(member => ({
    id: member.id,
    entityId: member.entityId,
    name: member.title,
    type: entityLabel(member.entityType),
    onRelease: () => release(member.id),
  }))

  return <aside className={`${tableStyles.inspectorWindow} ${styles.panel}`} aria-label="Wiki-карточка объекта"
    data-campaign-panel="wiki" data-wiki-mode={editing ? 'edit' : 'view'}
    data-character-drop-active={characterDropActive || undefined}
    onDragOver={event => {
      if (entity.entityType !== 'playerCharacter' || !Array.from(event.dataTransfer.types).includes(ENTITY_DRAG_TYPE)) return
      event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setCharacterDropActive(true)
    }}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setCharacterDropActive(false) }}
    onDrop={event => {
      setCharacterDropActive(false)
      if (entity.entityType !== 'playerCharacter') return
      event.preventDefault()
      try {
        const value: unknown = JSON.parse(event.dataTransfer.getData(ENTITY_DRAG_TYPE))
        if (validReference(value) && value.source === 'encyclopedia' && ['item', 'spell'].includes(value.entityType)) onDropReference?.(value)
      } catch { /* Некорректный payload не меняет кампанийный лист. */ }
    }}>
    <ResizeGrip label="Ширина wiki-карточки" width={width} min={380} max={760} onResize={onResize} />
    <nav className={styles.navigation} aria-label="Навигация карточки">
      <button type="button" aria-label="Назад" disabled={!canGoBack} onClick={onBack}>←</button>
      <button type="button" aria-label="Вперёд" disabled={!canGoForward} onClick={onForward}>→</button>
      <span>{entityLabel(entity.entityType)}</span>
      {placements > 1 && <small>{placements} размещения</small>}
      {!readOnly && (editing
        ? <Button size="sm" variant="secondary" decoration="bare" className={styles.doneButton}
          aria-label="Завершить редактирование" onClick={() => setEditing(false)}>Готово</Button>
        : <IconButton size="sm" variant="secondary" className={styles.editButton} icon={<EditIcon />}
          aria-label="Редактировать страницу" title="Редактировать" onClick={() => setEditing(true)} />)}
      <button className={styles.close} type="button" aria-label="Закрыть карточку" onClick={onClose}>×</button>
    </nav>
    <ScrollArea aria-label="Wiki-страница объекта" rootClassName={tableStyles.panelScrollArea} contentClassName={styles.body}>
      {!editing ? <header className={styles.hero} data-has-cover={Boolean(cover.src) || undefined} data-has-avatar={Boolean(avatarSrc) || undefined}>
        {cover.src && <img className={styles.heroCover} src={cover.src} alt="" />}
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>{entityLabel(entity.entityType)}</span>
          <h2 className={styles.title}>{entity.name}</h2>
          {(wiki.status || wiki.tags.length > 0) && <div className={styles.heroChips}>
            {wiki.status && <span>{wiki.status}</span>}
            {wiki.tags.map(tag => <span key={tag}>{tag}</span>)}
          </div>}
        </div>
        {avatarSrc && <img className={styles.heroAvatar} src={avatarSrc} alt={`Портрет: ${entity.name}`} />}
      </header> : <>
        <header className={styles.editHeader}>
          <span className={styles.eyebrow}>{entityLabel(entity.entityType)}</span>
          <NameField entity={entity} onUpdate={onUpdate} />
        </header>
        <WikiBlock title="Изображения" className={styles.mediaEditor}>
          <div className={styles.mediaFields}>
            <CampaignWikiImageField className={styles.coverEditor} kind="cover" label="Обложка" alt="" assetId={wiki.media.coverAssetId}
              onAssetIdChange={assetId => onUpdate({ wiki: { ...wiki, media: { ...wiki.media, coverAssetId: assetId ?? undefined } } })} />
            {(entity.entityType === 'playerCharacter' || entity.entityType === 'npc') && <CampaignWikiImageField className={styles.avatarEditor}
              kind="avatar" label="Портрет" alt="" assetId={wiki.media.avatarAssetId}
              onAssetIdChange={assetId => onUpdate({ wiki: { ...wiki, media: { ...wiki.media, avatarAssetId: assetId ?? undefined } } })} />}
          </div>
        </WikiBlock>
      </>}

      <div className={styles.wikiLayout} data-has-sidebar={hasSidebar || editing || undefined}>
        <main className={styles.wikiMain}>
          {(editing || entity.description.trim()) && <WikiBlock title={copy.description}>
            {editing && <div className={styles.sectionActions}><WikiLinkPicker currentEntityId={entity.id} entities={entities} onInsert={(label, target) => {
              onUpdate({ description: `${entity.description}${entity.description.trim() ? '\n\n' : ''}[${label}](${target})` })
            }} /></div>}
            <ContentEditor rootClassName={styles.editor} accessibleLabel={copy.description} value={entity.description}
              readOnly={!editing} renderPreview autoGrow rows={editing ? 6 : 2}
              showStructureActions={editing} showTextScaleControls={editing}
              viewerAudience={readOnly ? 'public' : 'master'}
              onLinkActivate={(target, event) => { event.preventDefault(); activateLink(target) }}
              onValueChange={description => onUpdate({ description })} />
          </WikiBlock>}

          {entity.entityType === 'playerCharacter' && <CampaignCharacterContent entity={entity} data={nodeData}
            onUpdate={onUpdate} onOpenFull={onOpenFull} />}

          <WikiSections sections={wiki.sections} editing={editing} publicView={readOnly}
            onChange={sections => onUpdate({ wiki: { ...wiki, sections } })} onLinkActivate={activateLink} />

          {!hasSidebar && !editing && groups.map(group => <WikiEntityLinks key={group.title} title={group.title}
            items={group.items.map(item => ({ id: item.id, entityId: item.id, name: item.name, type: entityLabel(item.entityType) }))}
            editing={false} onOpenEntity={onOpenEntity} />)}
        </main>

        {(hasSidebar || editing) && <aside className={styles.wikiSidebar} aria-label="Сводка страницы">
          {editing ? <WikiPropertiesEditor wiki={wiki} onChange={next => onUpdate({ wiki: next })} /> : <WikiPropertiesView wiki={wiki} />}
          <WikiEntityLinks title={copy.members} items={memberLinks} editing={editing} onOpenEntity={onOpenEntity} />
          {groups.map(group => <WikiEntityLinks key={group.title} title={group.title}
            items={group.items.map(item => ({ id: item.id, entityId: item.id, name: item.name, type: entityLabel(item.entityType) }))}
            editing={editing} onOpenEntity={onOpenEntity} />)}
          {editing && <details className={styles.additional}><summary>Дополнительные действия</summary>
            <Button size="sm" variant="secondary" decoration="bare" onClick={() => duplicate(nodeId)}>Дублировать размещение</Button>
            <Button size="sm" variant="secondary" decoration="bare" onClick={() => { remove(nodeId); onClose() }}>Убрать со схемы</Button>
          </details>}
        </aside>}
      </div>
    </ScrollArea>
  </aside>
})
