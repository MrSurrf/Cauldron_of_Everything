import { useEffect } from 'react'
import { recordVisit } from '../../entities/encyclopedia'
import { CreatureFullView, mockTarrasque } from '../../entities/creature'
import styles from './BestiaryEntityPage.module.css'

export default function MockTarrasquePage() {
  useEffect(() => {
    recordVisit({ path: '/encyclopedia/bestiary/tarrasque', title: mockTarrasque.name, category: 'Бестиарий' })
  }, [])
  return (
    <main className={styles.page}>
      <CreatureFullView entity={mockTarrasque} />
    </main>
  )
}
