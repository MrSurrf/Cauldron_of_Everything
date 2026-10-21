import { memo, useRef, useState } from 'react'
import { BookIcon, Button, IconButton, ListCard, Panel, Popover, ScrollArea, SegmentedControl, TextArea, TextInput, TrashIcon } from '../../shared/ui'
import { useArticleDrafts, type ArticleDraft } from './model'
import { ArticleImages, ArticlePhoto } from './ui/ArticleImages'
import { ArticlePreview } from './ui/ArticlePreview'
import { ArticleSchedule } from './ui/ArticleSchedule'
import { ArticleSource, type ArticleSourceHandle } from './ui/ArticleSource'
import styles from './ArticleEditor.module.css'

const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const DraftListItem = memo(function DraftListItem({ draft, active, onSelect }: {
  draft: ArticleDraft; active: boolean; onSelect: (id: string) => void
}) {
  const cover = draft.images.find(image => image.id === draft.coverImageId)
  return <button type="button" className={styles.draftItem} aria-current={active ? 'true' : undefined}
    onClick={() => onSelect(draft.id)} data-article-draft={draft.id}>
    {cover ? <span className={styles.draftThumbnail}><ArticlePhoto image={cover} maxSize={120} /></span>
      : <span className={styles.draftPlaceholder} aria-hidden="true"><BookIcon /></span>}
    <ListCard appearance="navigation" className={styles.draftCard} name={draft.title.trim() || 'Без названия'}
      tags={[dateFormat.format(new Date(draft.updatedAt)), draft.scheduledFor ? 'Дата отправки задана · локально' : 'Черновик']} />
  </button>
})

