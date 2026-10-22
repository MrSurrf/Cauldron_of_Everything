import { useEffect, useImperativeHandle, useRef, useState, type RefObject } from 'react'
import { Button, TextArea } from '../../../shared/ui'
import type { ArticleDraft, ArticleEntity, ArticleImage } from '../model'
import { ArticleEntityPicker } from './ArticleEntityPicker'
import { applyMarkdownCommand, escapeMarkdownLabel, type EditorSelection, type MarkdownCommand } from './markdownCommands'
import styles from '../ArticleEditor.module.css'

const commands: { command: MarkdownCommand; label: string; glyph: string }[] = [
  { command: 'heading', label: 'Заголовок', glyph: 'H' },
  { command: 'bold', label: 'Полужирный (Ctrl+B)', glyph: 'B' },
  { command: 'italic', label: 'Курсив (Ctrl+I)', glyph: 'I' },
  { command: 'strike', label: 'Зачёркнутый', glyph: 'S' },
  { command: 'underline', label: 'Подчёркнутый (Ctrl+U)', glyph: 'U' },
  { command: 'list', label: 'Маркированный список', glyph: '≡' },
  { command: 'ordered', label: 'Нумерованный список', glyph: '1.' },
  { command: 'quote', label: 'Цитата', glyph: '❞' },
  { command: 'link', label: 'Вставить ссылку', glyph: '↗' },
  { command: 'code', label: 'Код', glyph: '</>' },
]

/** Зеркало переносов синхронизирует номера с общим TextArea, не подменяя поле. */
function LineNumbers({ value, control }: { value: string; control: RefObject<HTMLTextAreaElement | null> }) {
  const [geometry, setGeometry] = useState({ width: 0, scroll: 0, padding: 16, font: '' })
  useEffect(() => {
    const textarea = control.current
    if (!textarea) return
    let frame = 0
    const measure = () => {
      const style = getComputedStyle(textarea)
      if (!textarea.clientWidth) return
      const next = {
        width: textarea.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight),
        padding: Number.parseFloat(style.paddingTop),
        font: style.font,
        scroll: textarea.scrollTop,
      }
      setGeometry(current => JSON.stringify(current) === JSON.stringify(next) ? current : next)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; measure() }) }
    const observer = new ResizeObserver(schedule)
    observer.observe(textarea)
    textarea.addEventListener('scroll', schedule, { passive: true })
    document.fonts.addEventListener('loadingdone', schedule)
    measure()
    return () => {
      observer.disconnect(); textarea.removeEventListener('scroll', schedule)
      document.fonts.removeEventListener('loadingdone', schedule); cancelAnimationFrame(frame)
    }
  }, [control])
  return <div className={styles.lineNumbers} aria-hidden="true">
    <div style={{ transform: `translateY(${geometry.padding - geometry.scroll}px)`, font: geometry.font }}>
      {value.split('\n').map((line, index) => <div key={index} className={styles.mirrorLine}
        style={{ width: geometry.width + 44, gridTemplateColumns: `44px ${geometry.width}px` }}>
        <span className={styles.lineNumber}>{index + 1}</span>
        <span className={styles.mirrorText}>{line || '\u200b'}</span>
      </div>)}
    </div>
  </div>
}

export type ArticleSourceHandle = { insertImage: (image: ArticleImage) => void }

export function ArticleSource({ draft, onChange, hidden, handleRef }: {
  draft: ArticleDraft; onChange: (patch: Partial<ArticleDraft>) => void; hidden: boolean
  handleRef: RefObject<ArticleSourceHandle | null>
}) {
  const control = useRef<HTMLTextAreaElement>(null)
  const selection = useRef<EditorSelection>({ start: 0, end: 0 })
  const focusFrame = useRef(0)

  function focusSelection(next: EditorSelection) {
    selection.current = next
    cancelAnimationFrame(focusFrame.current)
    focusFrame.current = requestAnimationFrame(() => {
      control.current?.focus({ preventScroll: true })
      control.current?.setSelectionRange(next.start, next.end)
    })
  }

  function insert(text: string, entities?: ArticleEntity[]) {
    const { start, end } = selection.current
    const prefix = draft.markdown.slice(0, start)
    const suffix = draft.markdown.slice(end)
    const before = prefix && !prefix.endsWith('\n\n') ? prefix.endsWith('\n') ? '\n' : '\n\n' : ''
    const after = suffix.startsWith('\n\n') ? '' : suffix.startsWith('\n') ? '\n' : '\n\n'
    const replacement = before + text + after
    onChange({ markdown: prefix + replacement + suffix, ...(entities ? { entities } : {}) })
    focusSelection({ start: start + replacement.length, end: start + replacement.length })
  }

  useImperativeHandle(handleRef, () => ({
    insertImage: image => insert(`![${escapeMarkdownLabel(image.alt || image.name)}](article-image:${image.id})`),
  }))
  useEffect(() => () => cancelAnimationFrame(focusFrame.current), [])

  function format(command: MarkdownCommand) {
    const result = applyMarkdownCommand(draft.markdown, selection.current, command)
    onChange({ markdown: result.value })
    focusSelection(result.selection)
  }

  return <div className={styles.source} hidden={hidden} data-article-source>
    <div className={styles.formatToolbar} role="toolbar" aria-label="Форматирование Markdown">
      <div className={styles.formatButtons}>
        {commands.map(({ command, label, glyph }) => <Button key={command} type="button" size="sm" variant="secondary"
          decoration="bare" className={styles.formatButton} aria-label={label} title={label}
          onMouseDown={event => event.preventDefault()} onClick={() => format(command)}>
          <span data-command={command} aria-hidden="true">{glyph}</span>
        </Button>)}
      </div>
      <ArticleEntityPicker onInsert={entity => insert(`[${escapeMarkdownLabel(entity.name)}](entity:${entity.id})`,
        [...draft.entities.filter(item => item.id !== entity.id), entity])} />
    </div>
    <div className={styles.sourceBody}>
      <LineNumbers value={draft.markdown} control={control} />
      <TextArea ref={control} aria-label="Текст статьи в Markdown" placeholder={'# Начните свою историю\n\nПоделитесь идеей, опытом или материалом для игры…'}
        className={styles.sourceControl} fieldClassName={styles.sourceField} rootClassName={styles.sourceFrame}
        rows={20} spellCheck value={draft.markdown} onChange={event => onChange({ markdown: event.target.value })}
        onSelect={event => { selection.current = { start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd } }}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return
          if (event.ctrlKey || event.metaKey) {
            const command = ({ b: 'bold', i: 'italic', u: 'underline' } as const)[event.key.toLowerCase() as 'b' | 'i' | 'u']
            if (command) { event.preventDefault(); format(command) }
          }
          if (event.key === 'Tab') {
            // Tab остаётся навигацией; отступы можно вводить обычными пробелами.
            selection.current = { start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd }
          }
        }} />
    </div>
  </div>
}
