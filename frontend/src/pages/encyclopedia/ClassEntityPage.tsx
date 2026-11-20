import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { ClassFullView, getClassBySlug } from '../../entities/character-class'
import type { ClassEntity } from '../../entities/character-class'
import { recordVisit } from '../../entities/encyclopedia'
import { Button } from '../../shared/ui'
import styles from './ClassEntityPage.module.css'

type PageState = { slug: string; entity?: ClassEntity | null; error?: string }

export default function ClassEntityPage() {
  const { slug = '' } = useParams()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<PageState | null>(null)
  const current = state?.slug === slug ? state : null
  useEffect(() => {
    const controller = new AbortController()
    getClassBySlug(slug, controller.signal).then(entity => {
      if (controller.signal.aborted) return
      setState({ slug, entity })
      if (entity) recordVisit({ path: `/encyclopedia/class/${encodeURIComponent(slug)}`, title: entity.name, category: 'Классы' })
    }).catch(() => {
      if (!controller.signal.aborted) setState({ slug, error: 'Не удалось загрузить класс. Проверьте соединение и попробуйте ещё раз.' })
    })
    return () => controller.abort()
  }, [slug, attempt])

  return <main className={styles.page}>
    {current?.entity ? <ClassFullView key={current.entity.id} entity={current.entity} /> : <section className={styles.status}>
      <Link to="/encyclopedia/classes">← Все классы</Link>
      {!current && <h1 role="status">Загружаем класс…</h1>}
      {current?.error && <div role="alert"><h1>Не удалось открыть класс</h1><p>{current.error}</p><Button size="md" variant="secondary" decoration="bare" icon={null} onClick={() => { setState(null); setAttempt(value => value + 1) }}>Повторить</Button></div>}
      {current && !current.error && !current.entity && <h1>Класс не найден</h1>}
    </section>}
  </main>
}
