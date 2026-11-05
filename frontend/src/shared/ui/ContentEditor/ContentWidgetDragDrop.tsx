import {
  useEffect,
  useState,
  type MouseEventHandler,
  type ReactNode,
  type RefObject,
} from 'react'
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $createParagraphNode,
  $getNodeByKey,
  $getRoot,
  $isParagraphNode,
  HISTORY_PUSH_TAG,
  type LexicalEditor,
  type NodeKey,
} from 'lexical'

import {
  $createContentDirectiveNode,
  $isContentDirectiveNode,
  type ContentDirectiveKind,
} from './ContentEditorNodes'
import { parseContentSource } from './contentCodec'
import styles from './ContentWidgetSelection.module.css'

const widgetDragType = 'cauldron-content-widget'
const editorRegistry = new Map<string, LexicalEditor>()

export type ContentWidgetDragDescriptor = {
  editorId?: string
  kind: ContentDirectiveKind
  label: string
  nodeKey?: NodeKey
  source: string
  sourceIndex?: number
}

type WidgetDragData = {
  dragType: typeof widgetDragType
  editorId: string
  kind: ContentDirectiveKind
  nodeKey?: NodeKey
  source: string
  sourceIndex?: number
}

function readDragData(data: Record<string, unknown>): WidgetDragData | null {
  if (
    data.dragType !== widgetDragType ||
    typeof data.editorId !== 'string' ||
    typeof data.source !== 'string' ||
    (data.kind !== 'resource' && data.kind !== 'collapsible' && data.kind !== 'item') ||
    (data.nodeKey !== undefined && typeof data.nodeKey !== 'string') ||
    (data.sourceIndex !== undefined && typeof data.sourceIndex !== 'number')
  ) {
    return null
  }

  return data as WidgetDragData
}

function findSourceNode(data: WidgetDragData) {
  const keyedNode = data.nodeKey
    ? $getNodeByKey(data.nodeKey)
    : null

  if (
    $isContentDirectiveNode(keyedNode) &&
    keyedNode.getKind() === data.kind &&
    keyedNode.getSource() === data.source
  ) {
    return keyedNode
  }

  const indexedNode = data.sourceIndex === undefined
    ? null
    : $getRoot().getChildAtIndex(data.sourceIndex)

  if (
    $isContentDirectiveNode(indexedNode) &&
    indexedNode.getKind() === data.kind &&
    indexedNode.getSource() === data.source
  ) {
    return indexedNode
  }

  const matches = $getRoot().getChildren().filter((node) =>
    $isContentDirectiveNode(node) &&
    node.getKind() === data.kind &&
    node.getSource() === data.source,
  )

  return matches.length === 1 && $isContentDirectiveNode(matches[0])
    ? matches[0]
    : null
}

function insertAtEnd(editor: LexicalEditor, data: WidgetDragData) {
  let insertedKey: NodeKey | null = null

  editor.update(() => {
    const block = parseContentSource(data.source)[0]
    if (!block || block.kind !== data.kind || block.rawSource !== data.source) return

    const node = $createContentDirectiveNode(block.kind, block.title, block.rawSource)
    const last = $getRoot().getLastChild()

    if (
      $isParagraphNode(last) &&
      last.getChildrenSize() === 0
    ) {
      last.insertBefore(node)
    } else {
      $getRoot().append(node)
    }
    insertedKey = node.getKey()
  }, { tag: HISTORY_PUSH_TAG })

  return insertedKey
}

function removeSource(editor: LexicalEditor, data: WidgetDragData) {
  let removed = false

  editor.update(() => {
    const node = findSourceNode(data)
    if (!node) return

    node.remove()
    if ($getRoot().getChildrenSize() === 0) {
      $getRoot().append($createParagraphNode())
    }
    removed = true
  }, { tag: HISTORY_PUSH_TAG })

  return removed
}

function moveInsideEditor(editor: LexicalEditor, data: WidgetDragData) {
  editor.update(() => {
    const node = findSourceNode(data)
    if (!node) return

    const last = $getRoot().getLastChild()
    if (last === node) return

    if ($isParagraphNode(last) && last.getChildrenSize() === 0) {
      last.insertBefore(node)
    } else {
      $getRoot().append(node)
    }
  }, { tag: HISTORY_PUSH_TAG })
}

function moveBetweenEditors(
  targetEditor: LexicalEditor,
  data: WidgetDragData,
) {
  const sourceEditor = editorRegistry.get(data.editorId)
  if (!sourceEditor) return

  if (sourceEditor === targetEditor) {
    moveInsideEditor(targetEditor, data)
    return
  }

  const insertedKey = insertAtEnd(targetEditor, data)
  if (!insertedKey) return

  if (removeSource(sourceEditor, data)) return

  targetEditor.update(() => {
    $getNodeByKey(insertedKey)?.remove()
  }, { tag: HISTORY_PUSH_TAG })
}

