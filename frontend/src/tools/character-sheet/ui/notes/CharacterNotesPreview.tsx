import {
  Fragment,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'

import {
  IconButton,
  ScrollArea,
  Tooltip,
} from '../../../../shared/ui'
import {
  parseContentInline,
  parseContentSource,
  safeContentLinkTarget,
  type ContentBlock,
  type ContentInline,
} from '../../../../shared/ui/ContentEditor/contentCodec'
import {
  describeDiceRoll,
  rollDiceExpression,
  type DiceRollResult,
} from './diceExpression'
import styles from './CharacterNotesEditor.module.css'

type PreviewStyle = CSSProperties & {
  '--notes-preview-lines': string
  '--notes-preview-scale': string
}

export type CharacterNotesPreviewProps = {
  accessibleLabel: string
  onRequestEdit: () => void
  onStructuredResourceChange?: (
    source: string,
    current: number,
    nextValue: string,
  ) => void
  onTextScaleChange: (direction: -1 | 1) => void
  onValueChange: (value: string) => void
  placeholder: string
  rows: number
  textScale: number
  value: string
}

type ActiveRoll = {
  id: string
  result: DiceRollResult
}

function numericAttribute(
  attributes: Readonly<Record<string, string>>,
  key: string,
  fallback: number,
) {
  const value = Number(attributes[key])

  return Number.isFinite(value)
    ? Math.trunc(value)
    : fallback
}

const recoveryLabels: Readonly<Record<string, string>> = {
  either: 'короткий или продолжительный отдых',
  long: 'продолжительный отдых',
  manual: 'вручную',
  none: 'без восстановления',
  short: 'короткий отдых',
}

export function CharacterNotesPreview({
  accessibleLabel,
  onRequestEdit,
  onStructuredResourceChange,
  onTextScaleChange,
  onValueChange,
  placeholder,
  rows,
  textScale,
  value,
}: CharacterNotesPreviewProps) {
  const blocks = useMemo(
    () => parseContentSource(value),
    [value],
  )
  const [activeRoll, setActiveRoll] =
    useState<ActiveRoll | null>(null)
  const style: PreviewStyle = {
    '--notes-preview-lines': String(
      Math.max(2, Math.min(rows, 10)),
    ),
    '--notes-preview-scale': `${textScale}em`,
  }

  function requestEditFromPointer(
    event: MouseEvent<HTMLDivElement>,
  ) {
    const target = event.target

    if (
      target instanceof Element &&
      target.closest('button, a, summary, input')
    ) {
      return
    }

    onRequestEdit()
  }

  function requestEditFromKeyboard(
    event: KeyboardEvent<HTMLDivElement>,
  ) {
    if (
      event.target !== event.currentTarget ||
      (event.key !== 'Enter' && event.key !== 'F2')
    ) {
      return
    }

    event.preventDefault()
    onRequestEdit()
  }

  function updateResourceCurrent(
    block: Extract<ContentBlock, { kind: 'resource' }>,
    direction: -1 | 1,
  ) {
    const current = numericAttribute(
      block.attributes,
      'current',
      0,
    )
    const maximum = numericAttribute(
      block.attributes,
      'maximum',
      Number.POSITIVE_INFINITY,
    )
    const nextCurrent = Math.max(
      0,
      Math.min(maximum, current + direction),
    )
    const header = value.slice(
      block.headerRange.start,
      block.headerRange.end,
    )
    const currentAttribute =
      /(\bcurrent\s*=\s*)(?:"[^"]*"|'[^']*'|[^\s}]+)/i
    let nextHeader: string

    if (currentAttribute.test(header)) {
      nextHeader = header.replace(
        currentAttribute,
        (_match, prefix: string) =>
          `${prefix}${nextCurrent}`,
      )
    } else if (/\{[^}]*\}\s*$/.test(header)) {
      nextHeader = header.replace(
        /\}\s*$/,
        (closing) =>
          `${/\{\s*$/.test(header) ? '' : ' '}current=${nextCurrent}${closing}`,
      )
    } else {
      nextHeader = `${header}{current=${nextCurrent}}`
    }

    const nextValue =
      value.slice(0, block.headerRange.start) +
        nextHeader +
        value.slice(block.headerRange.end)
    const structuredSource = block.attributes.source

    if (structuredSource && onStructuredResourceChange) {
      onStructuredResourceChange(
        structuredSource,
        nextCurrent,
        nextValue,
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
              className={styles.rollToken}
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
              className={styles.previewLink}
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
          <p key={blockKey} className={styles.previewParagraph}>
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
          <Heading key={blockKey} className={styles.previewHeading}>
            {renderInline(block.text, blockKey)}
          </Heading>
        )
      }

      if (block.kind === 'divider') {
        return <hr key={blockKey} className={styles.previewDivider} />
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
          <List key={blockKey} className={styles.previewList}>
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

      const current = numericAttribute(
        block.attributes,
        'current',
        0,
      )
      const maximum = numericAttribute(
        block.attributes,
        'maximum',
        0,
      )
      const recovery =
        recoveryLabels[block.attributes.recovery] ??
        block.attributes.recovery

      return (
        <section key={blockKey} className={styles.resourceBlock}>
          <header className={styles.resourceHeader}>
            <strong>{block.title}</strong>
            <div
              className={styles.resourceCounter}
              role="group"
              aria-label={`Использования ресурса «${block.title}»`}
            >
              <button
                type="button"
                aria-label={`Уменьшить ресурс «${block.title}»`}
                disabled={current <= 0}
                onClick={(event) => {
                  event.stopPropagation()
                  updateResourceCurrent(block, -1)
                }}
              >
                −
              </button>
              <output aria-live="polite">
                {current} / {maximum}
              </output>
              <button
                type="button"
                aria-label={`Увеличить ресурс «${block.title}»`}
                disabled={maximum >= 0 && current >= maximum}
                onClick={(event) => {
                  event.stopPropagation()
                  updateResourceCurrent(block, 1)
                }}
              >
                +
              </button>
            </div>
          </header>
          {recovery && (
            <span className={styles.resourceRecovery}>
              Восстановление: {recovery}
            </span>
          )}
          {block.body.length > 0 && (
            <div className={styles.directiveBody}>
              {renderBlocks(block.body)}
            </div>
          )}
        </section>
      )
    })
  }

  return (
    <div
      aria-label={accessibleLabel}
      className={styles.previewFrame}
      data-empty={value.trim().length === 0}
      role="region"
      style={style}
      tabIndex={0}
      title="Нажмите, чтобы редактировать"
      onClick={requestEditFromPointer}
      onKeyDown={requestEditFromKeyboard}
    >
      <ScrollArea
        contentClassName={styles.previewContent}
        rootClassName={styles.previewScrollArea}
        verticalScrollBarLabel={`Прокрутка поля «${accessibleLabel}»`}
      >
        {blocks.length > 0 ? (
          renderBlocks(blocks)
        ) : (
          <span className={styles.previewPlaceholder}>
            {placeholder}
          </span>
        )}
      </ScrollArea>

      <div
        className={styles.previewScaleControls}
        role="group"
        aria-label={`Размер текста: ${accessibleLabel}`}
      >
        <Tooltip content="Уменьшить текст">
          <IconButton
            aria-label={`Уменьшить текст: ${accessibleLabel}`}
            className={styles.previewScaleButton}
            disabled={textScale <= 0.75}
            icon={
              <span className={styles.previewScaleGlyph}>
                −
              </span>
            }
            size="sm"
            variant="secondary"
            onClick={() => onTextScaleChange(-1)}
          />
        </Tooltip>

        <output className={styles.srOnly} aria-live="polite">
          {Math.round(textScale * 100)}%
        </output>

        <Tooltip content="Увеличить текст">
          <IconButton
            aria-label={`Увеличить текст: ${accessibleLabel}`}
            className={styles.previewScaleButton}
            disabled={textScale >= 1.5}
            icon={
              <span className={styles.previewScaleGlyph}>
                +
              </span>
            }
            size="sm"
            variant="secondary"
            onClick={() => onTextScaleChange(1)}
          />
        </Tooltip>
      </div>

      {activeRoll && (
        <output className={styles.srOnly} aria-live="polite">
          {describeDiceRoll(activeRoll.result)}
        </output>
      )}
    </div>
  )
}
