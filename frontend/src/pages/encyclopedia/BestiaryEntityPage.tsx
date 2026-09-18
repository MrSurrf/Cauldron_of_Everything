import { useParams } from 'react-router-dom'

import {
  CreatureFullView,
  getCreatureBySlug,
} from '../../entities/creature'
import styles from './BestiaryEntityPage.module.css'

export default function BestiaryEntityPage() {
  const { slug = '' } = useParams()
  const entity = getCreatureBySlug(slug)

  if (!entity) {
    return (
      <main className={styles.page}>
        <section className={styles.notFound}>
          <p>Бестиарий</p>
          <h1>Существо не найдено</h1>
          <a href="/">Вернуться к опроснику</a>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <CreatureFullView entity={entity} />
    </main>
  )
}
