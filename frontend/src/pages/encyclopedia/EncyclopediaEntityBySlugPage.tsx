import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { fetchEncyclopedia } from '../../entities/encyclopedia'
import type { EncyclopediaEntry } from '../../entities/encyclopedia'
import { Button } from '../../shared/ui'
import { RichContent } from '../../shared/ui/RichContent'
import styles from './EncyclopediaEntityBySlugPage.module.css'

type PageState =
  | { status: 'loading' }
  | { status: 'ready'; entry: EncyclopediaEntry }
  | { status: 'not-found' }
  | { status: 'error'; message: string }

const typeLabels: Record<string, string> = {
  spell: 'Заклинание',
  class: 'Класс',
  race: 'Раса',
  background: 'Предыстория',
  feat: 'Черта',
  sidekick: 'Напарник',
  creature: 'Существо',
  item: 'Предмет',
}

const catalogPaths: Record<string, string> = {
  spell: '/encyclopedia/spells',
  class: '/encyclopedia/classes',
  race: '/encyclopedia/classes',
  background: '/encyclopedia/backgrounds',
  feat: '/encyclopedia',
  sidekick: '/encyclopedia/classes',
  creature: '/encyclopedia/bestiary',
  item: '/encyclopedia/items',
}

function typeLabel(type: string): string {
  return typeLabels[type] || type
}

function catalogPath(type: string): string {
  return catalogPaths[type] || '/encyclopedia'
}

function formatSources(sources: unknown): string[] {
  if (!Array.isArray(sources)) return []
  return sources
    .map((source) => {
      if (typeof source === 'string') return source
      if (source && typeof source === 'object' && 'name' in source) {
        return String((source as { name?: unknown }).name ?? '')
      }
      return String(source)
    })
    .filter(Boolean)
}

export default function EncyclopediaEntityBySlugPage() {
  const { type = '', slug = '' } = useParams()
  const [requestVersion, setRequestVersion] = useState(0)
  const [state, setState] = useState<PageState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    fetchEncyclopedia<{ count: number; results: EncyclopediaEntry[] }>(
      `?type=${encodeURIComponent(type)}&slug=${encodeURIComponent(slug)}&page_size=1`,
      controller.signal,
    )
      .then((list) => {
        if (controller.signal.aborted) return
        if (list.count === 0 || list.results.length === 0) {
          setState({ status: 'not-found' })
          return
        }
        return fetchEncyclopedia<EncyclopediaEntry>(
          `${list.results[0].id}/`,
          controller.signal,
        )
      })
      .then((entry) => {
        if (!entry) return
        if (controller.signal.aborted) return
        setState({ status: 'ready', entry })
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setState({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Не удалось загрузить материал.',
        })
      })

    return () => controller.abort()
  }, [type, slug, requestVersion])

  if (state.status === 'loading') {
    return (
      <main className={styles.page}>
        <div className={`${styles.container} ${styles.status}`} role="status">
          <p>Энциклопедия</p>
          <h1>Загружаем материал…</h1>
        </div>
      </main>
    )
  }

  if (state.status === 'not-found') {
    return (
      <main className={styles.page}>
        <div className={`${styles.container} ${styles.status}`}>
          <p>Энциклопедия</p>
          <h1>Материал не найден</h1>
          <Link to={catalogPath(type)}>Вернуться в раздел</Link>
        </div>
      </main>
    )
  }

  if (state.status === 'error') {
    return (
      <main className={styles.page}>
        <div className={`${styles.container} ${styles.status}`} role="alert">
          <p>Энциклопедия</p>
          <h1>Не удалось загрузить материал</h1>
          <p>{state.message}</p>
          <Button
            className={styles.retry}
            size="md"
            variant="secondary"
            onClick={() => setRequestVersion((v) => v + 1)}
          >
            Повторить
          </Button>
        </div>
      </main>
    )
  }

  const entry = state.entry
  if (entry.entity_type !== type || entry.slug !== slug) {
    return (
      <main className={styles.page}>
        <div className={`${styles.container} ${styles.status}`} role="status">
          <p>Энциклопедия</p>
          <h1>Загружаем материал…</h1>
        </div>
      </main>
    )
  }

  const html =
    entry.content_html ||
    (entry.content_text
      ? `<p>${entry.content_text.replace(/\n{2,}/g, '</p><p>')}</p>`
      : '<p>Описание пока не добавлено.</p>')

  return (
    <main className={styles.page}>
      <article className={styles.container}>
        <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
          <Link to="/encyclopedia">⌂ Энциклопедия</Link>
          <span aria-hidden="true">›</span>
          <Link to={catalogPath(entry.entity_type)}>{typeLabel(entry.entity_type)}</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{entry.name}</span>
        </nav>

        <header>
          <h1 className={styles.title}>{entry.name}</h1>
          {entry.name_en && <p className={styles.english}>[{entry.name_en}]</p>}
          <p className={styles.meta}>{typeLabel(entry.entity_type)}</p>
        </header>

        <div className={styles.body}>
          <RichContent html={html} />
        </div>

        {formatSources(entry.sources).length > 0 && (
          <footer className={styles.sources}>
            <span>Источники</span>
            <p>{formatSources(entry.sources).join(' · ')}</p>
          </footer>
        )}
      </article>
    </main>
  )
}
