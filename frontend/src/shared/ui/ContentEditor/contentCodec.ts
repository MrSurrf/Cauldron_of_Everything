export type ContentSourceRange = {
  end: number
  start: number
}

type ContentNodeSource = {
  rawSource: string
  sourceRange: ContentSourceRange
}

export type ContentInline =
  | (ContentNodeSource & {
      kind: 'text'
      text: string
    })
  | (ContentNodeSource & {
      children: readonly ContentInline[]
      kind: 'bold' | 'italic' | 'underline'
    })
  | (ContentNodeSource & {
      children: readonly ContentInline[]
      kind: 'link'
      target: string
    })
  | (ContentNodeSource & {
      expression: string
      kind: 'roll'
    })

export type ContentListItem = {
  checked?: boolean
  text: string
}

type ContentBlockSource = ContentNodeSource

type ContentDirectiveBlock = ContentBlockSource & {
  attributes: Readonly<Record<string, string>>
  body: readonly ContentBlock[]
  headerRange: ContentSourceRange
  title: string
}

export type ContentBlock =
  | (ContentBlockSource & {
      kind: 'paragraph'
      lines: readonly string[]
    })
  | (ContentBlockSource & {
      kind: 'heading'
      level: number
      text: string
    })
  | (ContentBlockSource & {
      kind: 'divider'
    })
  | (ContentBlockSource & {
      items: readonly ContentListItem[]
      kind: 'list'
      listKind: 'ordered' | 'unordered' | 'check'
    })
  | (ContentDirectiveBlock & {
      kind: 'resource'
    })
  | (ContentDirectiveBlock & {
      kind: 'collapsible'
    })

type SourceLine = {
  end: number
  nextStart: number
  start: number
  text: string
}

const directivePattern =
  /^:::(resource|collapsible)\[([^\]]*)\](?:\{([^}]*)\})?\s*$/i
const headingPattern = /^(#{1,6})\s+(.+)$/
const orderedItemPattern = /^\s*\d+[.)]\s+(.+)$/
const checkItemPattern =
  /^\s*[-*+]\s+\[([ xX])\]\s+(.+)$/
const unorderedItemPattern = /^\s*[-*+]\s+(.+)$/
const inlinePattern =
  /\[\[roll:([^\]\r\n]+)\]\]|\[([^\]\r\n]+)\]\(([^)\r\n]+)\)|<strong>([\s\S]*?)<\/strong>|<em>([\s\S]*?)<\/em>|\*\*([^*\r\n]+)\*\*|__([^_\r\n]+)__|<u>([\s\S]*?)<\/u>|\*([^*\r\n]+)\*|_([^_\r\n]+)_/gi

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

function sourceSlice(
  source: string,
  baseOffset: number,
  range: ContentSourceRange,
) {
  return source.slice(
    range.start - baseOffset,
    range.end - baseOffset,
  )
}

export function parseContentSource(
  source: string,
  baseOffset = 0,
): ContentBlock[] {
  const lines = getSourceLines(source, baseOffset)
  const blocks: ContentBlock[] = []
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
        const closingLine = lines[closingIndex]
        const bodyStart = line.nextStart
        const bodyEnd = closingLine.start
        const bodySource = source.slice(
          bodyStart - baseOffset,
          bodyEnd - baseOffset,
        )
        const kind = directive[1].toLowerCase() as
          | 'resource'
          | 'collapsible'
        const sourceRange = {
          end: closingLine.end,
          start: line.start,
        }
        const common: ContentDirectiveBlock = {
          attributes: parseAttributes(directive[3]),
          body: parseContentSource(bodySource, bodyStart),
          headerRange: {
            end: line.end,
            start: line.start,
          },
          rawSource: sourceSlice(
            source,
            baseOffset,
            sourceRange,
          ),
          sourceRange,
          title:
            directive[2].trim() ||
            (kind === 'resource'
              ? 'Ресурс'
              : 'Раскрываемый раздел'),
        }

        blocks.push({ ...common, kind })
        index = closingIndex + 1
        continue
      }
    }

    const heading = line.text.match(headingPattern)

    if (heading) {
      const sourceRange = {
        end: line.end,
        start: line.start,
      }

      blocks.push({
        kind: 'heading',
        level: heading[1].length,
        rawSource: line.text,
        sourceRange,
        text: heading[2],
      })
      index += 1
      continue
    }

    if (trimmed === '---') {
      blocks.push({
        kind: 'divider',
        rawSource: line.text,
        sourceRange: {
          end: line.end,
          start: line.start,
        },
      })
      index += 1
      continue
    }

    const checkItem = line.text.match(checkItemPattern)

    if (checkItem) {
      const items: ContentListItem[] = []
      const start = line.start
      let end = line.end

      while (index < lines.length) {
        const itemLine = lines[index]
        const item = itemLine.text.match(checkItemPattern)

        if (!item) break

        items.push({
          checked: item[1].toLowerCase() === 'x',
          text: item[2],
        })
        end = itemLine.end
        index += 1
      }

      const sourceRange = { end, start }

      blocks.push({
        items,
        kind: 'list',
        listKind: 'check',
        rawSource: sourceSlice(
          source,
          baseOffset,
          sourceRange,
        ),
        sourceRange,
      })
      continue
    }

    const orderedItem = line.text.match(
      orderedItemPattern,
    )

    if (orderedItem) {
      const items: ContentListItem[] = []
      const start = line.start
      let end = line.end

      while (index < lines.length) {
        const itemLine = lines[index]
        const item = itemLine.text.match(
          orderedItemPattern,
        )

        if (!item) break

        items.push({ text: item[1] })
        end = itemLine.end
        index += 1
      }

      const sourceRange = { end, start }

      blocks.push({
        items,
        kind: 'list',
        listKind: 'ordered',
        rawSource: sourceSlice(
          source,
          baseOffset,
          sourceRange,
        ),
        sourceRange,
      })
      continue
    }

    const unorderedItem = line.text.match(
      unorderedItemPattern,
    )

    if (unorderedItem) {
      const items: ContentListItem[] = []
      const start = line.start
      let end = line.end

      while (index < lines.length) {
        const itemLine = lines[index]
        const item = itemLine.text.match(
          unorderedItemPattern,
        )

        if (!item || checkItemPattern.test(itemLine.text)) {
          break
        }

        items.push({ text: item[1] })
        end = itemLine.end
        index += 1
      }

      const sourceRange = { end, start }

      blocks.push({
        items,
        kind: 'list',
        listKind: 'unordered',
        rawSource: sourceSlice(
          source,
          baseOffset,
          sourceRange,
        ),
        sourceRange,
      })
      continue
    }

    const paragraphLines = [line.text]
    const start = line.start
    let end = line.end
    index += 1

    while (
      index < lines.length &&
      lines[index].text.trim() &&
      !beginsSpecialBlock(lines[index].text)
    ) {
      paragraphLines.push(lines[index].text)
      end = lines[index].end
      index += 1
    }

    const sourceRange = { end, start }

    blocks.push({
      kind: 'paragraph',
      lines: paragraphLines,
      rawSource: sourceSlice(
        source,
        baseOffset,
        sourceRange,
      ),
      sourceRange,
    })
  }

  return blocks
}

