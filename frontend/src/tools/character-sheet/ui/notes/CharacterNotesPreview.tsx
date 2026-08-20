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
  describeDiceRoll,
  rollDiceExpression,
  type DiceRollResult,
} from './diceExpression'
import styles from './CharacterNotesEditor.module.css'

type SourceRange = {
  end: number
  start: number
}

type NotesBlock =
  | {
      key: string
      kind: 'paragraph'
      lines: readonly string[]
    }
  | {
      key: string
      kind: 'heading'
      level: number
      text: string
    }
  | {
      key: string
      kind: 'divider'
    }
  | {
      key: string
      kind: 'list'
      listKind: 'ordered' | 'unordered' | 'check'
      items: readonly {
        checked?: boolean
        text: string
      }[]
    }
  | {
      attributes: Readonly<Record<string, string>>
      body: readonly NotesBlock[]
      headerRange: SourceRange
      key: string
      kind: 'resource'
      title: string
    }
  | {
      body: readonly NotesBlock[]
      key: string
      kind: 'collapsible'
      title: string
    }

type SourceLine = {
  end: number
  nextStart: number
  start: number
  text: string
}

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

const directivePattern =
  /^:::(resource|collapsible)\[([^\]]*)\](?:\{([^}]*)\})?\s*$/i
const headingPattern = /^(#{1,6})\s+(.+)$/
const orderedItemPattern = /^\s*\d+[.)]\s+(.+)$/
const checkItemPattern =
  /^\s*[-*+]\s+\[([ xX])\]\s+(.+)$/
const unorderedItemPattern = /^\s*[-*+]\s+(.+)$/

function getSourceLines(
  source: string,
  baseOffset: number,
) {
  const lines: SourceLine[] = []
  let localStart = 0

  while (localStart <= source.length) {
    const lineBreak = source.indexOf('\n', localStart)
    const hasLineBreak = lineBreak !== -1
    const rawEnd = hasLineBreak
      ? lineBreak
      : source.length
    const textEnd =
      rawEnd > localStart &&
      source[rawEnd - 1] === '\r'
        ? rawEnd - 1
        : rawEnd

    lines.push({
      end: baseOffset + textEnd,
      nextStart:
        baseOffset + rawEnd + (hasLineBreak ? 1 : 0),
      start: baseOffset + localStart,
      text: source.slice(localStart, textEnd),
    })

    if (!hasLineBreak) break

    localStart = rawEnd + 1
  }

  return lines
}

function parseAttributes(source = '') {
  const attributes: Record<string, string> = {}
  const pattern =
    /([a-z][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s}]+))/gi
  let match = pattern.exec(source)

  while (match) {
    attributes[match[1].toLowerCase()] =
      match[2] ?? match[3] ?? match[4] ?? ''
    match = pattern.exec(source)
  }

  return attributes
}

function beginsSpecialBlock(line: string) {
  return (
    directivePattern.test(line) ||
    headingPattern.test(line) ||
    line.trim() === '---' ||
    orderedItemPattern.test(line) ||
    checkItemPattern.test(line) ||
    unorderedItemPattern.test(line)
  )
}

function parseNotesBlocks(
  source: string,
  baseOffset = 0,
): NotesBlock[] {
  const lines = getSourceLines(source, baseOffset)
  const blocks: NotesBlock[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.text.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    const directive = line.text.match(directivePattern)

    if (directive) {
      const closingIndex = lines.findIndex(
        (candidate, candidateIndex) =>
          candidateIndex > index &&
          candidate.text.trim() === ':::',
      )

      if (closingIndex !== -1) {
        const bodyStart = line.nextStart
        const bodyEnd = lines[closingIndex].start
        const bodySource = source.slice(
          bodyStart - baseOffset,
          bodyEnd - baseOffset,
        )
        const common = {
          body: parseNotesBlocks(bodySource, bodyStart),
          key: `${line.start}-${directive[1]}`,
          title:
            directive[2].trim() ||
            (directive[1].toLowerCase() === 'resource'
              ? 'Ресурс'
              : 'Сворачиваемый блок'),
        }

        if (directive[1].toLowerCase() === 'resource') {
          blocks.push({
            ...common,
            attributes: parseAttributes(directive[3]),
            headerRange: {
              end: line.end,
              start: line.start,
            },
            kind: 'resource',
          })
        } else {
          blocks.push({
            ...common,
            kind: 'collapsible',
          })
        }

        index = closingIndex + 1
        continue
      }
    }

    const heading = line.text.match(headingPattern)

    if (heading) {
      blocks.push({
        key: `${line.start}-heading`,
        kind: 'heading',
        level: heading[1].length,
        text: heading[2],
      })
      index += 1
      continue
    }

    if (trimmed === '---') {
      blocks.push({
        key: `${line.start}-divider`,
        kind: 'divider',
      })
      index += 1
      continue
    }

    const checkItem = line.text.match(checkItemPattern)

    if (checkItem) {
      const items: {
        checked: boolean
        text: string
      }[] = []

      while (index < lines.length) {
        const item = lines[index].text.match(
          checkItemPattern,
        )

        if (!item) break

        items.push({
          checked: item[1].toLowerCase() === 'x',
          text: item[2],
        })
        index += 1
      }

      blocks.push({
        items,
        key: `${line.start}-check-list`,
        kind: 'list',
        listKind: 'check',
      })
      continue
    }

    const orderedItem = line.text.match(
      orderedItemPattern,
    )

    if (orderedItem) {
      const items: { text: string }[] = []

      while (index < lines.length) {
        const item = lines[index].text.match(
          orderedItemPattern,
        )

        if (!item) break

        items.push({ text: item[1] })
        index += 1
      }

      blocks.push({
        items,
        key: `${line.start}-ordered-list`,
        kind: 'list',
        listKind: 'ordered',
      })
      continue
    }

    const unorderedItem = line.text.match(
      unorderedItemPattern,
    )

    if (unorderedItem) {
      const items: { text: string }[] = []

      while (index < lines.length) {
        const item = lines[index].text.match(
          unorderedItemPattern,
        )

        if (!item || checkItemPattern.test(lines[index].text)) {
          break
        }

        items.push({ text: item[1] })
        index += 1
      }

      blocks.push({
        items,
        key: `${line.start}-unordered-list`,
        kind: 'list',
        listKind: 'unordered',
      })
      continue
    }

    const paragraphLines = [line.text]
    index += 1

    while (
      index < lines.length &&
      lines[index].text.trim() &&
      !beginsSpecialBlock(lines[index].text)
    ) {
      paragraphLines.push(lines[index].text)
      index += 1
    }

    blocks.push({
      key: `${line.start}-paragraph`,
      kind: 'paragraph',
      lines: paragraphLines,
    })
  }

  return blocks
}

