import type { CSSProperties } from 'react'
import { IconFrame, PlaceholderIcon } from '../../shared/ui'
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

export function EncyclopediaSectionIcon({ sectionId, variant = 'inline' }: {
  sectionId: string
  variant?: 'inline' | 'category'
}) {
  const url = iconUrls[sectionId]
  if (!url) return variant === 'category'
    ? <IconFrame size="4rem" contentSize="2.75rem" glow={false} aria-hidden="true"><PlaceholderIcon /></IconFrame>
    : <PlaceholderIcon />

  const icon = <span
    className={styles.icon}
    style={{ '--section-icon-url': `url("${url}")` } as IconStyle}
    aria-hidden="true"
  />

  return variant === 'category' ? <span className={styles.category}>{icon}</span> : icon
}
