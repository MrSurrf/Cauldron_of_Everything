import {
  Fragment,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { Tooltip } from '../Tooltip'
import { ResourceWidget } from './ResourceWidget'
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
> & { editorId?: string }

type ActiveRoll = {
  id: string
  result: DiceRollResult
}

export function ContentPreview({
  disabled = false,
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
              <span aria-hidden="true">◇</span>
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
    return sourceBlocks.map((block) => {
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
                  <input
                    aria-label={
                      item.checked
                        ? 'Выполнено'
                        : 'Не выполнено'
                    }
                    checked={item.checked}
                    readOnly={true}
                    tabIndex={-1}
                    type="checkbox"
                  />
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
          <details key={blockKey} className={styles.collapsibleBlock}>
            <summary>{block.title}</summary>
            <div className={styles.directiveBody}>
              {renderBlocks(block.body)}
            </div>
          </details>
        )
      }

      return (
        <ResourceWidget
          key={blockKey}
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
