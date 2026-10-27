import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, CampaignWikiImageField, Checkbox, ScrollArea, Select, TextInput } from '../../../shared/ui'
import { ContentEditor } from '../../../shared/ui/ContentEditor'
import { entityLabel } from '../model/library'
import { loadCampaignCharacter } from '../model/campaignCharacter'
import { containerOf } from '../model/nodeContainment'
import { validReference } from '../model/table'
import type { CanvasEntity, Diagram, TableNode } from '../model/table'
import type { EntityWiki, WikiSection, WikiVisibility } from '../model/wiki'
import { CampaignCharacterWiki } from './CampaignCharacterWiki'
import { WikiLinkPicker } from './WikiLinkPicker'
import { ResizeGrip } from './ResizeGrip'
import { ENTITY_DRAG_TYPE, useTableActions } from './tableContext'
import tableStyles from './CampaignTable.module.css'
import styles from './CampaignWikiPanel.module.css'

export type EntityChanges = Partial<Pick<CanvasEntity, 'name' | 'description' | 'wiki' | 'campaignCharacter'>>

const visibilityOptions = [
  { value: 'master', label: 'Только мастер' },
  { value: 'players', label: 'Мастер и игроки' },
  { value: 'public', label: 'Публично' },
] as const

function commaValues(value: string) {
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

function NameField({ entity, readOnly, onUpdate }: {
  entity: CanvasEntity
  readOnly: boolean
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

  if (readOnly) return <h2 className={styles.title}>{entity.name}</h2>
  return <TextInput rootClassName={styles.titleInput} aria-label="Название страницы" value={draft}
    onChange={event => { canceled.current = false; setDraft(event.target.value) }} onBlur={save}
    onKeyDown={event => {
      if (event.key === 'Enter') event.currentTarget.blur()
      if (event.key === 'Escape') { canceled.current = true; event.currentTarget.blur() }
    }} />
}

function WikiProperties({ wiki, readOnly, onChange }: {
  wiki: EntityWiki
  readOnly: boolean
  onChange: (wiki: EntityWiki) => void
}) {
  const standard = [
    ['Псевдонимы', wiki.aliases.join(', ')],
    ['Мир', wiki.world],
    ['Статус', wiki.status],
    ['Теги', wiki.tags.join(', ')],
  ] as const

  if (readOnly) {
    const visible = standard.filter(([, value]) => value)
    return visible.length || wiki.customProperties.length ? <dl className={styles.readProperties}>
      {visible.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      {wiki.customProperties.filter(property => property.label || property.value).map(property => <div key={property.id}>
        <dt>{property.label || 'Свойство'}</dt><dd>{property.value || '—'}</dd>
      </div>)}
    </dl> : null
  }

  return <section className={styles.properties} aria-label="Свойства страницы">
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
  </section>
}

function WikiSections({ sections, readOnly, onChange, onLinkActivate }: {
  sections: WikiSection[]
  readOnly: boolean
  onChange: (sections: WikiSection[]) => void
  onLinkActivate: (target: string) => void
}) {
  const visibleSections = readOnly ? sections.filter(section => section.visibility === 'public') : sections
  const update = (id: string, changes: Partial<WikiSection>) => onChange(sections.map(section => section.id === id ? { ...section, ...changes } : section))

  return <section className={styles.sections} aria-label="Разделы страницы">
    {visibleSections.map(section => <details className={styles.section} key={section.id} open={!section.collapsedByDefault}>
      <summary>
        <strong>{section.title || 'Без названия'}</strong>
        {!readOnly && <small>{visibilityOptions.find(option => option.value === section.visibility)?.label}</small>}
      </summary>
      {!readOnly && <div className={styles.sectionTools}>
          <TextInput aria-label="Название раздела" value={section.title} placeholder="Название раздела"
            onChange={event => update(section.id, { title: event.target.value })} />
          <Select aria-label="Видимость раздела" value={section.visibility} options={visibilityOptions}
            onValueChange={value => update(section.id, { visibility: value as WikiVisibility })} />
          <Checkbox label="Свёрнут" checked={section.collapsedByDefault}
            onCheckedChange={checked => update(section.id, { collapsedByDefault: checked })} />
          <button type="button" aria-label="Удалить раздел" onClick={() => onChange(sections.filter(item => item.id !== section.id))}>×</button>
        </div>}
      <ContentEditor rootClassName={styles.editor} accessibleLabel={`Содержимое раздела ${section.title || ''}`}
        value={section.content} readOnly={readOnly} renderPreview autoGrow showStructureActions={!readOnly}
        viewerAudience={readOnly ? 'public' : 'master'} inheritedVisibility={section.visibility}
        onLinkActivate={(target, event) => { event.preventDefault(); onLinkActivate(target) }}
        onValueChange={content => update(section.id, { content })} />
    </details>)}
    {!readOnly && <button className={styles.addSection} type="button" onClick={() => onChange([...sections, {
      id: crypto.randomUUID(), title: 'Новый раздел', content: '', visibility: 'master', collapsedByDefault: false,
    }])}>+ Новый раздел</button>}
  </section>
}

function CampaignCharacterContent({ entity, node, readOnly, onUpdate, onOpenFull }: {
  entity: CanvasEntity
  node: TableNode
  readOnly: boolean
  onUpdate: (changes: EntityChanges) => void
  onOpenFull: () => void
}) {
  const [error, setError] = useState('')
  const updateRef = useRef(onUpdate)
  useEffect(() => { updateRef.current = onUpdate }, [onUpdate])

  useEffect(() => {
    if (entity.campaignCharacter) return
    const controller = new AbortController()
    void loadCampaignCharacter(node.data, controller.signal)
      .then(campaignCharacter => { if (!controller.signal.aborted) updateRef.current({ campaignCharacter }) })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Не удалось открыть персонажа.') })
    return () => controller.abort()
  }, [entity.campaignCharacter, node.data])

  if (error) return <p className={styles.error} role="alert">{error}</p>
  if (!entity.campaignCharacter) return <p className={styles.loading} role="status">Готовим версию персонажа для этой кампании…</p>
  return <CampaignCharacterWiki document={entity.campaignCharacter.document} avatarAssetId={entity.wiki.media.avatarAssetId}
    readOnly={readOnly} onOpenFull={onOpenFull}
    onChange={document => onUpdate({ campaignCharacter: { ...entity.campaignCharacter!, document } })} />
}

export function LocalEntityInspector({ entity, node, diagram, diagrams, entities, width, readOnly,
  canGoBack = false, canGoForward = false, onResize, onClose, onBack, onForward, onOpenFull,
  onOpenEntity, onOpenLink, onDropReference, onUpdate }: {
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
  onDropReference?: (reference: import('../model/library').LibraryReference) => void
  onUpdate: (changes: EntityChanges) => void
}) {
  const actions = useTableActions()
  const [characterDropActive, setCharacterDropActive] = useState(false)
  const members = diagram.nodes.filter(item => containerOf(item) === node.id)
  const placements = diagrams.reduce((total, item) => total + item.nodes.filter(placement => placement.data.entityId === entity.id).length, 0)
  const related = useMemo(() => {
    const ids = new Set<string>()
    for (const item of diagrams) {
      for (const edge of item.edges) {
        const source = item.nodes.find(candidate => candidate.id === edge.source)
        const target = item.nodes.find(candidate => candidate.id === edge.target)
        if (source?.data.entityId === entity.id && target) ids.add(target.data.entityId)
        if (target?.data.entityId === entity.id && source) ids.add(source.data.entityId)
      }
    }
    return entities.filter(candidate => ids.has(candidate.id))
  }, [diagrams, entities, entity.id])

  function activateLink(target: string) {
    if (target.startsWith('#entity:')) onOpenEntity(decodeURIComponent(target.slice('#entity:'.length)))
    else onOpenLink(target)
  }

  const wiki = entity.wiki
  return <aside className={`${tableStyles.inspectorWindow} ${styles.panel}`} aria-label="Wiki-карточка объекта" data-campaign-panel="wiki"
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
      <button className={styles.close} type="button" aria-label="Закрыть карточку" onClick={onClose}>×</button>
    </nav>
    <ScrollArea aria-label="Wiki-страница объекта" rootClassName={tableStyles.panelScrollArea} contentClassName={styles.body}>
      {(!readOnly || wiki.media.coverAssetId) && <CampaignWikiImageField className={styles.cover} kind="cover" label="Обложка" alt="" assetId={wiki.media.coverAssetId}
        editable={!readOnly} onAssetIdChange={assetId => onUpdate({ wiki: { ...wiki, media: { ...wiki.media, coverAssetId: assetId ?? undefined } } })} />
      }
      <div className={styles.titleRow} data-has-avatar={(entity.entityType === 'playerCharacter' || entity.entityType === 'npc') && (!readOnly || Boolean(wiki.media.avatarAssetId)) || undefined}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>{entityLabel(entity.entityType)}</span>
          <NameField entity={entity} readOnly={readOnly} onUpdate={onUpdate} />
        </header>
        {(entity.entityType === 'playerCharacter' || entity.entityType === 'npc') && (!readOnly || wiki.media.avatarAssetId) && <CampaignWikiImageField className={styles.avatar}
          kind="avatar" label="Портрет" alt="" assetId={wiki.media.avatarAssetId} editable={!readOnly}
          onAssetIdChange={assetId => onUpdate({ wiki: { ...wiki, media: { ...wiki.media, avatarAssetId: assetId ?? undefined } } })} />}
      </div>
      <WikiProperties wiki={wiki} readOnly={readOnly} onChange={next => onUpdate({ wiki: next })} />

      <section className={styles.lead}>
        <div className={styles.sectionHeading}><h3>Основная информация</h3>
          {!readOnly && <WikiLinkPicker currentEntityId={entity.id} entities={entities} onInsert={(label, target) => {
            onUpdate({ description: `${entity.description}${entity.description.trim() ? '\n\n' : ''}[${label}](${target})` })
          }} />}
        </div>
        <ContentEditor rootClassName={styles.editor} accessibleLabel="Основная информация" value={entity.description}
          readOnly={readOnly} renderPreview autoGrow rows={6} showStructureActions={!readOnly}
          viewerAudience={readOnly ? 'public' : 'master'}
          onLinkActivate={(target, event) => { event.preventDefault(); activateLink(target) }}
          onValueChange={description => onUpdate({ description })} />
      </section>

      <WikiSections sections={wiki.sections} readOnly={readOnly} onChange={sections => onUpdate({ wiki: { ...wiki, sections } })} onLinkActivate={activateLink} />

      {entity.entityType === 'playerCharacter' && <CampaignCharacterContent entity={entity} node={node} readOnly={readOnly} onUpdate={onUpdate} onOpenFull={onOpenFull} />}

      {members.length > 0 && <section className={styles.related}><h3>Содержимое</h3><ul>{members.map(member => <li key={member.id}>
        <button type="button" onClick={() => onOpenEntity(member.data.entityId)}>{member.data.title}</button>
        {!readOnly && <button type="button" onClick={() => actions.release(member.id)}>Извлечь</button>}
      </li>)}</ul></section>}
      {related.length > 0 && <section className={styles.related}><h3>Связанные страницы</h3><ul>{related.map(item => <li key={item.id}>
        <button type="button" onClick={() => onOpenEntity(item.id)}>{item.name}<small>{entityLabel(item.entityType)}</small></button>
      </li>)}</ul></section>}
      <p className={styles.meta}>{diagram.edges.filter(edge => edge.source === node.id || edge.target === node.id).length} связей · {placements} размещений</p>
      {entity.entityType !== 'playerCharacter' && <Button size="sm" variant="secondary" decoration="minimal" onClick={onOpenFull}>Открыть отдельной вкладкой</Button>}
      {!readOnly && <details className={styles.additional}><summary>Дополнительные действия</summary>
        <Button size="sm" variant="secondary" decoration="bare" onClick={() => actions.duplicate(node.id)}>Дублировать размещение</Button>
        <Button size="sm" variant="secondary" decoration="bare" onClick={() => { actions.remove(node.id); onClose() }}>Убрать со схемы</Button>
      </details>}
    </ScrollArea>
  </aside>
}

/** Временный полноэкранный режим для обычных wiki-страниц. */
export function LocalEntityEditor({ entity, diagramName, readOnly, onBack, onUpdate }: {
  entity: CanvasEntity
  diagramName: string
  readOnly: boolean
  onBack: () => void
  onUpdate: (changes: EntityChanges) => void
}) {
  return <section className={styles.fullEditor} aria-label="Wiki-редактор">
    <nav className={styles.tabs}><button type="button" onClick={onBack}>{diagramName}</button><button type="button" aria-current="page">{entity.name}</button></nav>
    <ScrollArea aria-label="Wiki-редактор" contentClassName={styles.fullEditorBody}>
      <NameField entity={entity} readOnly={readOnly} onUpdate={onUpdate} />
      <ContentEditor accessibleLabel="Полная страница" value={entity.description} readOnly={readOnly} renderPreview autoGrow rows={16}
        showStructureActions={!readOnly} viewerAudience={readOnly ? 'public' : 'master'} onValueChange={description => onUpdate({ description })} />
    </ScrollArea>
  </section>
}
