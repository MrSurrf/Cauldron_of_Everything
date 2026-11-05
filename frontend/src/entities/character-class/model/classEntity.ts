export type ClassTableCell = { html: string; colSpan: number; rowSpan: number; header: boolean }
export type ClassTable = { id: string; title?: string; headers: ClassTableCell[][]; rows: ClassTableCell[][] }
export type ClassContentBlock = { type: 'html'; html: string } | { type: 'table'; table: ClassTable }
export type ClassSection = {
  id: string
  title: string
  level: number
  blocks: ClassContentBlock[]
  children: ClassSection[]
  aliases: string[]
}
export type ClassEntity = {
  id: number
  slug: string
  name: string
  nameEn: string
  sources: string[]
  hitDie: string
  intro: ClassContentBlock[]
  sections: ClassSection[]
  progression?: ClassTable
}
export type EncyclopediaClassDetail = {
  id: number
  entity_type: string
  slug: string
  name: string
  name_en?: string
  sources?: unknown
  content_html?: string
  content_text?: string
  data?: unknown
}

type JsonRecord = Record<string, unknown>
const headingSelector = 'h2,h3,h4,h5,h6'
const structuralTags = new Set(['DIV', 'SECTION', 'ARTICLE', 'MAIN', 'DETAILS'])
const unsafeTags = 'script,style,iframe,object,embed,svg,math,form,input,button,select,textarea,nav,menu,noscript,template,link,meta'
const sourceControls = '.new-article-menu,.article-menu,.article_menu,.content-switch,.spoiler_neck,.copy-link,.share-buttons,.social-buttons,.back-to-top'
const inlineTags = new Set(['A', 'ABBR', 'B', 'BLOCKQUOTE', 'BR', 'CODE', 'DD', 'DEL', 'DL', 'DT', 'EM', 'HR', 'I', 'KBD', 'LI', 'OL', 'P', 'PRE', 'S', 'SMALL', 'SPAN', 'STRONG', 'SUB', 'SUP', 'U', 'UL'])

function record(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
}

function field(value: JsonRecord, ...keys: string[]): unknown {
  return keys.map(key => value[key]).find(item => item !== undefined && item !== null)
}

function labels(value: unknown): string[] {
  if (Array.isArray(value)) return [...new Set(value.flatMap(labels))]
  if (record(value)) return labels(field(value, 'name', 'title', 'label', 'source', 'book'))
  const label = text(value)
  return label ? [label] : []
}

