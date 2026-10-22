import Markdown, { defaultUrlTransform } from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { PhrasingContent, Root, RootContent } from 'mdast'

import { BookIcon, Checkbox, ListCard } from '../../../shared/ui'
import type { ArticleDraft, ArticleEntity } from '../model'
import { ArticlePhoto } from './ArticleImages'
import styles from './ArticlePreview.module.css'

const IMAGE_URL = /^article-image:([a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})$/i
const ENTITY_URL = /^entity:([1-9]\d*)$/
const ENTITY_NAMES: Record<string, string> = {
  spell: 'Заклинание', item: 'Предмет', creature: 'Существо', class: 'Класс',
  race: 'Раса', feat: 'Черта', background: 'Предыстория', sidekick: 'Спутник',
}

/** Подчёркивание — только точная пара токенов toolbar, без разрешения произвольного HTML. */
function remarkUnderline() {
  function convert(children: PhrasingContent[]): PhrasingContent[] {
    const result: PhrasingContent[] = []
    for (let index = 0; index < children.length; index += 1) {
      const child = children[index]
      if (child.type !== 'html' || child.value !== '<u>') { result.push(child); continue }
      let depth = 1
      let end = index + 1
      for (; end < children.length; end += 1) {
        const token = children[end]
        if (token.type !== 'html') continue
        if (token.value === '<u>') depth += 1
        if (token.value === '</u>') depth -= 1
        if (!depth) break
      }
      if (depth) { result.push(child); continue }
      result.push({ type: 'emphasis', children: convert(children.slice(index + 1, end)), data: { hName: 'u' } })
      index = end
    }
    return result
  }

  return (tree: Root) => {
    function visit(node: Root | RootContent) {
      if (!('children' in node)) return
      for (const child of node.children) visit(child)
      if (['paragraph', 'heading', 'emphasis', 'strong', 'delete', 'link', 'linkReference', 'tableCell'].includes(node.type)) {
        const inline = node as { children: PhrasingContent[] }
        inline.children = convert(inline.children)
      }
    }
    visit(tree)
  }
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
}

function entityTags(entity: ArticleEntity): string[] {
  const level = entity.type === 'spell' && entity.summary.level !== undefined
    ? Number(entity.summary.level) === 0 ? 'Заговор' : `${text(entity.summary.level)}-й уровень`
    : ''
  return [ENTITY_NAMES[entity.type] ?? 'Энциклопедия', level,
    text(entity.summary.school ?? entity.summary.rarity ?? entity.summary.challenge_rating), entity.nameEn].filter(Boolean)
}

function transformUrl(url: string) {
  if (IMAGE_URL.test(url)) return url
  const entity = ENTITY_URL.exec(url)
  if (entity && Number.isSafeInteger(Number(entity[1]))) return url
  return defaultUrlTransform(url)
}

function EntityCard({ entity }: { entity: ArticleEntity }) {
  return <a href={`/encyclopedia/entry/${entity.id}`} target="_blank" rel="noopener noreferrer"
    className={styles.entityCard} aria-label={`Открыть в энциклопедии: ${entity.name}`}>
    <ListCard appearance="navigation" icon={<BookIcon />} name={entity.name} tags={entityTags(entity)} />
  </a>
}

export function ArticlePreview({ draft }: { draft: ArticleDraft }) {
  const cover = draft.images.find((image) => image.id === draft.coverImageId)
  const entityByUrl = (url: string) => {
    const match = ENTITY_URL.exec(url)
    return match ? draft.entities.find((entity) => entity.id === Number(match[1])) : undefined
  }
  const components: Components = {
    input({ type, checked }) {
      return type === 'checkbox'
        ? <Checkbox checked={Boolean(checked)} disabled rootClassName={styles.taskMarker}
          aria-label={checked ? 'Выполненный пункт списка' : 'Невыполненный пункт списка'} />
        : null
    },
    p({ children, node }) {
      const meaningfulChildren = node?.children.filter((child) => child.type !== 'text' || child.value.trim()) ?? []
      const onlyChild = meaningfulChildren.length === 1 ? meaningfulChildren[0] : undefined
      if (onlyChild?.type === 'element' && onlyChild.tagName === 'a') {
        const href = String(onlyChild.properties.href ?? '')
        if (ENTITY_URL.test(href)) {
          const entity = entityByUrl(href)
          return entity
            ? <div className={styles.entityParagraph}><EntityCard entity={entity} /></div>
            : <div className={styles.placeholder} role="note">Карточка сущности не найдена в этом черновике.</div>
        }
      }
      return <p>{children}</p>
    },
    a({ href, children }) {
      if (!href) return <span className={styles.blockedLink}>{children}</span>
      if (ENTITY_URL.test(href)) {
        const entity = entityByUrl(href)
        return entity
          ? <a href={`/encyclopedia/entry/${entity.id}`} target="_blank" rel="noopener noreferrer"
            className={styles.inlineEntity}><BookIcon aria-hidden="true" />{entity.name}</a>
          : <span className={styles.blockedLink} title="Сущность отсутствует в черновике">{children} (карточка недоступна)</span>
      }
      const external = /^(?:https?:)?\/\//i.test(href)
      return <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>{children}</a>
    },
    img({ src, alt }) {
      const imageId = typeof src === 'string' ? IMAGE_URL.exec(src)?.[1] : undefined
      if (imageId) {
        const image = draft.images.find((item) => item.id === imageId)
        return image
          ? <span className={styles.figure}><ArticlePhoto image={image} className={styles.photo} />
            {image.caption && <span className={styles.caption}>{image.caption}</span>}</span>
          : <span className={styles.placeholder} role="note">Изображение не найдено в этом черновике{alt ? `: ${alt}` : '.'}</span>
      }
      // Произвольные удалённые изображения не загружаются: фотографии статьи хранятся локально.
      return <span className={styles.placeholder} role="note">{alt ? `Изображение «${alt}»` : 'Изображение'}: добавьте фотографию через панель «Изображения».</span>
    },
    table({ children }) {
      return <div className={styles.tableScroll}><table>{children}</table></div>
    },
  }

  return <article className={styles.preview} aria-label="Предпросмотр статьи" data-article-preview>
    <header className={styles.header}>
      <span className={styles.eyebrow}>Предпросмотр · статья</span>
      <h1>{draft.title.trim() || 'Без названия'}</h1>
      {draft.description.trim() && <p className={styles.description}>{draft.description}</p>}
    </header>
    {cover && <figure className={styles.figure}><ArticlePhoto image={cover} className={styles.photo} />
      {cover.caption && <figcaption>{cover.caption}</figcaption>}</figure>}
    {draft.markdown.trim()
      ? <Markdown remarkPlugins={[remarkGfm, remarkUnderline]} skipHtml urlTransform={transformUrl} components={components}>{draft.markdown}</Markdown>
      : <p className={styles.empty}>Здесь появится ваша статья. Переключитесь в Markdown, чтобы начать писать.</p>}
  </article>
}
