import type { CSSProperties } from 'react'
import { PlaceholderIcon } from '../../shared/ui'
import bestiaryUrl from './assets/Bestiariy.svg?url&no-inline'
import classesUrl from './assets/Classes.svg?url&no-inline'
import racesUrl from './assets/Kind.svg?url&no-inline'
import spellsUrl from './assets/Spells.svg?url&no-inline'
import itemsUrl from './assets/Items.svg?url&no-inline'
import styles from './EncyclopediaSectionIcon.module.css'

const iconUrls: Record<string, string> = {
  bestiary: bestiaryUrl,
  classes: classesUrl,
  races: racesUrl,
  spells: spellsUrl,
  items: itemsUrl,
}

type IconStyle = CSSProperties & { '--section-icon-url': string }

export function EncyclopediaSectionIcon({ sectionId }: { sectionId: string }) {
  const url = iconUrls[sectionId]
  if (!url) return <PlaceholderIcon />

  return <span
    className={styles.icon}
    style={{ '--section-icon-url': `url("${url}")` } as IconStyle}
    aria-hidden="true"
  />
}
