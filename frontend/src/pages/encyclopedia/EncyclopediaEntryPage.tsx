import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, Panel } from '../../shared/ui'
import { recordVisit } from '../../entities/encyclopedia'
import { entryPath, fetchEncyclopedia } from './encyclopediaApi'
import type { EncyclopediaEntry } from './encyclopediaApi'
import { typeLabel } from './encyclopediaSections'
import styles from './EncyclopediaPage.module.css'

export default function EncyclopediaEntryPage() {
  const { id = '' } = useParams()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{ id: string; entry?: EncyclopediaEntry; error?: string } | null>(null)
  const current = state?.id === id ? state : null
  useEffect(() => {
    const controller = new AbortController()
    fetchEncyclopedia<EncyclopediaEntry>(`${encodeURIComponent(id)}/`, controller.signal)
      .then((entry) => {
        if (controller.signal.aborted) return
        setState({ id, entry })
        recordVisit({ path: entryPath(entry), title: entry.name, category: typeLabel(entry.entity_type) })
      })
      .catch(() => { if (!controller.signal.aborted) setState({ id, error: 'Не удалось открыть материал. Он недоступен или соединение прервано.' }) })
    return () => controller.abort()
  }, [id, attempt])
  return <main className={styles.page}><div className={styles.container}>
    <Link className={styles.back} to="/encyclopedia">← Энциклопедия</Link>
    {!current && <p role="status">Загружаем материал…</p>}
    {current?.error && <div role="alert"><p>{current.error}</p><Button size="md" variant="secondary" onClick={() => { setState(null); setAttempt((value) => value + 1) }}>Повторить</Button></div>}
    {current?.entry && <>
      <header className={styles.intro}><h1>{current.entry.name}</h1><p>{typeLabel(current.entry.entity_type)}{current.entry.name_en ? ` · ${current.entry.name_en}` : ''}</p></header>
      <Panel padding="normal" className={styles.article}><div className={styles.articleText}>{current.entry.content_text || 'Описание пока не добавлено.'}</div></Panel>
    </>}
  </div></main>
}
