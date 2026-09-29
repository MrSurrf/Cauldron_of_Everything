import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Panel, PlaceholderIcon } from '../../shared/ui'
import { encyclopediaSections, sectionPath, typeLabel } from './encyclopediaSections'
import { EncyclopediaSectionIcon } from './EncyclopediaSectionIcon'
import { entryPath, fetchEncyclopedia } from './encyclopediaApi'
import type { EncyclopediaEntry } from './encyclopediaApi'
import styles from './EncyclopediaPage.module.css'

type ResultPage = { count: number; results: EncyclopediaEntry[] }

export function EncyclopediaResults({ query = '', type }: { query?: string; type?: string }) {
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{ request: string; data?: ResultPage; error?: string } | null>(null)
  const request = `${query}:${type ?? ''}:${page}:${attempt}`
  const current = state?.request === request ? state : null
  const sections = type ? [] : encyclopediaSections.filter((section) => `${section.title} ${section.description}`.toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru')))

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams({ page: String(page), page_size: '24' })
      if (query) params.set('q', query)
      if (type) params.set('type', type)
      fetchEncyclopedia<ResultPage>(`?${params}`, controller.signal)
        .then((data) => { if (!controller.signal.aborted) setState({ request, data }) })
        .catch(() => { if (!controller.signal.aborted) setState({ request, error: 'Не удалось загрузить материалы. Проверьте соединение и повторите попытку.' }) })
    }, query ? 250 : 0)
    return () => { window.clearTimeout(timeout); controller.abort() }
  }, [page, query, request, type])

  return (
    <>
      {sections.length > 0 && <div className={styles.resultGrid}>
        {sections.map((section) => <Link className={styles.cardLink} to={sectionPath(section)} key={section.id}>
          <Panel className={styles.card} padding="compact"><div className={styles.cardContent}><EncyclopediaSectionIcon sectionId={section.id} /><div className={styles.cardCopy}><h3>{section.title}</h3><p>Раздел энциклопедии</p></div></div></Panel>
        </Link>)}
      </div>}
      {!current && <p role="status">Ищем материалы…</p>}
      {current?.error && <div role="alert"><p>{current.error}</p><Button size="md" variant="secondary" onClick={() => setAttempt((value) => value + 1)}>Повторить</Button></div>}
      {current?.data && <>
        <p role="status">Найдено материалов: {current.data.count}</p>
        {current.data.count === 0 && <p className={styles.empty}>Материалы не найдены. Попробуйте другое название.</p>}
        <div className={styles.resultGrid}>
          {current.data.results.map((entry) => <Link className={styles.cardLink} to={entryPath(entry)} key={entry.id}>
            <Panel className={styles.card} padding="compact"><div className={styles.cardContent}><PlaceholderIcon /><div className={styles.cardCopy}><h3>{entry.name}</h3><p>{typeLabel(entry.entity_type)}{entry.name_en ? ` · ${entry.name_en}` : ''}</p></div></div></Panel>
          </Link>)}
        </div>
      </>}
      {(page > 1 || (current?.data?.count ?? 0) > 24) && <div className={styles.pagination}>
        <Button size="md" variant="secondary" disabled={page === 1 || !current} onClick={() => setPage((value) => value - 1)}>Назад</Button>
        <span>Страница {page}</span>
        <Button size="md" variant="secondary" disabled={!current?.data || page * 24 >= current.data.count} onClick={() => setPage((value) => value + 1)}>Далее</Button>
      </div>}
    </>
  )
}
