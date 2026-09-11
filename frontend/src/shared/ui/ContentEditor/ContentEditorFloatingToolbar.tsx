import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list'
import { TOGGLE_LINK_COMMAND } from '@lexical/link'
import { $insertNodeToNearestRoot } from '@lexical/utils'
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from 'lexical'

import { Button } from '../Button'
import {
  TextFormattingToolbar,
  type TextFormatAction,
} from '../internal/content/TextFormattingToolbar'
import {
  $createContentDirectiveNode,
  $createContentRollNode,
} from './ContentEditorNodes'
import styles from './ContentEditor.module.css'
import { emptyResource, resourceToSource } from './resourceContent'

type FloatingRect = {
  bottom: number
  height: number
  left: number
  right: number
  top: number
  width: number
}

type FloatingState = {
  kind: 'format' | 'insert'
  rect: FloatingRect
}

type OverlayPosition = {
  left: number
  placement: 'above' | 'below'
  top: number
}

type ContentEditorFloatingToolbarProps = {
  disabled?: boolean
  editorId?: string
  showStructureActions: boolean
}

const VIEWPORT_GAP = 8
const OVERLAY_GAP = 6

function toFloatingRect(rect: DOMRect): FloatingRect {
  return {
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width,
  }
}

function usefulRangeRect(range: Range) {
  const boundingRect = range.getBoundingClientRect()

  if (boundingRect.width > 0 || boundingRect.height > 0) {
    return boundingRect
  }

  const clientRects = range.getClientRects()
  return clientRects.length > 0
    ? clientRects[clientRects.length - 1]
    : boundingRect
}

function clamp(value: number, minimum: number, maximum: number) {
  if (maximum < minimum) return minimum
  return Math.min(maximum, Math.max(minimum, value))
}

function validLinkTarget(value: string) {
  const target = value.trim()

  if (
    /^(?:https?:|mailto:)/i.test(target) ||
    (target.startsWith('/') && !target.startsWith('//')) ||
    target.startsWith('#')
  ) {
    return target
  }

  return null
}

