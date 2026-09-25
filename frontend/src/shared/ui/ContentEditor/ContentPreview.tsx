import {
  Fragment,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { SelectionMarker } from '../SelectionMarker'
import { Tooltip } from '../Tooltip'
import { DiceIcon } from '../icons/DiceIcon'
import { getDiceTypeFromExpression } from '../icons/dice'
import { ContentPreviewWidgetDrag } from './ContentWidgetDragDrop'
import { ResourceWidget } from './ResourceWidget'
import { SectionWidget } from './SectionWidget'
import { sectionFromBlock, sectionToSource } from './sectionContent'
import { ItemWidget } from './ItemWidget'
import { itemFromBlock, itemToSource } from './itemContent'
import { resourceFromBlock, resourceToSource, type ResourceBlock } from './resourceContent'
import type { ContentResourceValue } from './ResourceWidget'
import {
  parseContentInline,
  parseContentSource,
  safeContentLinkTarget,
  type ContentBlock,
  type ContentInline,
} from './contentCodec'
import {
  describeDiceRoll,
  rollDiceExpression,
  type DiceRollResult,
} from './diceExpression'
import type { ContentEditorProps } from './ContentEditor.types'
import editorStyles from './ContentEditor.module.css'
import styles from './ContentPreview.module.css'

type ContentPreviewProps = Pick<ContentEditorProps,
  | 'disabled'
  | 'readOnly'
  | 'onStructuredResourceChange'
  | 'onValueChange'
  | 'placeholder'
  | 'value'
  | 'evaluateResourceMaximum'
> & {
  dndEditorId?: string
  editorId?: string
}

type ActiveRoll = {
  id: string
  result: DiceRollResult
}

export function ContentPreview({
  disabled = false,
  dndEditorId,
  editorId,
  evaluateResourceMaximum,
  readOnly = false,
  onStructuredResourceChange,
  onValueChange,
  placeholder,
  value,
}: ContentPreviewProps) {
  const blocks = useMemo(
    () => parseContentSource(value),
    [value],
  )
  const [activeRoll, setActiveRoll] =
    useState<ActiveRoll | null>(null)

  function replaceBlock(block: ContentBlock, source: string) {
    return value.slice(0, block.sourceRange.start) + source + value.slice(block.sourceRange.end)
  }

  function removeBlock(block: ContentBlock) {
    if (!disabled && !readOnly) onValueChange(replaceBlock(block, ''))
  }

  function updateResource(block: ResourceBlock, next: ContentResourceValue) {
    if (readOnly || disabled) return
    const nextValue = value.slice(0, block.sourceRange.start) + resourceToSource(next, block.attributes) + value.slice(block.sourceRange.end)
    const structuredSource = block.attributes.source

    if (structuredSource && onStructuredResourceChange) {
      onStructuredResourceChange(
        structuredSource,
        next.current ?? 0,
        nextValue,
        next,
      )
      return
    }

    onValueChange(nextValue)
  }

  function renderInlineNodes(
    sourceNodes: readonly ContentInline[],
    keyPrefix: string,
  ): ReactNode[] {
    return sourceNodes.map((node, index) => {
      const key = `${keyPrefix}-${node.sourceRange.start}-${index}`

      if (node.kind === 'text') {
        return <Fragment key={key}>{node.text}</Fragment>
      }

      if (node.kind === 'roll') {
        const expression = node.expression
        const rollId = `${key}-${expression}`
        const result =
          activeRoll?.id === rollId
            ? activeRoll.result
            : null

        return (
          <Tooltip
            key={key}
            closeDelay={0}
            content={
              result ? (
                <span
                  className={styles.rollResult}
                  data-error={result.status === 'error'}
                >
                  {describeDiceRoll(result)}
                </span>
              ) : (
                'Нажмите, чтобы бросить'
              )
            }
            offset={5}
            open={Boolean(result)}
            openDelay={0}
            placement="top"
            onOpenChange={(open) => {
              if (!open && activeRoll?.id === rollId) {
                setActiveRoll(null)
              }
            }}
          >
            <button
              type="button"
              className={`${editorStyles.rollToken} ${styles.rollToken}`}
              disabled={disabled}
              aria-label={`Бросить ${expression}`}
              onClick={(event) => {
                event.stopPropagation()
                setActiveRoll({
                  id: rollId,
                  result: rollDiceExpression(expression),
                })
              }}
            >
              <DiceIcon
                type={getDiceTypeFromExpression(expression) ?? 'd20'}
              />
              {expression}
            </button>
          </Tooltip>
        )
      }

      if (node.kind === 'link') {
        const target = safeContentLinkTarget(node.target)

        return (
          target ? (
            <a
              key={key}
              className={editorStyles.link}
              href={target}
              rel={
                /^https?:/i.test(target)
                  ? 'noreferrer'
                  : undefined
              }
              target={
                /^https?:/i.test(target)
                  ? '_blank'
                  : undefined
              }
              onClick={(event) => event.stopPropagation()}
            >
              {renderInlineNodes(node.children, `${key}-link`)}
            </a>
          ) : (
            <span
              key={key}
              className={styles.invalidLink}
              title="Недопустимый адрес ссылки"
            >
              {renderInlineNodes(
                node.children,
                `${key}-invalid-link`,
              )}
            </span>
          )
        )
      }

      if (node.kind === 'bold') {
        return (
          <strong key={key}>
            {renderInlineNodes(node.children, `${key}-strong`)}
          </strong>
        )
      }

      if (node.kind === 'underline') {
        return (
          <u key={key}>
            {renderInlineNodes(
              node.children,
              `${key}-underline`,
            )}
          </u>
        )
      }

      return (
        <em key={key}>
          {renderInlineNodes(
            node.children,
            `${key}-emphasis`,
          )}
        </em>
      )
    })
  }

  function renderInline(
    source: string,
    keyPrefix: string,
  ) {
    return renderInlineNodes(
      parseContentInline(source),
      keyPrefix,
    )
  }

  function renderBlocks(
    sourceBlocks: readonly ContentBlock[],
  ): ReactNode {
    return sourceBlocks.map((block, blockIndex) => {
      const blockKey = `${block.sourceRange.start}-${block.kind}`

      if (block.kind === 'paragraph') {
        return (
          <p key={blockKey} className={editorStyles.paragraph}>
            {block.lines.map((line, index) => (
              <Fragment key={`${blockKey}-${index}`}>
                {index > 0 && <br />}
                {renderInline(line, `${blockKey}-${index}`)}
              </Fragment>
            ))}
          </p>
        )
      }

      if (block.kind === 'heading') {
        const Heading = `h${Math.min(block.level + 2, 6)}` as
          | 'h3'
          | 'h4'
          | 'h5'
          | 'h6'

        return (
          <Heading key={blockKey} className={editorStyles.heading}>
            {renderInline(block.text, blockKey)}
          </Heading>
        )
      }

      if (block.kind === 'divider') {
        return <hr key={blockKey} className={editorStyles.contentDivider} />
      }

      if (block.kind === 'list') {
        if (block.listKind === 'check') {
          return (
            <ul key={blockKey} className={styles.checkList}>
              {block.items.map((item, index) => (
                <li key={`${blockKey}-${index}`}>
                  <span className={styles.checkMarker}>
                    <SelectionMarker
                      state={item.checked ? 'checked' : 'unchecked'}
                    />
                    <span className={editorStyles.srOnly}>
                      {item.checked ? 'Выполнено' : 'Не выполнено'}
                    </span>
                  </span>
                  <span>
                    {renderInline(
                      item.text,
                      `${blockKey}-${index}`,
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )
        }

        const List =
          block.listKind === 'ordered' ? 'ol' : 'ul'

        return (
          <List key={blockKey} className={editorStyles.unorderedList}>
            {block.items.map((item, index) => (
              <li key={`${blockKey}-${index}`}>
                {renderInline(
                  item.text,
                  `${blockKey}-${index}`,
                )}
              </li>
            ))}
          </List>
        )
      }

      if (block.kind === 'collapsible') {
        return (
          <ContentPreviewWidgetDrag
            key={blockKey}
            disabled={disabled || readOnly}
            descriptor={{
              editorId: dndEditorId,
              kind: block.kind,
              label: 'вкладку',
              source: block.rawSource,
              sourceIndex: blockIndex,
            }}
          >
            <SectionWidget editorId={editorId} disabled={disabled} readOnly={readOnly}
              evaluateResourceMaximum={evaluateResourceMaximum} value={sectionFromBlock(block)}
              onChange={next => { if (!disabled && !readOnly) onValueChange(replaceBlock(block, sectionToSource(next, block.attributes))) }}
              onRemove={() => removeBlock(block)}
              onStructuredResourceChange={onStructuredResourceChange ? (source, current, body, resource) => {
                const next = { ...sectionFromBlock(block), body }
                onStructuredResourceChange(source, current, replaceBlock(block, sectionToSource(next, block.attributes)), resource)
              } : undefined} />
          </ContentPreviewWidgetDrag>
        )
      }

      if (block.kind === 'item') return (
        <ContentPreviewWidgetDrag
          key={blockKey}
          disabled={disabled || readOnly}
          descriptor={{
            editorId: dndEditorId,
            kind: block.kind,
            label: 'предмет',
            source: block.rawSource,
            sourceIndex: blockIndex,
          }}
        >
          <ItemWidget editorId={editorId} disabled={disabled} readOnly={readOnly}
            value={itemFromBlock(block)} onRemove={() => removeBlock(block)}
            onChange={next => { if (!disabled && !readOnly) onValueChange(replaceBlock(block, itemToSource(next, block.attributes))) }} />
        </ContentPreviewWidgetDrag>
      )

      return (
        <ContentPreviewWidgetDrag
          key={blockKey}
          disabled={disabled || readOnly}
          descriptor={{
            editorId: dndEditorId,
            kind: block.kind,
            label: 'ресурс',
            source: block.rawSource,
            sourceIndex: blockIndex,
          }}
        >
          <ResourceWidget
            editorId={editorId}
            disabled={disabled}
            readOnly={readOnly}
            evaluateMaximum={evaluateResourceMaximum}
            value={resourceFromBlock(block)}
            onChange={(next) => updateResource(block, next)}
            onRemove={() => {
              if (!disabled && !readOnly) onValueChange(value.slice(0, block.sourceRange.start) + value.slice(block.sourceRange.end))
            }}
          />
        </ContentPreviewWidgetDrag>
      )
    })
  }

  return (
    <>
      {blocks.length > 0 ? renderBlocks(blocks) : (
        <span className={styles.placeholder}>{placeholder}</span>
      )}
      {activeRoll && (
        <output className={editorStyles.srOnly} aria-live="polite">
          {describeDiceRoll(activeRoll.result)}
        </output>
      )}
    </>
  )
}
