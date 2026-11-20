export type SpellFrequencyGroup = {
  label: string
  html: string
}

type SectionContentBlock =
  | { type: 'content'; html: string }
  | { type: 'spells'; groups: SpellFrequencyGroup[] }

const frequencyLabel = new RegExp(
  '^\\s*((?:неограниченно|по\\s+желанию|постоянно)' +
  '|(?:по\\s+)?\\d+\\s*(?:раз(?:а)?\\s*)?(?:/\\s*день|в\\s+день)(?:\\s+(?:кажд(?:ое|ый|ая)|\\(кажд(?:ое|ый|ая)\\)))?' +
  '|заговоры(?:\\s*\\([^)]*\\))?' +
  '|\\d+(?:\\s*[-–—]\\s*\\d+)?\\s*[-–—]?\\s*(?:й|ый|го)?\\s*уров(?:ень|ня)(?:\\s*\\([^)]*\\))?' +
  ')\\s*[:：]\\s*',
  'i',
)

/** Совпадение требует двоеточия: обычный абзац о колдовстве не становится списком. */
export function matchSpellFrequencyLabel(text: string) {
  const match = text.match(frequencyLabel)
  return match
    ? { label: match[1].replace(/\s+/g, ' ').trim(), prefixLength: match[0].length }
    : undefined
}

function serializeNode(node: Node, document: Document): string {
  const container = document.createElement('div')
  container.appendChild(node.cloneNode(true))
  return container.innerHTML
}

function bodyAfterPrefix(element: Element, length: number, document: Document): string {
  // Range сохраняет вложенные <em>/<a> и атрибуты ссылок при удалении метки частоты.
  const walker = document.createTreeWalker(element, 4 /* NodeFilter.SHOW_TEXT */)
  let remaining = length
  let node = walker.nextNode()

  while (node) {
    const size = node.textContent?.length ?? 0
    if (remaining <= size) {
      const range = document.createRange()
      range.selectNodeContents(element)
      range.setStart(node, remaining)
      const container = document.createElement('div')
      container.appendChild(range.cloneContents())
      return container.innerHTML
    }
    remaining -= size
    node = walker.nextNode()
  }

  return ''
}

function splitParagraphLines(element: Element, document: Document): Element[] {
  const breaks = Array.from(element.querySelectorAll('br'))
  if (!breaks.length) return [element]

  const range = document.createRange()
  range.setStart(element, 0)
  const lines: Element[] = []

  for (const lineBreak of breaks) {
    range.setEndBefore(lineBreak)
    const paragraph = document.createElement('p')
    paragraph.appendChild(range.cloneContents())
    lines.push(paragraph)
    range.setStartAfter(lineBreak)
  }

  range.setEnd(element, element.childNodes.length)
  const last = document.createElement('p')
  last.appendChild(range.cloneContents())
  lines.push(last)

  // Вне списков заклинаний сохраняем исходные переводы строк без преобразования.
  return lines.some((line) => matchSpellFrequencyLabel(line.textContent ?? ''))
    ? lines
    : [element]
}

/**
 * Выделяем только явно помеченные группы заклинаний. Таблицы, списки и неизвестные
 * блоки проходят целиком в RichContent; санитизация остаётся на его стороне.
 */
export function splitCreatureSectionContent(html: string): SectionContentBlock[] {
  if (typeof DOMParser === 'undefined') return [{ type: 'content', html }]

  const document = new DOMParser().parseFromString(html, 'text/html')
  const blocks: SectionContentBlock[] = []

  function addContent(contentHtml: string) {
    const previous = blocks.at(-1)
    if (previous?.type === 'content') previous.html += contentHtml
    else blocks.push({ type: 'content', html: contentHtml })
  }

  function addParagraph(paragraph: Element) {
    const frequency = matchSpellFrequencyLabel(paragraph.textContent ?? '')
    const body = frequency
      ? bodyAfterPrefix(paragraph, frequency.prefixLength, document)
      : ''

    if (!frequency || !body.trim()) {
      addContent(serializeNode(paragraph, document))
      return
    }

    const group = { label: frequency.label, html: body }
    const previous = blocks.at(-1)
    if (previous?.type === 'spells') previous.groups.push(group)
    else blocks.push({ type: 'spells', groups: [group] })
  }

  function visit(nodes: NodeListOf<ChildNode>) {
    for (const node of Array.from(nodes)) {
      if (node.nodeType === 3 && !(node.textContent ?? '').trim()) {
        // Отступы исходного HTML не разбивают соседние группы заклинаний.
        if (blocks.at(-1)?.type === 'content') addContent(serializeNode(node, document))
        continue
      }
      if (node.nodeType === 1) {
        const element = node as Element
        // DIV не имеет собственной семантики в RichContent и часто оборачивает датасет.
        if (element.tagName === 'DIV') visit(element.childNodes)
        else if (element.tagName === 'P') {
          splitParagraphLines(element, document).forEach(addParagraph)
        } else addContent(serializeNode(node, document))
      } else addContent(serializeNode(node, document))
    }
  }

  visit(document.body.childNodes)
  return blocks.length ? blocks : [{ type: 'content', html }]
}
