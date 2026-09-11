import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
} from 'react'
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'

import { IconButton } from '../IconButton'
import { ScrollArea } from '../ScrollArea'
import { Tooltip } from '../Tooltip'
import { ContentEditorFloatingToolbar } from './ContentEditorFloatingToolbar'
import { ContentPreview } from './ContentPreview'
import { ContentWidgetContext } from './ContentWidgetContext'
import {
  ContentDirectiveNode,
  ContentDividerNode,
  ContentRollNode,
} from './ContentEditorNodes'
import {
  $exportContentSource,
  $importContentSource,
} from './contentSourceBridge'
import type { ContentEditorProps } from './ContentEditor.types'
import styles from './ContentEditor.module.css'

const EXTERNAL_VALUE_TAG = 'content-editor-external-value'
const DEFAULT_MIN_TEXT_SCALE = 0.75
const DEFAULT_MAX_TEXT_SCALE = 1.5
const DEFAULT_TEXT_SCALE_STEP = 0.125

type ContentEditorStyle = CSSProperties & {
  '--content-editor-rows': string
  '--content-editor-scale': string
}

const theme = {
  heading: {
    h1: styles.heading,
    h2: styles.heading,
    h3: styles.heading,
    h4: styles.heading,
    h5: styles.heading,
    h6: styles.heading,
  },
  link: styles.link,
  list: {
    checklist: styles.checkList,
    listitem: styles.listItem,
    listitemChecked: styles.listItemChecked,
    listitemUnchecked: styles.listItemUnchecked,
    nested: {
      listitem: styles.nestedListItem,
    },
    ol: styles.orderedList,
    ul: styles.unorderedList,
  },
  paragraph: styles.paragraph,
  quote: styles.quote,
  text: {
    bold: styles.bold,
    italic: styles.italic,
    underline: styles.underline,
  },
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function normalizedNumber(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? Number(value) : fallback
}

function isAllowedUrl(url: string) {
  const target = url.trim()
  return (
    /^(?:https?:|mailto:)/i.test(target) ||
    (target.startsWith('/') && !target.startsWith('//')) ||
    target.startsWith('#')
  )
}

function ControlledValuePlugin({
  value,
  onValueChange,
}: Pick<ContentEditorProps, 'value' | 'onValueChange'>) {
  const [editor] = useLexicalComposerContext()
  const lastValueRef = useRef(value)

  useEffect(() => {
    if (value === lastValueRef.current) return

    lastValueRef.current = value
    editor.update(
      () => $importContentSource(value),
      { tag: EXTERNAL_VALUE_TAG },
    )
  }, [editor, value])

  const handleChange = useCallback(
    (
      editorState: Parameters<
        NonNullable<
          React.ComponentProps<typeof OnChangePlugin>['onChange']
        >
      >[0],
      _editor: Parameters<
        NonNullable<
          React.ComponentProps<typeof OnChangePlugin>['onChange']
        >
      >[1],
      tags: Set<string>,
    ) => {
      if (tags.has(EXTERNAL_VALUE_TAG)) return

      const nextValue = editorState.read(() => $exportContentSource())
      if (nextValue === lastValueRef.current) return

      lastValueRef.current = nextValue
      onValueChange(nextValue)
    },
    [onValueChange],
  )

  return (
    <OnChangePlugin
      ignoreHistoryMergeTagChange={false}
      ignoreSelectionChange={true}
      onChange={handleChange}
    />
  )
}

function EditableStatePlugin({ editable }: { editable: boolean }) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    editor.setEditable(editable)
  }, [editable, editor])

  return null
}

