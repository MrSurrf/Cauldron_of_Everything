import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  CreatureFullView,
  getCreatureBySlug,
} from '../../entities/creature'
import type { CreatureEntity } from '../../entities/creature'
import styles from './BestiaryEntityPage.module.css'

type PageState =
  | { status: 'loading'; slug: string }
  | { status: 'ready'; slug: string; entity: CreatureEntity }
  | { status: 'not-found'; slug: string }
  | { status: 'error'; slug: string; message: string }

export default function BestiaryEntityPage() {
  const { slug = '' } = useParams()
  const [requestVersion, setRequestVersion] = useState(0)
  const [state, setState] = useState<PageState>({ status: 'loading', slug })

  useEffect(() => {
    const controller = new AbortController()

    getCreatureBySlug(slug, controller.signal)
      .then((entity) => {
        setState(entity
          ? { status: 'ready', slug, entity }
          : { status: 'not-found', slug })
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return

        setState({
          status: 'error',
          slug,
          message: error instanceof Error
            ? error.message
            : 'Неизвестная ошибка загрузки',
        })
      })

    return () => controller.abort()
  }, [requestVersion, slug])

  const currentState: PageState = state.slug === slug
    ? state
    : { status: 'loading', slug }

  if (currentState.status === 'loading') {
    return (
      <main className={styles.page}>
        <section className={styles.status} role="status">
          <p>Бестиарий</p>
          <h1>Загружаем существо…</h1>
        </section>
      </main>
    )
  }

  if (currentState.status === 'not-found') {
    return (
      <main className={styles.page}>
        <section className={styles.notFound}>
          <p>Бестиарий</p>
          <h1>Существо не найдено</h1>
          <Link to="/encyclopedia/bestiary">Вернуться в бестиарий</Link>
        </section>
      </main>
    )
  }

  if (currentState.status === 'error') {
    return (
      <main className={styles.page}>
        <section className={styles.status} role="alert">
          <p>Бестиарий</p>
          <h1>Не удалось загрузить существо</h1>
          <span>{currentState.message}</span>
          <button
            className={styles.retry}
            type="button"
            onClick={() => {
              setState({ status: 'loading', slug })
              setRequestVersion((version) => version + 1)
            }}
          >
            Повторить
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <CreatureFullView entity={currentState.entity} />
    </main>
  )
}