function pointsToEditor(
  root: HTMLElement,
  input: { clientX: number; clientY: number },
) {
  const nestedEditorAtPoint = Array.from(
    root.querySelectorAll<HTMLElement>('[data-content-editor-id]'),
  ).some((editor) => {
    const rect = editor.getBoundingClientRect()
    return input.clientX >= rect.left && input.clientX <= rect.right &&
      input.clientY >= rect.top && input.clientY <= rect.bottom
  })

  return !nestedEditorAtPoint
}

export function ContentWidgetDropPlugin({
  allowSections,
  disabled,
  editorId,
  rootRef,
}: {
  allowSections: boolean
  disabled: boolean
  editorId: string
  rootRef: RefObject<HTMLDivElement | null>
}) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    editorRegistry.set(editorId, editor)
    return () => {
      if (editorRegistry.get(editorId) === editor) {
        editorRegistry.delete(editorId)
      }
    }
  }, [editor, editorId])

  useEffect(() => {
    const root = rootRef.current
    if (!root || disabled) return
    const dropRoot = root

    function accepts(data: WidgetDragData | null) {
      return Boolean(data && (allowSections || data.kind !== 'collapsible'))
    }

    function clearIndicator() {
      delete dropRoot.dataset.contentDropTarget
    }

    return dropTargetForElements({
      element: dropRoot,
      canDrop: ({ input, source }) =>
        accepts(readDragData(source.data)) &&
        pointsToEditor(dropRoot, input),
      getData: () => ({
        contentEditorDropTarget: true,
        editorId,
      }),
      getDropEffect: () => 'move',
      onDragEnter: () => {
        dropRoot.dataset.contentDropTarget = 'true'
      },
      onDragLeave: clearIndicator,
      onDrop: ({ location, source }) => {
        clearIndicator()
        if (location.current.dropTargets[0]?.element !== dropRoot) return

        const data = readDragData(source.data)
        if (!accepts(data)) return
        moveBetweenEditors(editor, data!)
      },
    })
  }, [allowSections, disabled, editor, editorId, rootRef])

  return null
}

export function ContentWidgetDraggable({
  children,
  descriptor,
  disabled,
  inline = false,
  onMouseDown,
  overlay,
  preview = false,
  selected = false,
}: {
  children: ReactNode
  descriptor?: ContentWidgetDragDescriptor
  disabled: boolean
  inline?: boolean
  onMouseDown?: MouseEventHandler<HTMLElement>
  overlay?: ReactNode
  preview?: boolean
  selected?: boolean
}) {
  const [element, setElement] = useState<HTMLElement | null>(null)
  const [handle, setHandle] = useState<HTMLButtonElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const sourceEditorId = descriptor?.editorId
  const sourceKind = descriptor?.kind
  const sourceNodeKey = descriptor?.nodeKey
  const source = descriptor?.source
  const sourceIndex = descriptor?.sourceIndex

  useEffect(() => {
    if (!sourceEditorId || !sourceKind || source === undefined || disabled || !element || !handle) return

    const data: WidgetDragData = {
      dragType: widgetDragType,
      editorId: sourceEditorId,
      kind: sourceKind,
      nodeKey: sourceNodeKey,
      source,
      sourceIndex,
    }

    return draggable({
      element,
      dragHandle: handle,
      getInitialData: () => data,
      onDragStart: () => setDragging(true),
      onDrop: () => setDragging(false),
    })
  }, [
    disabled,
    element,
    handle,
    source,
    sourceEditorId,
    sourceIndex,
    sourceKind,
    sourceNodeKey,
  ])

  const Wrapper = inline ? 'span' : 'div'
  const DragLayout = inline ? 'span' : 'div'
  const DragContent = inline ? 'span' : 'div'

  return (
    <Wrapper
      ref={setElement}
      className={styles.widget}
      data-content-preview-widget={preview || undefined}
      data-content-widget={!preview || undefined}
      data-drag-disabled={disabled || undefined}
      data-dragging={dragging || undefined}
      data-inline={inline || undefined}
      data-selected={selected || undefined}
      contentEditable={preview ? undefined : false}
      onMouseDown={onMouseDown}
    >
      {descriptor && !disabled ? (
        <DragLayout className={styles.dragLayout}>
          <button
            ref={setHandle}
            type="button"
            className={styles.dragHandle}
            data-widget-drag-handle
            aria-label={`Перетащить ${descriptor.label}`}
            title={`Перетащить ${descriptor.label}`}
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span aria-hidden="true" />
          </button>
          <DragContent className={styles.dragContent}>{children}</DragContent>
        </DragLayout>
      ) : children}
      {overlay}
    </Wrapper>
  )
}

export function ContentPreviewWidgetDrag({
  children,
  descriptor,
  disabled,
}: {
  children: ReactNode
  descriptor: ContentWidgetDragDescriptor
  disabled: boolean
}) {
  return (
    <ContentWidgetDraggable
      descriptor={descriptor}
      disabled={disabled}
      preview
    >
      {children}
    </ContentWidgetDraggable>
  )
}