function safeLinkTarget(source: string) {
  const target = source.trim()

  if (
    /^(?:https?:|mailto:)/i.test(target) ||
    (target.startsWith('/') &&
      !target.startsWith('//')) ||
    target.startsWith('#')
  ) {
    return target
  }

  return null
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
    () => parseNotesBlocks(value),
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
    block: Extract<NotesBlock, { kind: 'resource' }>,
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
    const structuredSource = block.attributes.source

    if (structuredSource && onStructuredResourceChange) {
      onStructuredResourceChange(
        structuredSource,
        nextCurrent,
      )
      return
    }

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

    onValueChange(
      value.slice(0, block.headerRange.start) +
        nextHeader +
        value.slice(block.headerRange.end),
    )
  }

  function renderInline(
    source: string,
    keyPrefix: string,
  ): ReactNode[] {
    const pattern =
      /\[\[roll:([^\]\r\n]+)\]\]|\[([^\]\r\n]+)\]\(([^)\r\n]+)\)|\*\*([^*\r\n]+)\*\*|__([^_\r\n]+)__|<u>([\s\S]*?)<\/u>|\*([^*\r\n]+)\*|_([^_\r\n]+)_/gi
    const nodes: ReactNode[] = []
    let cursor = 0
    let match = pattern.exec(source)

    while (match) {
      if (match.index > cursor) {
        nodes.push(source.slice(cursor, match.index))
      }

      const key = `${keyPrefix}-${match.index}`

      if (match[1] !== undefined) {
        const expression = match[1].trim()
        const rollId = `${key}-${expression}`
        const result =
          activeRoll?.id === rollId
            ? activeRoll.result
            : null

        nodes.push(
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
          </Tooltip>,
        )
      } else if (match[2] !== undefined) {
        const target = safeLinkTarget(match[3])

        nodes.push(
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
              {renderInline(match[2], `${key}-link`)}
            </a>
          ) : (
            <span
              key={key}
              className={styles.invalidLink}
              title="Недопустимый адрес ссылки"
            >
              {renderInline(match[2], `${key}-invalid-link`)}
            </span>
          ),
        )
      } else if (match[4] !== undefined || match[5] !== undefined) {
        const content = match[4] ?? match[5]

        nodes.push(
          <strong key={key}>
            {renderInline(content, `${key}-strong`)}
          </strong>,
        )
      } else if (match[6] !== undefined) {
        nodes.push(
          <u key={key}>
            {renderInline(match[6], `${key}-underline`)}
          </u>,
        )
      } else {
        const content = match[7] ?? match[8]

        nodes.push(
          <em key={key}>
            {renderInline(content, `${key}-emphasis`)}
          </em>,
        )
      }

      cursor = match.index + match[0].length
      match = pattern.exec(source)
    }

    if (cursor < source.length) {
      nodes.push(source.slice(cursor))
    }

    return nodes
  }

  function renderBlocks(
    sourceBlocks: readonly NotesBlock[],
  ): ReactNode {
    return sourceBlocks.map((block) => {
      if (block.kind === 'paragraph') {
        return (
          <p key={block.key} className={styles.previewParagraph}>
            {block.lines.map((line, index) => (
              <Fragment key={`${block.key}-${index}`}>
                {index > 0 && <br />}
                {renderInline(line, `${block.key}-${index}`)}
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
          <Heading key={block.key} className={styles.previewHeading}>
            {renderInline(block.text, block.key)}
          </Heading>
        )
      }

      if (block.kind === 'divider') {
        return <hr key={block.key} className={styles.previewDivider} />
      }

      if (block.kind === 'list') {
        if (block.listKind === 'check') {
          return (
            <ul key={block.key} className={styles.checkList}>
              {block.items.map((item, index) => (
                <li key={`${block.key}-${index}`}>
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
                      `${block.key}-${index}`,
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
          <List key={block.key} className={styles.previewList}>
            {block.items.map((item, index) => (
              <li key={`${block.key}-${index}`}>
                {renderInline(
                  item.text,
                  `${block.key}-${index}`,
                )}
              </li>
            ))}
          </List>
        )
      }

      if (block.kind === 'collapsible') {
        return (
          <details key={block.key} className={styles.collapsibleBlock}>
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
        <section key={block.key} className={styles.resourceBlock}>
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