function DeleteDraft({ onDelete }: { onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  return <Popover modal open={open} onOpenChange={setOpen} aria-label="Удалить черновик"
    content={<div className={styles.confirmDelete}>
      <h2>Удалить черновик?</h2>
      <p>Черновик будет удалён из этого браузера. Отменить удаление не получится.</p>
      <div className={styles.dialogActions}>
        <Button size="sm" variant="secondary" decoration="bare" onClick={() => setOpen(false)}>Отмена</Button>
        <Button size="sm" decoration="minimal" icon={null} onClick={() => { setOpen(false); onDelete() }}>Удалить черновик</Button>
      </div>
    </div>}>
    <IconButton size="sm" decoration="bare" aria-label="Удалить текущий черновик" icon={<TrashIcon />} />
  </Popover>
}

function DraftWorkspace({ draft, onChange, onDelete }: {
  draft: ArticleDraft; onChange: (patch: Partial<ArticleDraft>) => void; onDelete: () => void
}) {
  const [view, setView] = useState('markdown')
  const sourceHandle = useRef<ArticleSourceHandle | null>(null)
  const words = draft.markdown.trim() ? draft.markdown.trim().split(/\s+/u).length : 0
  const usedImageIds = Array.from(draft.markdown.matchAll(/article-image:([a-zA-Z0-9-]+)/g), match => match[1])
  return <>
    <Panel padding="none" className={styles.editorPanel}>
      <section className={styles.editor} aria-label="Редактор статьи">
        <header className={styles.panelHeader}><h2>Редактор</h2><DeleteDraft onDelete={onDelete} /></header>
        <div className={styles.metadata}>
          <TextInput label="Заголовок статьи" value={draft.title} maxLength={200} autoComplete="off"
            onChange={event => onChange({ title: event.target.value })} />
          <TextArea label="Краткое описание" rows={2} maxLength={500} value={draft.description} className={styles.descriptionControl}
            onChange={event => onChange({ description: event.target.value })} />
        </div>
        <div className={styles.viewTabs}>
          <SegmentedControl aria-label="Режим редактора" value={view} onValueChange={setView}
            options={[{ value: 'markdown', label: 'Markdown' }, { value: 'preview', label: 'Предпросмотр' }]} />
          <span className={styles.modeHint}>{view === 'markdown' ? 'Исходный текст' : 'Так статью увидят читатели'}</span>
        </div>
        <div className={styles.writingArea}>
          <ArticleSource draft={draft} onChange={onChange} hidden={view !== 'markdown'} handleRef={sourceHandle} />
          {view === 'preview' && <ScrollArea aria-label="Предпросмотр статьи" rootClassName={styles.previewArea}>
            <ArticlePreview draft={draft} />
          </ScrollArea>}
        </div>
        <footer className={styles.editorFooter}>
          <div className={styles.statistics} aria-label="Статистика текста">
            <span>Строк: {draft.markdown.split('\n').length}</span><span>Символов: {Array.from(draft.markdown).length}</span><span>Слов: {words}</span>
          </div>
          <ArticleSchedule scheduledFor={draft.scheduledFor} onChange={scheduledFor => onChange({ scheduledFor })} />
          {draft.scheduledFor && <span className={styles.scheduleNote}>Дата сохранена локально · отправка не подключена</span>}
        </footer>
      </section>
    </Panel>
    <Panel padding="none" className={styles.imagesPanel}>
          <ArticleImages key={draft.id} images={draft.images} coverImageId={draft.coverImageId} usedImageIds={usedImageIds}
            onChange={images => onChange({ images, coverImageId: images.some(image => image.id === draft.coverImageId) ? draft.coverImageId : null })}
            onCoverChange={coverImageId => onChange({ coverImageId })}
            onInsert={image => { setView('markdown'); sourceHandle.current?.insertImage(image) }} />
    </Panel>
  </>
}

export function ArticleEditor({ onBack }: { onBack?: () => void }) {
  const { drafts, activeDraft, loading, error, saveState, updateDraft, createDraft, selectDraft, deleteDraft, retrySave } = useArticleDrafts()
  const [query, setQuery] = useState('')
  const visibleDrafts = drafts.filter(draft => draft.title.toLocaleLowerCase('ru-RU').includes(query.trim().toLocaleLowerCase('ru-RU')))

  return <main className={styles.page} data-article-editor data-cursor-light-background="" aria-busy={loading}>
    <header className={styles.pageHeader}>
      <div className={styles.pageHeading}>
        {onBack && <Button size="sm" variant="secondary" decoration="bare" onClick={onBack}>← Статьи</Button>}
        <h1>Редактор статей</h1>
      </div>
      <div className={styles.saveControls}>
        <span className={styles.saveStatus} data-state={saveState} role="status">
          <span aria-hidden="true" />{loading ? 'Загрузка черновиков…' : saveState === 'saving' ? 'Сохранение…' : saveState === 'error' ? 'Не сохранено' : 'Сохранено в этом браузере'}
        </span>
        <Button size="sm" variant="secondary" decoration="minimal" icon={null} disabled={loading || !activeDraft}
          onClick={retrySave}>Сохранить</Button>
        <Button size="sm" decoration="minimal" icon={null} disabled title="Отправка станет доступна после подключения сервера">На модерацию</Button>
      </div>
    </header>
    {error && <div className={styles.errorBanner} role="alert"><span>{error}</span>
      <Button size="sm" variant="secondary" decoration="bare" onClick={retrySave}>Повторить</Button>
    </div>}
    {loading ? <div className={styles.loading} role="status">Открываем ваши черновики…</div> : activeDraft ?
      <div className={styles.layout}>
        <Panel padding="none" className={styles.draftsPanel}>
          <aside className={styles.drafts} aria-label="Черновики статей">
            <header className={styles.panelHeader}><h2>Черновики</h2><span className={styles.counter}>{drafts.length}</span></header>
            <div className={styles.draftActions}>
              <TextInput type="search" aria-label="Поиск черновиков по заголовку" placeholder="Поиск по заголовкам…" value={query}
                onChange={event => setQuery(event.target.value)} />
              <Button size="sm" variant="secondary" decoration="minimal" icon={null} fullWidth
                onClick={() => { setQuery(''); createDraft() }}>＋ Новый черновик</Button>
            </div>
            <ScrollArea aria-label="Список черновиков" rootClassName={styles.draftList} contentClassName={styles.draftListContent}>
              {visibleDrafts.map(draft => <DraftListItem key={draft.id} draft={draft} active={draft.id === activeDraft.id} onSelect={selectDraft} />)}
              {!visibleDrafts.length && <p className={styles.empty}>По этому запросу черновиков нет.</p>}
            </ScrollArea>
            <p className={styles.browserNotice}>Только в этом браузере.<br />Очистка данных сайта удалит черновики и фотографии. На других устройствах они не появятся.</p>
          </aside>
        </Panel>
        <DraftWorkspace key={activeDraft.id} draft={activeDraft} onChange={updateDraft} onDelete={() => deleteDraft(activeDraft.id)} />
      </div> : <div className={styles.loading}>Не удалось открыть локальное хранилище. Проверьте, разрешено ли браузеру сохранять данные сайта.</div>}
  </main>
}