export function ContentEditorFloatingToolbar({
  editorId,
  disabled = false,
  showStructureActions,
}: ContentEditorFloatingToolbarProps) {
  const [editor] = useLexicalComposerContext()
  const overlayRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const [floating, setFloating] = useState<FloatingState | null>(null)
  const [position, setPosition] = useState<OverlayPosition | null>(null)

  const refreshFloatingState = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = null
      const root = editor.getRootElement()
      const nativeSelection = root?.ownerDocument.getSelection()

      if (
        !root ||
        !nativeSelection ||
        nativeSelection.rangeCount === 0 ||
        !nativeSelection.anchorNode ||
        !root.contains(nativeSelection.anchorNode) ||
        !root.contains(root.ownerDocument.activeElement)
      ) {
        setFloating(null)
        return
      }

      let kind: FloatingState['kind'] | null = null
      let emptyBlockKey: string | null = null

      editor.getEditorState().read(() => {
        const selection = $getSelection()

        if (!$isRangeSelection(selection)) return

        if (!selection.isCollapsed()) {
          kind = 'format'
          return
        }

        if (!showStructureActions) return

        const anchorNode = selection.anchor.getNode()
        const topLevel = anchorNode.getTopLevelElement()
        const rootEmpty = $getRoot().getTextContent().trim().length === 0

        if (
          rootEmpty ||
          (topLevel && topLevel.getTextContent().trim().length === 0)
        ) {
          kind = 'insert'
          emptyBlockKey = topLevel?.getKey() ?? null
        }
      })

      if (!kind) {
        setFloating(null)
        return
      }

      const range = nativeSelection.getRangeAt(0)
      let rect = usefulRangeRect(range)

      if (
        kind === 'insert' &&
        rect.width === 0 &&
        rect.height === 0
      ) {
        const blockElement = emptyBlockKey
          ? editor.getElementByKey(emptyBlockKey)
          : null
        const fallbackRect = (blockElement ?? root).getBoundingClientRect()
        rect = new DOMRect(
          fallbackRect.left + 4,
          fallbackRect.top + 4,
          1,
          Math.max(16, fallbackRect.height),
        )
      }

      setFloating({ kind, rect: toFloatingRect(rect) })
    })
  }, [editor, showStructureActions])

  useEffect(() => {
    const unregisterUpdate = editor.registerUpdateListener(() => {
      refreshFloatingState()
    })
    const unregisterSelection = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        refreshFloatingState()
        return false
      },
      COMMAND_PRIORITY_LOW,
    )
    const view = editor.getRootElement()?.ownerDocument.defaultView ?? window

    view.addEventListener('resize', refreshFloatingState)
    view.addEventListener('scroll', refreshFloatingState, true)

    return () => {
      unregisterUpdate()
      unregisterSelection()
      view.removeEventListener('resize', refreshFloatingState)
      view.removeEventListener('scroll', refreshFloatingState, true)

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [editor, refreshFloatingState])

  useLayoutEffect(() => {
    const overlay = overlayRef.current

    if (!floating || !overlay) {
      setPosition(null)
      return
    }

    const view = overlay.ownerDocument.defaultView
    if (!view) return

    const root = editor.getRootElement()
    const editorRect = root?.getBoundingClientRect()
    const insert = floating.kind === 'insert' && editorRect
    const textInset = root ? parseFloat(view.getComputedStyle(root).paddingLeft) : 0
    const minimumLeft = insert
      ? Math.max(VIEWPORT_GAP, editorRect.left + textInset)
      : VIEWPORT_GAP
    const maximumRight = insert
      ? Math.min(view.innerWidth - VIEWPORT_GAP, editorRect.right - textInset)
      : view.innerWidth - VIEWPORT_GAP
    overlay.style.maxWidth = `${Math.max(0, maximumRight - minimumLeft)}px`
    const width = overlay.offsetWidth
    const height = overlay.offsetHeight
    const preferredLeft =
      insert ? floating.rect.left : floating.rect.left + floating.rect.width / 2 - width / 2
    const left = clamp(
      preferredLeft,
      minimumLeft,
      maximumRight - width,
    )
    const frameRect = root?.closest('[data-content-editor-frame]')?.getBoundingClientRect()
    const minimumTop = insert && frameRect ? Math.max(VIEWPORT_GAP, frameRect.top + 1) : VIEWPORT_GAP
    const maximumBottom = insert && frameRect ? Math.min(view.innerHeight - VIEWPORT_GAP, frameRect.bottom - 1) : view.innerHeight - VIEWPORT_GAP
    const fitsAbove =
      floating.rect.top - height - OVERLAY_GAP >= minimumTop
    const placement =
      floating.kind === 'format' && fitsAbove
        ? 'above'
        : floating.kind === 'insert' &&
            floating.rect.bottom + height + OVERLAY_GAP <=
              maximumBottom
          ? 'below'
          : 'above'
    const preferredTop =
      placement === 'above'
        ? floating.rect.top - OVERLAY_GAP
        : floating.rect.bottom + OVERLAY_GAP

    const top = insert
      ? clamp(preferredTop, minimumTop + (placement === 'above' ? height : 0), maximumBottom - (placement === 'below' ? height : 0))
      : preferredTop
    setPosition({ left, placement, top })
  }, [editor, floating])

  function preserveSelection(event: MouseEvent<HTMLDivElement>) {
    event.preventDefault()
  }

  function formatSelection(action: TextFormatAction) {
    if (disabled) return

    if (action === 'bold' || action === 'italic' || action === 'underline') {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, action)
      return
    }

    if (action === 'ordered-list') {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
      return
    }

    if (action === 'unordered-list') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
      return
    }

    if (action === 'check-list') {
      editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined)
      return
    }

    if (action === 'link') {
      const proposed = window.prompt('Адрес ссылки', 'https://')
      if (proposed === null) return

      const target = validLinkTarget(proposed)
      if (!target) return

      editor.dispatchCommand(TOGGLE_LINK_COMMAND, target)
      return
    }

    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return

      const expression = selection.getTextContent().trim() || '1d20'
      selection.insertNodes([$createContentRollNode(expression)])
    })
  }

  function insertBlock(
    kind: 'resource' | 'collapsible',
  ) {
    if (disabled) return

    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return

      const anchorNode = selection.anchor.getNode()
      const emptyTopLevel = anchorNode.getTopLevelElement()
      const node = $createContentDirectiveNode(
        kind,
        kind === 'resource' ? '' : 'Новая вкладка',
        kind === 'resource'
          ? resourceToSource(emptyResource)
          : [
              ':::collapsible[Новая вкладка]',
              'Содержимое вкладки',
              ':::',
            ].join('\n'),
      )

      if (
        emptyTopLevel &&
        emptyTopLevel.getTextContent().trim().length === 0
      ) {
        emptyTopLevel.replace(node)
      } else {
        $insertNodeToNearestRoot(node)
      }

      const paragraph = $createParagraphNode()
      node.insertAfter(paragraph)
      paragraph.select()
    })
  }

  if (!floating || disabled || typeof document === 'undefined') {
    return null
  }

  const overlayStyle: CSSProperties | undefined = position
    ? {
        left: position.left,
        top: position.top,
        transform:
          position.placement === 'above'
            ? 'translateY(-100%)'
            : 'none',
      }
    : { visibility: 'hidden' }

  return createPortal(
    <div
      ref={overlayRef}
      className={styles.floatingOverlay}
      data-content-editor-owner={editorId}
      data-kind={floating.kind}
      style={overlayStyle}
      onMouseDown={preserveSelection}
    >
      {floating.kind === 'format' ? (
        <TextFormattingToolbar
          buttonClassName={styles.toolbarButton}
          className={styles.selectionToolbar}
          disabled={disabled}
          onAction={formatSelection}
        />
      ) : (
        <div
          className={styles.insertToolbar}
          data-content-editor-toolbar="insert"
          role="toolbar"
          aria-label="Вставка содержимого"
        >
          <Button
            decoration="minimal"
            size="sm"
            variant="secondary"
            onClick={() => insertBlock('resource')}
          >
            Ресурс
          </Button>
          <Button
            decoration="minimal"
            size="sm"
            variant="secondary"
            onClick={() => insertBlock('collapsible')}
          >
            Вкладка
          </Button>
          <Button
            decoration="minimal"
            size="sm"
            variant="secondary"
            disabled={true}
            title="Виджет предмета появится на следующем этапе"
          >
            Предмет
          </Button>
        </div>
      )}
    </div>,
    document.body,
  )
}
