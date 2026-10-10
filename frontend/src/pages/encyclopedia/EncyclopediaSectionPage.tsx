import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Panel } from '../../shared/ui'
import { recordVisit } from '../../entities/encyclopedia'
import { encyclopediaSections, sectionPath } from './encyclopediaSections'
import { EncyclopediaResults } from './EncyclopediaResults'
import styles from './EncyclopediaPage.module.css'

export default function EncyclopediaSectionPage() {
  const { sectionId } = useParams()
  const section = encyclopediaSections.find((entry) => entry.id === sectionId)
  useEffect(() => {
    if (section) recordVisit({ path: sectionPath(section), title: section.title, category: 'Раздел энциклопедии' })
  }, [section])

  return <main className={styles.page}><div className={styles.container}>
    <Link className={styles.back} to="/encyclopedia">← Энциклопедия</Link>
    <header className={styles.intro}><h1>{section?.title ?? 'Раздел не найден'}</h1><p>{section?.description}</p></header>
    {section?.type ? <EncyclopediaResults key={section.type} type={section.type} /> : section && (
      <Panel padding="normal"><h2>Материалы готовятся</h2><p className={styles.empty}>В этом разделе пока нет опубликованных материалов.</p></Panel>
    )}
  </div></main>
}
