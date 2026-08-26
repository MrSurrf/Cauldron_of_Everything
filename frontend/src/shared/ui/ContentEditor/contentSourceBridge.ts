import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isLineBreakNode,
  $isParagraphNode,
  $isTextNode,
  type ElementNode,
  type LexicalNode,
  type TextFormatType,
} from 'lexical'
import {
  $createLinkNode,
  $isLinkNode,
} from '@lexical/link'
import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
} from '@lexical/list'
import {
  $createHeadingNode,
  $isHeadingNode,
  type HeadingTagType,
} from '@lexical/rich-text'

import {
  parseContentInline,
  parseContentSource,
  safeContentLinkTarget,
  type ContentBlock,
  type ContentInline,
} from './contentCodec'
import {
  $createContentDirectiveNode,
  $createContentDividerNode,
  $createContentRollNode,
  $isContentDirectiveNode,
  $isContentDividerNode,
  $isContentRollNode,
} from './ContentEditorNodes'

function appendInlineNodes(
  parent: ElementNode,
  sourceNodes: readonly ContentInline[],
  formats: readonly TextFormatType[] = [],
) {
  sourceNodes.forEach((sourceNode) => {
    if (sourceNode.kind === 'text') {
      const textNode = $createTextNode(sourceNode.text)
      formats.forEach((format) => textNode.toggleFormat(format))
      parent.append(textNode)
      return
    }

    if (sourceNode.kind === 'roll') {
      parent.append($createContentRollNode(sourceNode.expression))
      return
    }

    if (sourceNode.kind === 'link') {
      const target = safeContentLinkTarget(sourceNode.target)

      if (!target) {
        appendInlineNodes(parent, sourceNode.children, formats)
        return
      }

      const link = $createLinkNode(target, {
        rel: /^https?:/i.test(target) ? 'noreferrer' : null,
        target: /^https?:/i.test(target) ? '_blank' : null,
      })
      appendInlineNodes(link, sourceNode.children, formats)
      parent.append(link)
      return
    }

    const nextFormat: TextFormatType =
      sourceNode.kind === 'bold'
        ? 'bold'
        : sourceNode.kind === 'italic'
          ? 'italic'
          : 'underline'

    appendInlineNodes(
      parent,
      sourceNode.children,
      formats.includes(nextFormat)
        ? formats
        : [...formats, nextFormat],
    )
  })
}

function appendInlineSource(
  parent: ElementNode,
  source: string,
) {
  appendInlineNodes(parent, parseContentInline(source))
}

function importBlock(block: ContentBlock) {
  if (block.kind === 'paragraph') {
    const paragraph = $createParagraphNode()

    block.lines.forEach((line, index) => {
      if (index > 0) paragraph.append($createLineBreakNode())
      appendInlineSource(paragraph, line)
    })

    return paragraph
  }

  if (block.kind === 'heading') {
    const level = Math.max(1, Math.min(6, block.level))
    const heading = $createHeadingNode(
      `h${level}` as HeadingTagType,
    )
    appendInlineSource(heading, block.text)
    return heading
  }

  if (block.kind === 'divider') {
    return $createContentDividerNode()
  }

  if (block.kind === 'resource' || block.kind === 'collapsible') {
    return $createContentDirectiveNode(
      block.kind,
      block.title,
      block.rawSource,
    )
  }

  const list = $createListNode(
    block.listKind === 'ordered'
      ? 'number'
      : block.listKind === 'check'
        ? 'check'
        : 'bullet',
  )

  block.items.forEach((item) => {
    const listItem = $createListItemNode(
      block.listKind === 'check'
        ? Boolean(item.checked)
        : undefined,
    )
    appendInlineSource(listItem, item.text)
    list.append(listItem)
  })

  return list
}

export function $importContentSource(source: string) {
  const root = $getRoot()
  const blocks = parseContentSource(source)
  root.clear()

  if (blocks.length === 0) {
    root.append($createParagraphNode())
    return
  }

  blocks.forEach((block) => root.append(importBlock(block)))
}

function exportTextNode(node: LexicalNode) {
  if (!$isTextNode(node)) return ''

  let source = node.getTextContent()

  if (node.hasFormat('underline')) {
    source = `<u>${source}</u>`
  }
  if (node.hasFormat('italic')) {
    source = `<em>${source}</em>`
  }
  if (node.hasFormat('bold')) {
    source = `<strong>${source}</strong>`
  }

  return source
}

function exportInlineNode(node: LexicalNode): string {
  if ($isTextNode(node)) return exportTextNode(node)
  if ($isLineBreakNode(node)) return '\n'
  if ($isContentRollNode(node)) {
    return `[[roll:${node.getExpression()}]]`
  }
  if ($isLinkNode(node)) {
    return `[${exportInlineChildren(node.getChildren())}](${node.getURL()})`
  }

  if ('getChildren' in node && typeof node.getChildren === 'function') {
    return exportInlineChildren(node.getChildren())
  }

  return node.getTextContent()
}

function exportInlineChildren(nodes: readonly LexicalNode[]) {
  return nodes.map(exportInlineNode).join('')
}

function exportListItem(node: LexicalNode, index: number, listType: string) {
  if (!$isListItemNode(node)) return ''

  const content = exportInlineChildren(
    node.getChildren().filter((child) => !$isListNode(child)),
  )

  if (listType === 'number') return `${index + 1}. ${content}`
  if (listType === 'check') {
    return `- [${node.getChecked() ? 'x' : ' '}] ${content}`
  }
  return `- ${content}`
}

function exportBlock(node: LexicalNode): string {
  if ($isContentDirectiveNode(node)) return node.getSource()
  if ($isContentDividerNode(node)) return '---'

  if ($isHeadingNode(node)) {
    const level = Number(node.getTag().slice(1)) || 1
    return `${'#'.repeat(level)} ${exportInlineChildren(node.getChildren())}`
  }

  if ($isListNode(node)) {
    const listType = node.getListType()
    return node
      .getChildren()
      .map((child, index) => exportListItem(child, index, listType))
      .filter(Boolean)
      .join('\n')
  }

  if ($isParagraphNode(node)) {
    return exportInlineChildren(node.getChildren())
  }

  return node.getTextContent()
}

export function $exportContentSource() {
  return $getRoot()
    .getChildren()
    .map(exportBlock)
    .filter((block, index, blocks) => {
      if (block.length > 0) return true
      return index === blocks.length - 1 && blocks.length === 1
    })
    .join('\n\n')
}
