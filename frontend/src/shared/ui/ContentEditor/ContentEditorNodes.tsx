import type { ReactElement } from 'react'
import {
  $applyNodeReplacement,
  DecoratorNode,
  type DOMExportOutput,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
}
  from 'lexical'

import styles from './ContentEditor.module.css'
import { ContentWidgetSelection } from './ContentWidgetSelection'
import { ContentResourceNode } from './ContentResourceNode'

export type ContentDirectiveKind =
  | 'resource'
  | 'collapsible'

export type SerializedContentDirectiveNode = Spread<
  {
    kind: ContentDirectiveKind
    source: string
    title: string
    type: 'content-directive'
    version: 1
  },
  SerializedLexicalNode
>

export class ContentDirectiveNode extends DecoratorNode<ReactElement> {
  __kind: ContentDirectiveKind
  __source: string
  __title: string

  static getType() {
    return 'content-directive'
  }

  static clone(node: ContentDirectiveNode) {
    return new ContentDirectiveNode(
      node.__kind,
      node.__title,
      node.__source,
      node.__key,
    )
  }

  static importJSON(
    serializedNode: SerializedContentDirectiveNode,
  ) {
    return $createContentDirectiveNode(
      serializedNode.kind,
      serializedNode.title,
      serializedNode.source,
    )
  }

  constructor(
    kind: ContentDirectiveKind,
    title: string,
    source: string,
    key?: NodeKey,
  ) {
    super(key)
    this.__kind = kind
    this.__title = title
    this.__source = source
  }

  createDOM() {
    const element = document.createElement('div')
    element.className = styles.directiveHost
    element.dataset.contentDirective = this.__kind
    return element
  }

  updateDOM() {
    return false
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('div')
    element.dataset.contentDirective = this.__kind
    element.dataset.contentSource = this.__source
    element.textContent = this.__title
    return { element }
  }

  exportJSON(): SerializedContentDirectiveNode {
    return {
      ...super.exportJSON(),
      kind: this.__kind,
      source: this.__source,
      title: this.__title,
      type: 'content-directive',
      version: 1,
    }
  }

  getKind() {
    return this.getLatest().__kind
  }

  getSource() {
    return this.getLatest().__source
  }

  getTitle() {
    return this.getLatest().__title
  }

  setContent(title: string, source: string) {
    const writable = this.getWritable()
    writable.__title = title
    writable.__source = source
    return writable
  }

  isInline() {
    return false
  }

  isIsolated() {
    return false
  }

  decorate() {
    const kind = this.getKind()
    if (kind === 'resource') return <ContentResourceNode nodeKey={this.getKey()} source={this.getSource()} />

    return (
      <ContentWidgetSelection nodeKey={this.getKey()} label="вкладку">
      <section
        className={styles.directiveCard}
        data-kind={kind}
      >
        <span className={styles.directiveType}>
          Вкладка
        </span>
        <strong className={styles.directiveTitle}>
          {this.getTitle()}
        </strong>
      </section>
      </ContentWidgetSelection>
    )
  }
}

export function $createContentDirectiveNode(
  kind: ContentDirectiveKind,
  title: string,
  source: string,
) {
  return $applyNodeReplacement(
    new ContentDirectiveNode(kind, title, source),
  )
}

export function $isContentDirectiveNode(
  node: LexicalNode | null | undefined,
): node is ContentDirectiveNode {
  return node instanceof ContentDirectiveNode
}

export type SerializedContentDividerNode = Spread<
  {
    type: 'content-divider'
    version: 1
  },
  SerializedLexicalNode
>

export class ContentDividerNode extends DecoratorNode<ReactElement> {
  static getType() {
    return 'content-divider'
  }

  static clone(node: ContentDividerNode) {
    return new ContentDividerNode(node.__key)
  }

  static importJSON() {
    return $createContentDividerNode()
  }

  createDOM() {
    const element = document.createElement('div')
    element.className = styles.dividerHost
    return element
  }

  updateDOM() {
    return false
  }

  exportDOM(): DOMExportOutput {
    return { element: document.createElement('hr') }
  }

  exportJSON(): SerializedContentDividerNode {
    return {
      ...super.exportJSON(),
      type: 'content-divider',
      version: 1,
    }
  }

  isInline() {
    return false
  }

  decorate() {
    return (
      <ContentWidgetSelection nodeKey={this.getKey()} label="разделитель">
        <hr className={styles.contentDivider} />
      </ContentWidgetSelection>
    )
  }
}

export function $createContentDividerNode() {
  return $applyNodeReplacement(new ContentDividerNode())
}

export function $isContentDividerNode(
  node: LexicalNode | null | undefined,
): node is ContentDividerNode {
  return node instanceof ContentDividerNode
}

export type SerializedContentRollNode = Spread<
  {
    expression: string
    type: 'content-roll'
    version: 1
  },
  SerializedLexicalNode
>

export class ContentRollNode extends DecoratorNode<ReactElement> {
  __expression: string

  static getType() {
    return 'content-roll'
  }

  static clone(node: ContentRollNode) {
    return new ContentRollNode(
      node.__expression,
      node.__key,
    )
  }

  static importJSON(serializedNode: SerializedContentRollNode) {
    return $createContentRollNode(serializedNode.expression)
  }

  constructor(expression: string, key?: NodeKey) {
    super(key)
    this.__expression = expression
  }

  createDOM() {
    const element = document.createElement('span')
    element.className = styles.rollHost
    return element
  }

  updateDOM() {
    return false
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('span')
    element.dataset.rollExpression = this.__expression
    element.textContent = this.__expression
    return { element }
  }

  exportJSON(): SerializedContentRollNode {
    return {
      ...super.exportJSON(),
      expression: this.__expression,
      type: 'content-roll',
      version: 1,
    }
  }

  getExpression() {
    return this.getLatest().__expression
  }

  isInline() {
    return true
  }

  isIsolated() {
    return false
  }

  decorate() {
    return (
      <ContentWidgetSelection nodeKey={this.getKey()} label="бросок" inline>
      <span
        className={styles.rollToken}
        title="Бросок станет активным после завершения редактирования"
      >
        <span aria-hidden="true">◇</span>
        {this.getExpression()}
      </span>
      </ContentWidgetSelection>
    )
  }
}

export function $createContentRollNode(expression: string) {
  return $applyNodeReplacement(
    new ContentRollNode(expression.trim() || '1d20'),
  )
}

export function $isContentRollNode(
  node: LexicalNode | null | undefined,
): node is ContentRollNode {
  return node instanceof ContentRollNode
}
