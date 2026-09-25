import { CreatureFullView, mockTarrasque } from '../../entities/creature'
import styles from './BestiaryEntityPage.module.css'

export default function MockTarrasquePage() {
  return (
    <main className={styles.page}>
      <CreatureFullView entity={mockTarrasque} />
    </main>
  )
}