function parseInlineSource(
  source: string,
  baseOffset: number,
): ContentInline[] {
  const nodes: ContentInline[] = []
  const pattern = new RegExp(
    inlinePattern.source,
    inlinePattern.flags,
  )
  let cursor = 0
  let match = pattern.exec(source)

  function addText(start: number, end: number) {
    if (end <= start) return

    nodes.push({
      kind: 'text',
      rawSource: source.slice(start, end),
      sourceRange: {
        end: baseOffset + end,
        start: baseOffset + start,
      },
      text: source.slice(start, end),
    })
  }

  while (match) {
    addText(cursor, match.index)

    const start = baseOffset + match.index
    const end = start + match[0].length
    const common: ContentNodeSource = {
      rawSource: match[0],
      sourceRange: { end, start },
    }

    if (match[1] !== undefined) {
      nodes.push({
        ...common,
        expression: match[1].trim(),
        kind: 'roll',
      })
    } else if (match[2] !== undefined) {
      nodes.push({
        ...common,
        children: parseInlineSource(
          match[2],
          start + 1,
        ),
        kind: 'link',
        target: match[3],
      })
    } else if (match[4] !== undefined) {
      nodes.push({
        ...common,
        children: parseInlineSource(
          match[4],
          start + '<strong>'.length,
        ),
        kind: 'bold',
      })
    } else if (match[5] !== undefined) {
      nodes.push({
        ...common,
        children: parseInlineSource(
          match[5],
          start + '<em>'.length,
        ),
        kind: 'italic',
      })
    } else if (
      match[6] !== undefined ||
      match[7] !== undefined
    ) {
      const content = match[6] ?? match[7]

      nodes.push({
        ...common,
        children: parseInlineSource(
          content,
          start + 2,
        ),
        kind: 'bold',
      })
    } else if (match[8] !== undefined) {
      nodes.push({
        ...common,
        children: parseInlineSource(
          match[8],
          start + 3,
        ),
        kind: 'underline',
      })
    } else {
      const content = match[9] ?? match[10]

      nodes.push({
        ...common,
        children: parseInlineSource(
          content,
          start + 1,
        ),
        kind: 'italic',
      })
    }

    cursor = match.index + match[0].length
    match = pattern.exec(source)
  }

  addText(cursor, source.length)
  return nodes
}

export function parseContentInline(
  source: string,
): ContentInline[] {
  return parseInlineSource(source, 0)
}

function containsControlCharacter(source: string) {
  return Array.from(source).some((character) => {
    const code = character.charCodeAt(0)

    return code < 32 || code === 127
  })
}

export function safeContentLinkTarget(
  source: string,
) {
  const target = source.trim()

  if (
    !target ||
    containsControlCharacter(target)
  ) {
    return null
  }

  if (/^https?:/i.test(target)) {
    try {
      const url = new URL(target)

      return url.protocol === 'http:' ||
        url.protocol === 'https:'
        ? target
        : null
    } catch {
      return null
    }
  }

  if (/^mailto:/i.test(target)) {
    return target
  }

  if (target.startsWith('#')) {
    return target
  }

  if (
    target.startsWith('/') &&
    !target.startsWith('//') &&
    !target.startsWith('/\\')
  ) {
    return target
  }

  return null
}