function escaped(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function aliasesOf(element: Element): string[] {
  return [...new Set([element.id, ...Array.from(element.querySelectorAll('[id]'), child => child.id)].filter(Boolean))]
}

function decoded(value: string): string {
  try { return decodeURIComponent(value) } catch { return value }
}

function span(value: unknown, zero = false): number {
  const number = Number(value)
  return Number.isInteger(number) && number >= (zero ? 0 : 1) ? Math.min(number, 1000) : 1
}

/** Браузерная модель: исходная вёрстка не становится исполняемым UI приложения. */
export function toClassEntity(detail: EncyclopediaClassDetail): ClassEntity {
  const parser = new DOMParser()
  const parse = (html: string) => parser.parseFromString(html, 'text/html').body
  const data = record(detail.data) ? detail.data : {}
  const entity: ClassEntity = {
    id: detail.id, slug: detail.slug, name: detail.name, nameEn: detail.name_en ?? '',
    sources: labels(detail.sources), hitDie: text(field(data, 'hit_die', 'hit_dice')),
    intro: [], sections: [],
  }
  const usedIds = new Set<string>()
  const targets = new Map<string, string>()
  const knownSections = new Map<string, ClassSection>()
  const seenBlocks = new Set<string>()
  const seenTables = new Set<string>()
  let stack: ClassSection[] = []
  let pendingTitle: { title: string; aliases: string[] } | undefined
  let pendingAliases: string[] = []
  let lastHeading: ClassSection | undefined

  function idFor(label: string, fallback: string) {
    const slug = label.toLocaleLowerCase('ru-RU').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 80) || fallback
    const base = `class-${detail.id}-${slug}`
    let id = base
    let suffix = 2
    while (usedIds.has(id)) id = `${base}-${suffix++}`
    usedIds.add(id)
    return id
  }

  function bind(aliases: string[], id: string) {
    targets.set(id, id)
    for (const alias of aliases) if (!targets.has(alias)) targets.set(alias, id)
  }

  function signature(html: string): string {
    return (parse(html).textContent ?? '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('ru-RU')
  }

  function clean(element: Node): string {
    const holder = parse('')
    holder.append(element.cloneNode(true))
    holder.querySelectorAll(`${unsafeTags},${sourceControls}`).forEach(node => node.remove())
    holder.querySelectorAll('td,th').forEach(cell => {
      if (cell.querySelector('.long')) cell.querySelectorAll('.short').forEach(node => node.remove())
    })
    for (const node of Array.from(holder.querySelectorAll('*')).reverse()) {
      if (!inlineTags.has(node.tagName)) { node.replaceWith(...node.childNodes); continue }
      const href = node.tagName === 'A' ? node.getAttribute('href')?.trim() : undefined
      for (const attribute of Array.from(node.attributes)) node.removeAttribute(attribute.name)
      if (href && /^(?:https?:|mailto:|\/|#)/i.test(href)) node.setAttribute('href', href)
    }
    return holder.innerHTML.trim()
  }

  function blocks(): ClassContentBlock[] { return stack.at(-1)?.blocks ?? entity.intro }

  function appendHtml(html: string, fallback = false) {
    const key = signature(html)
    if (!key || (fallback && (seenBlocks.has(key) || originalText.includes(key)))) return
    lastHeading = undefined
    seenBlocks.add(key)
    const destination = blocks()
    const previous = destination.at(-1)
    if (previous?.type === 'html') previous.html += `\n${html}`
    else destination.push({ type: 'html', html })
  }

  function section(title: string, level: number, aliases: string[], scopeDepth = 0): ClassSection {
    while (stack.length > scopeDepth && stack.at(-1)!.level >= level) stack.pop()
    const allAliases = [...new Set([...pendingAliases, ...aliases])]
    pendingAliases = []
    const next: ClassSection = { id: idFor(allAliases[0] || title, 'section'), title, level, blocks: [], children: [], aliases: allAliases }
    const parent = stack.at(-1)
    ;(parent ? parent.children : entity.sections).push(next)
    stack.push(next)
    lastHeading = next
    bind(allAliases, next.id)
    for (const alias of allAliases) knownSections.set(alias, next)
    if (!knownSections.has(title.toLocaleLowerCase('ru-RU'))) knownSections.set(title.toLocaleLowerCase('ru-RU'), next)
    return next
  }

  function progression(table: ClassTable): boolean {
    const levels = table.rows.map(row => {
      const value = signature(row[0]?.html ?? '')
      const match = value.match(/^(?:уровень\s*)?(\d{1,2})(?:\s*[-–]?(?:й|ый|ой|st|nd|rd|th))?(?:\s*(?:уровень|level))?$/i)
      return match ? Number(match[1]) : null
    })
    return levels.length === 20 && levels.every((value, index) => value === index + 1)
  }

  function appendTable(table: ClassTable, aliases: string[]) {
    const key = JSON.stringify([table.headers, table.rows].map(rows => rows.map(row => row.map(cell => [signature(cell.html), cell.colSpan, cell.rowSpan]))))
    if (seenTables.has(key)) return
    seenTables.add(key)
    if (!entity.progression && progression(table) && lastHeading && stack.at(-1) === lastHeading
      && lastHeading.blocks.length === 0 && lastHeading.children.length === 0) {
      const heading = lastHeading
      const parent = stack.at(-2)
      const siblings = parent?.children ?? entity.sections
      const index = siblings.indexOf(heading)
      if (index >= 0) siblings.splice(index, 1)
      stack.pop()
      aliases.push(...heading.aliases, heading.id)
      table.id = heading.id
      table.title ||= heading.title
      for (const [key, current] of knownSections) if (current === heading) knownSections.delete(key)
    }
    bind([...pendingAliases, ...aliases], table.id)
    pendingAliases = []
    if (!entity.progression && progression(table)) entity.progression = table
    else blocks().push({ type: 'table', table })
    lastHeading = undefined
  }

  function htmlTable(element: HTMLTableElement) {
    const aliases = [...(pendingTitle?.aliases ?? []), element.id].filter(Boolean)
    const title = pendingTitle?.title || element.caption?.textContent?.trim() || undefined
    pendingTitle = undefined
    const table: ClassTable = { id: idFor(aliases[0] || title || 'table', 'table'), ...(title ? { title } : {}), headers: [], rows: [] }
    for (const row of Array.from(element.rows)) {
      if (row.closest('table') !== element) continue
      const heading = row.parentElement?.tagName === 'THEAD' || row.classList.contains('table_header')
        || row.classList.contains('table-header') || Array.from(row.cells).every(cell => cell.tagName === 'TH')
        || (table.rows.length === 0 && /^\s*(?:уровень|level)\s*$/i.test(row.cells[0]?.textContent ?? ''))
      const cells = Array.from(row.cells, cell => {
        const clone = cell.cloneNode(true) as HTMLElement
        if (clone.querySelector('.long')) clone.querySelectorAll('.short').forEach(node => node.remove())
        return { html: clean(clone), colSpan: span(cell.getAttribute('colspan')), rowSpan: cell.hasAttribute('rowspan') ? span(cell.getAttribute('rowspan'), true) : 1, header: heading || cell.tagName === 'TH' }
      })
      if (cells.length) (heading ? table.headers : table.rows).push(cells)
    }
    if (table.headers.length || table.rows.length) appendTable(table, aliases)
  }

  function walk(node: Node, fallback = false, minimumLevel = 2, scopeDepth = 0) {
    if (node.nodeType === Node.TEXT_NODE) { if (node.textContent?.trim()) appendHtml(escaped(node.textContent), fallback); return }
    if (!(node instanceof Element) || node.matches(`${unsafeTags},${sourceControls}`)) return
    if (node.tagName === 'DETAILS') {
      const previous = stack.slice()
      const summary = Array.from(node.children).find(child => child.tagName === 'SUMMARY')
      if (node.id) pendingAliases.push(node.id)
      const title = summary?.textContent?.replace(/\s+/g, ' ').trim()
      if (summary && title) {
        const level = Math.min(6, Math.max(minimumLevel, (previous.at(-1)?.level ?? 1) + 1))
        section(title, level, aliasesOf(summary), scopeDepth)
        const depth = stack.length
        for (const child of Array.from(node.childNodes)) if (child !== summary) walk(child, fallback, Math.min(6, level + 1), depth)
      } else {
        for (const child of Array.from(node.childNodes)) walk(child, fallback, minimumLevel, scopeDepth)
      }
      stack = previous
      lastHeading = undefined
      return
    }
    if (node.matches(headingSelector) || node.tagName === 'SUMMARY') {
      const title = (node.textContent ?? '').replace(/\s+/g, ' ').trim()
      if (!title) return
      const aliases = aliasesOf(node)
      if (node.classList.contains('tableTitle')) { pendingTitle = { title, aliases }; return }
      const level = node.tagName === 'SUMMARY' ? Math.min(6, Math.max(minimumLevel, (stack.at(-1)?.level ?? 1) + 1)) : Math.max(minimumLevel, Number(node.tagName[1]))
      section(title, level, aliases, scopeDepth)
      return
    }
    if (node.tagName === 'TABLE') { htmlTable(node as HTMLTableElement); return }
    if (structuralTags.has(node.tagName) || node.querySelector(`${headingSelector},table,details,summary`)) {
      if (node.id) pendingAliases.push(node.id)
      for (const child of Array.from(node.childNodes)) walk(child, fallback, minimumLevel, scopeDepth)
      return
    }
    appendHtml(clean(node), fallback)
  }

  const original = parse(detail.content_html ?? '')
  original.querySelectorAll(`${unsafeTags},${sourceControls}`).forEach(node => node.remove())
  const originalText = (original.textContent ?? '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('ru-RU')
  for (const child of Array.from(original.childNodes)) walk(child)

  function structuredEntries(value: unknown): unknown[] {
    if (Array.isArray(value)) return value
    if (record(value)) return Object.entries(value).map(([title, content]) => record(content) ? { title, ...content } : { title, html: text(content) })
    return []
  }

  function fallbackSection(value: unknown, parent?: ClassSection) {
    if (!record(value)) return
    const title = text(field(value, 'title', 'name', 'label', 'heading'))
    const html = text(field(value, 'html', 'content_html', 'description_html', 'content', 'description', 'text'))
    const children = structuredEntries(field(value, 'children', 'sections', 'subsections', 'features'))
    if (!title && !html && children.length === 0) return
    const aliases = labels(field(value, 'id', 'anchor', 'key'))
    const existing = aliases.map(alias => knownSections.get(alias)).find(Boolean) ?? knownSections.get(title.toLocaleLowerCase('ru-RU'))
    const previous = stack
    stack = parent ? [parent] : []
    const uniqueHtml = Boolean(html && signature(html) && !originalText.includes(signature(html)) && !seenBlocks.has(signature(html)))
    if (!existing && !uniqueHtml && children.length === 0) { stack = previous; return }
    const target = existing ?? (title ? section(title, parent ? Math.min(6, parent.level + 1) : 2, aliases) : undefined)
    if (target) stack = [target]
    if (uniqueHtml) for (const child of Array.from(parse(html).childNodes)) walk(child, true)
    for (const child of children) fallbackSection(child, target)
    stack = previous
  }

  for (const value of structuredEntries(data.sections)) fallbackSection(value)
  for (const value of structuredEntries(data.subclasses)) fallbackSection(value)
  for (const value of typeof data.interactive_blocks === 'string' ? [{ html: data.interactive_blocks }] : structuredEntries(data.interactive_blocks)) fallbackSection(value)
  for (const value of structuredEntries(data.tables)) {
    if (!record(value)) continue
    const html = text(field(value, 'html', 'content_html'))
    if (html) {
      const previous = stack; stack = []
      for (const child of Array.from(parse(html).childNodes)) walk(child, true)
      stack = previous
      continue
    }
    const rawRows = field(value, 'rows', 'data', 'values')
    if (!Array.isArray(rawRows)) continue
    const cell = (value: unknown, header = false): ClassTableCell => {
      const raw = record(value) ? text(field(value, 'html', 'text', 'value', 'content')) : text(value)
      return { html: clean(parse(raw).cloneNode(true)), colSpan: record(value) ? span(value.colSpan ?? value.colspan) : 1,
        rowSpan: record(value) && (value.rowSpan !== undefined || value.rowspan !== undefined) ? span(value.rowSpan ?? value.rowspan, true) : 1,
        header: header || (record(value) && value.header === true) }
    }
    const rawHeaders = field(value, 'headers', 'columns', 'headings')
    const headers = Array.isArray(rawHeaders) ? (Array.isArray(rawHeaders[0]) ? rawHeaders : [rawHeaders]).map(row => (row as unknown[]).map(value => cell(value, true))) : []
    const rows = rawRows.flatMap(row => Array.isArray(row) ? [row.map(value => cell(value))] : record(row) ? [Object.values(row).map(value => cell(value))] : [])
    const title = text(field(value, 'title', 'name', 'label'))
    const aliases = labels(value.id)
    const previous = stack; stack = []
    if (rows.length || headers.length) appendTable({ id: idFor(aliases[0] || title || 'table', 'table'), ...(title ? { title } : {}), headers, rows }, aliases)
    stack = previous
  }

  function pruneSections(sections: ClassSection[], parent?: ClassSection): ClassSection[] {
    for (const current of sections) current.children = pruneSections(current.children, current)
    const kept = sections.filter(current => current.blocks.length > 0 || current.children.length > 0)
    for (const current of sections) {
      if (kept.includes(current)) continue
      const index = sections.indexOf(current)
      const destination = sections.slice(index + 1).find(candidate => kept.includes(candidate)) ?? parent ?? kept[0]
      const destinationId = destination?.id ?? entity.progression?.id
      if (!destinationId) continue
      if (destination) destination.aliases.push(...current.aliases.filter(alias => !destination.aliases.includes(alias)))
      for (const [alias, target] of targets) if (target === current.id) targets.set(alias, destinationId)
      for (const alias of [...current.aliases, current.id]) targets.set(alias, destinationId)
    }
    return kept
  }
  entity.sections = pruneSections(entity.sections)
  if (entity.intro.length === 0 && entity.sections.length === 0 && !entity.progression && detail.content_text?.trim()) {
    stack = []
    for (const paragraph of detail.content_text.trim().split(/\n{2,}/)) appendHtml(`<p>${escaped(paragraph)}</p>`)
  }

  function rewrite(html: string): string {
    const body = parse(html)
    body.querySelectorAll('a[href^="#"]').forEach(anchor => {
      const alias = decoded(anchor.getAttribute('href')!.slice(1))
      const id = targets.get(alias)
      if (id) anchor.setAttribute('href', `#${id}`)
    })
    return body.innerHTML
  }
  function rewriteTable(table: ClassTable) {
    for (const row of [...table.headers, ...table.rows]) for (const cell of row) cell.html = rewrite(cell.html)
  }
  function rewriteBlocks(content: ClassContentBlock[]) {
    for (const block of content) {
      if (block.type === 'html') block.html = rewrite(block.html)
      else rewriteTable(block.table)
    }
  }
  function rewriteSections(sections: ClassSection[]) {
    for (const current of sections) { rewriteBlocks(current.blocks); rewriteSections(current.children) }
  }
  rewriteBlocks(entity.intro)
  rewriteSections(entity.sections)
  if (entity.progression) rewriteTable(entity.progression)
  return entity
}
