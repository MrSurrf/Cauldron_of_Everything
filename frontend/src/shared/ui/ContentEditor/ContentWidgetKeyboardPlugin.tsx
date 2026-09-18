import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister } from '@lexical/utils'
import {
  $addUpdateTag,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  HISTORY_PUSH_TAG,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  type LexicalNode,
  type Point,
} from 'lexical'

import {
  $isContentDirectiveNode,
  $isContentDividerNode,
  $isContentRollNode,
} from './ContentEditorNodes'

function $isWidget(node: LexicalNode | null | undefined) {
  return (
    $isContentDirectiveNode(node) ||
    $isContentDividerNode(node) ||
    $isContentRollNode(node)
  )
}

function $pointAtBoundary(
  point: Point,
  topLevel: LexicalNode,
  backward: boolean,
) {
  let node = point.getNode()
  const offsetAtBoundary = backward
    ? point.offset === 0
    : point.offset === (
        point.type === 'text'
          ? node.getTextContentSize()
          : $isElementNode(node)
            ? node.getChildrenSize()
            : 0
      )

  if (!offsetAtBoundary) return false

  while (!node.is(topLevel)) {
    if (backward ? node.getPreviousSibling() : node.getNextSibling()) {
      return false
    }
    const parent = node.getParent()
    if (!parent) return false
    node = parent
  }

  return true
}

function $adjacentWidget(backward: boolean) {
  const selection = $getSelection()
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return null

  const point = selection.anchor
  const pointNode = point.getNode()
  let adjacent: LexicalNode | null = null

  if ($isElementNode(pointNode)) {
    adjacent = pointNode.getChildAtIndex(
      backward ? point.offset - 1 : point.offset,
    )
  } else if (
    backward
      ? point.offset === 0
      : point.offset === pointNode.getTextContentSize()
  ) {
    adjacent = backward
      ? pointNode.getPreviousSibling()
      : pointNode.getNextSibling()
  }

  if ($isWidget(adjacent)) return adjacent

  const topLevel = pointNode.getTopLevelElement()
  if (!topLevel || !$pointAtBoundary(point, topLevel, backward)) return null

  adjacent = backward
    ? topLevel.getPreviousSibling()
    : topLevel.getNextSibling()
  return $isWidget(adjacent) ? adjacent : null
}

export function ContentWidgetKeyboardPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => mergeRegister(
    editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (event) => {
        if (event.target !== editor.getRootElement()) return false
        const widget = $adjacentWidget(true)
        if (!widget) return false
        event.preventDefault()
        $addUpdateTag(HISTORY_PUSH_TAG)
        widget.remove()
        return true
      },
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(
      KEY_DELETE_COMMAND,
      (event) => {
        if (event.target !== editor.getRootElement()) return false
        const widget = $adjacentWidget(false)
        if (!widget) return false
        event.preventDefault()
        $addUpdateTag(HISTORY_PUSH_TAG)
        widget.remove()
        return true
      },
      COMMAND_PRIORITY_HIGH,
    ),
  ), [editor])

  return null
}
