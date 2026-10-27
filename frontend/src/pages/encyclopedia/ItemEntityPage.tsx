import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { recordVisit } from '../../entities/encyclopedia'
import { getItemBySlug, ItemFullView } from '../../entities/item'
import type { ItemEntity } from '../../entities/item'
import styles from './ItemEntityPage.module.css'

type PageState =
  | { status: 'loading'; slug: string }
  | { status: 'ready'; slug: string; entity: ItemEntity }
  | { status: 'not-found'; slug: string }
  | { status: 'error'; slug: string; message: string }

export default function ItemEntityPage() {
  const { slug = '' } = useParams()
  const [requestVersion, setRequestVersion] = useState(0)
  const [state, setState] = useState<PageState>({ status: 'loading', slug })

  useEffect(() => {
    const controller = new AbortController()
    getItemBySlug(slug, controller.signal)
      .then((entity) => {
        if (controller.signal.aborted) return
        if (entity) {
          recordVisit({
            path: `/encyclopedia/item/${encodeURIComponent(slug)}`,
            title: entity.name,
            category: 'Магические предметы',
          })
        }
        setState(entity ? { status: 'ready', slug, entity } : { status: 'not-found', slug })
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setState({
          status: 'error',
          slug,
          message: error instanceof Error ? error.message : 'Неизвестная ошибка загрузки',
        })
      })
    return () => controller.abort()
  }, [requestVersion, slug])

  const current: PageState = state.slug === slug ? state : { status: 'loading', slug }

  if (current.status === 'loading') {
    return <main className={styles.page}><section className={styles.status} role="status"><p>Магические предметы</p><h1>Загружаем предмет…</h1></section></main>
  }
  if (current.status === 'not-found') {
    return <main className={styles.page}><section className={styles.status}><p>Магические предметы</p><h1>Предмет не найден</h1><Link to="/encyclopedia/items">Вернуться к предметам</Link></section></main>
  }
  if (current.status === 'error') {
    return <main className={styles.page}><section className={styles.status} role="alert"><p>Магические предметы</p><h1>Не удалось загрузить предмет</h1><span>{current.message}</span><button type="button" onClick={() => { setState({ status: 'loading', slug }); setRequestVersion((version) => version + 1) }}>Повторить</button></section></main>
  }

  return <main className={styles.page}><ItemFullView entity={current.entity} /></main>
}