export function ContentEditor({
  accessibleLabel,
  autoFocus = false,
  className,
  defaultTextScale = 1,
  disabled = false,
  evaluateResourceMaximum,
  fill = false,
  maxTextScale = DEFAULT_MAX_TEXT_SCALE,
  minTextScale = DEFAULT_MIN_TEXT_SCALE,
  onTextScaleChange,
  onStructuredResourceChange,
  onValueChange,
  placeholder = 'Введите текст...',
  readOnly = false,
  renderPreview = false,
  rootClassName,
  rows = 5,
  showStructureActions = false,
  showTextScaleControls = true,
  style,
  textScale,
  textScaleStep = DEFAULT_TEXT_SCALE_STEP,
  value,
}: ContentEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const editorId = useId()
  const [editing, setEditing] = useState(autoFocus)
  const viewing = renderPreview && !editing
  const lowerScale = Math.min(
    normalizedNumber(minTextScale, DEFAULT_MIN_TEXT_SCALE),
    normalizedNumber(maxTextScale, DEFAULT_MAX_TEXT_SCALE),
  )
  const upperScale = Math.max(
    normalizedNumber(minTextScale, DEFAULT_MIN_TEXT_SCALE),
    normalizedNumber(maxTextScale, DEFAULT_MAX_TEXT_SCALE),
  )
  const [internalTextScale, setInternalTextScale] = useState(() =>
    clamp(
      normalizedNumber(defaultTextScale, 1),
      lowerScale,
      upperScale,
    ),
  )
  const resolvedTextScale = clamp(
    normalizedNumber(textScale, internalTextScale),
    lowerScale,
    upperScale,
  )
  const scaleStep = Math.max(
    0.01,
    Math.abs(normalizedNumber(textScaleStep, DEFAULT_TEXT_SCALE_STEP)),
  )
  const editable = !disabled && !readOnly && !viewing
  const rootClass = [styles.root, rootClassName]
    .filter(Boolean)
    .join(' ')
  const editableClass = [styles.contentEditable, className]
    .filter(Boolean)
    .join(' ')
  const editorStyle: ContentEditorStyle = {
    ...style,
    '--content-editor-rows': String(Math.max(2, Math.min(rows, 16))),
    '--content-editor-scale': `${resolvedTextScale}em`,
  }
  const initialConfig = {
    editable,
    editorState: () => $importContentSource(value),
    namespace: 'CauldronContentEditor',
    nodes: [
      HeadingNode,
      QuoteNode,
      LinkNode,
      ListNode,
      ListItemNode,
      ContentDirectiveNode,
      ContentDividerNode,
      ContentRollNode,
    ],
    onError(error: Error) {
      console.error('ContentEditor recovered from an update error.', error)
    },
    theme,
  }

  function changeTextScale(direction: -1 | 1) {
    const nextScale = clamp(
      Math.round(
        (resolvedTextScale + direction * scaleStep) * 1000,
      ) / 1000,
      lowerScale,
      upperScale,
    )

    if (textScale === undefined) {
      setInternalTextScale(nextScale)
    }

    onTextScaleChange?.(nextScale)
  }

  function finishEditing(event: FocusEvent<HTMLDivElement>) {
    if (!renderPreview) return
    function finishUnlessOwned(target: EventTarget | null) {
      if (target instanceof Node && rootRef.current?.contains(target)) return
      if (target instanceof Element) {
        const owner = target.closest('[data-content-editor-owner]')
          ?? (target.matches('[role="dialog"]') ? target.querySelector('[data-content-editor-owner]') : null)
        if (owner?.getAttribute('data-content-editor-owner') === editorId) return
      }
      setEditing(false)
    }
    if (event.relatedTarget) {
      finishUnlessOwned(event.relatedTarget)
    } else {
      // showModal сначала делает лист inert, затем переводит фокус в окно.
      queueMicrotask(() => {
        if (rootRef.current) finishUnlessOwned(rootRef.current.ownerDocument.activeElement)
      })
    }
  }

  return (
    <div
      ref={rootRef}
      className={rootClass}
      data-content-editor
      data-viewing={viewing}
      data-disabled={disabled || undefined}
      data-fill={fill || undefined}
      data-read-only={readOnly || undefined}
      style={editorStyle}
      onBlurCapture={finishEditing}
    >
      <LexicalComposer initialConfig={initialConfig}>
        <ContentWidgetContext value={{ disabled, readOnly, evaluateResourceMaximum, onStructuredResourceChange, editorId }}>
        <div
          className={styles.frame}
          data-content-editor-frame
          aria-label={viewing ? accessibleLabel : undefined}
          role={viewing ? 'region' : undefined}
          tabIndex={viewing && !disabled ? 0 : undefined}
          title={viewing && !readOnly && !disabled
            ? 'Нажмите, чтобы редактировать'
            : undefined}
          onClick={(event) => {
            if (!viewing || disabled || readOnly) return
            if (
              event.target instanceof Element &&
              event.target.closest('button, a, summary, input')
            ) return
            setEditing(true)
          }}
          onKeyDown={(event) => {
            if (
              !viewing || disabled || readOnly ||
              event.target !== event.currentTarget
            ) return
            if (event.key === 'Enter' || event.key === 'F2') {
              event.preventDefault()
              setEditing(true)
            }
          }}
        >
          <ScrollArea
            contentClassName={styles.scrollContent}
            rootClassName={styles.scrollArea}
            verticalScrollBarLabel={`Прокрутка поля «${accessibleLabel}»`}
          >
            {viewing ? (
              <div className={editableClass}>
                <ContentPreview
                  disabled={disabled}
                  editorId={editorId}
                  evaluateResourceMaximum={evaluateResourceMaximum}
                  readOnly={readOnly}
                  placeholder={placeholder}
                  value={value}
                  onStructuredResourceChange={onStructuredResourceChange}
                  onValueChange={onValueChange}
                />
              </div>
            ) : (
              <RichTextPlugin
                contentEditable={(
                  <ContentEditable
                    aria-label={accessibleLabel}
                    aria-placeholder={placeholder}
                    className={editableClass}
                    placeholder={(
                      <div className={styles.placeholder}>
                        {placeholder}
                      </div>
                    )}
                    spellCheck={true}
                  />
                )}
                ErrorBoundary={LexicalErrorBoundary}
              />
            )}
          </ScrollArea>

          {showTextScaleControls && (
            <div
              className={styles.scaleControls}
              role="group"
              aria-label={`Размер текста: ${accessibleLabel}`}
              onMouseDown={(event) => event.preventDefault()}
            >
              <Tooltip content="Уменьшить текст">
                <IconButton
                  aria-label={`Уменьшить текст: ${accessibleLabel}`}
                  className={styles.scaleButton}
                  decoration="minimal"
                  disabled={disabled || resolvedTextScale <= lowerScale}
                  icon={<span className={styles.scaleGlyph}>−</span>}
                  size="sm"
                  variant="secondary"
                  onClick={() => changeTextScale(-1)}
                />
              </Tooltip>

              <output className={styles.srOnly} aria-live="polite">
                {Math.round(resolvedTextScale * 100)}%
              </output>

              <Tooltip content="Увеличить текст">
                <IconButton
                  aria-label={`Увеличить текст: ${accessibleLabel}`}
                  className={styles.scaleButton}
                  decoration="minimal"
                  disabled={disabled || resolvedTextScale >= upperScale}
                  icon={<span className={styles.scaleGlyph}>+</span>}
                  size="sm"
                  variant="secondary"
                  onClick={() => changeTextScale(1)}
                />
              </Tooltip>
            </div>
          )}
        </div>

        <HistoryPlugin />
        <ListPlugin />
        <CheckListPlugin />
        <LinkPlugin validateUrl={isAllowedUrl} />
        <ControlledValuePlugin
          value={value}
          onValueChange={onValueChange}
        />
        <EditableStatePlugin editable={editable} />
        <ContentEditorFloatingToolbar
          editorId={editorId}
          disabled={!editable}
          showStructureActions={showStructureActions}
        />
        {!viewing && (autoFocus || renderPreview) && <AutoFocusPlugin />}
        </ContentWidgetContext>
      </LexicalComposer>
    </div>
  )
}
