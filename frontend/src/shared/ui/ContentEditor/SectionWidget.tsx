import { useId, useState, type CSSProperties } from 'react'
import { Button } from '../Button'
import { IconButton } from '../IconButton'
import { EditIcon, TrashIcon } from '../icons'
import { Popover } from '../Popover'
import { TextInput } from '../TextInput'
import { ContentEditor } from './ContentEditor'
import type { ContentWidgetContextValue } from './ContentWidgetContext'
import { sectionColors, type ContentSectionValue } from './sectionContent'
import styles from './SectionWidget.module.css'

export type SectionWidgetProps = ContentWidgetContextValue & {
  value: ContentSectionValue
  onChange: (value: ContentSectionValue) => void
  onRemove: () => void
}

export function SectionWidget({ value, onChange, onRemove, disabled, readOnly, editorId, evaluateResourceMaximum, onStructuredResourceChange }: SectionWidgetProps) {
  const [expanded, setExpanded] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const bodyId = useId()
  const locked = disabled || readOnly
  const title = value.title.trim() || 'Вкладка'
  const color = sectionColors.find(color => color.id === value.color) ?? sectionColors[0]
  const style = { '--section-color': color.value } as CSSProperties
  function update(patch: Partial<ContentSectionValue>) {
    if (!locked) onChange({ ...value, ...patch })
  }

  return (
    <section className={styles.widget} style={style} data-section-widget data-expanded={expanded || undefined}
      onClick={event => event.stopPropagation()} onMouseDown={event => event.stopPropagation()}>
      <header className={styles.header}>
        <button type="button" className={styles.toggle} aria-label={`${expanded ? 'Свернуть' : 'Развернуть'} раздел «${title}»`}
          aria-expanded={expanded} aria-controls={bodyId} disabled={disabled} onClick={() => setExpanded(!expanded)}>
          <span className={styles.chevron} aria-hidden="true" />
        </button>
        <input className={styles.title} aria-label="Название раздела" placeholder="Название" value={value.title}
          readOnly={locked} disabled={disabled} onChange={event => update({ title: event.currentTarget.value })}
          onKeyDown={event => { event.stopPropagation(); if (event.key === 'Enter') event.currentTarget.blur() }} />
        {value.tag && <span className={styles.tag} title={value.tag}>{value.tag}</span>}
        {!locked && <div className={styles.actions}>
          <Popover aria-label={`Настройки раздела «${title}»`} className={styles.settings} open={settingsOpen} onOpenChange={setSettingsOpen}
            content={<div className={styles.settingsContent} data-content-editor-owner={editorId}>
              <TextInput aria-label="Тег раздела" placeholder="Тег" value={value.tag} onChange={event => update({ tag: event.currentTarget.value })} />
              <div className={styles.colors} role="group" aria-label="Цвет раздела">
                {sectionColors.map(option => <button key={option.id} type="button" className={styles.swatch}
                  style={{ '--swatch-color': option.value } as CSSProperties} aria-label={option.label} aria-pressed={value.color === option.id}
                  onClick={() => update({ color: option.id })} />)}
              </div>
              <div className={styles.settingsActions}>
                <Button size="sm" variant="secondary" decoration="minimal" onClick={() => setSettingsOpen(false)}>Готово</Button>
                <IconButton aria-label="Удалить раздел" decoration="bare" size="sm" icon={<TrashIcon />} onClick={onRemove} />
              </div>
            </div>}>
            <IconButton aria-label="Настройки раздела" title="Цвет и тег" decoration="bare" size="sm" className={styles.action}
              icon={<EditIcon />} />
          </Popover>
          <IconButton aria-label="Удалить вкладку" decoration="bare" size="sm" className={styles.action} onClick={onRemove}
            icon={<TrashIcon />} />
        </div>}
      </header>
      {expanded && <div id={bodyId} className={styles.body}>
        <ContentEditor accessibleLabel={`Содержимое раздела «${title}»`} value={value.body} onValueChange={body => update({ body })}
          allowSections={false} autoGrow disabled={disabled} readOnly={readOnly} renderPreview showStructureActions showTextScaleControls={false}
          rows={3} placeholder="Текст и виджеты…" evaluateResourceMaximum={evaluateResourceMaximum}
          onStructuredResourceChange={onStructuredResourceChange} />
      </div>}
    </section>
  )
}
