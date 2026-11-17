import type { CSSProperties } from 'react'
import { IconFrame, PlaceholderIcon } from '../../shared/ui'
import bestiaryUrl from '../../shared/ui/icons/assets/bestiary.svg?url&no-inline'
import classesUrl from '../../shared/ui/icons/assets/class.svg?url&no-inline'
import racesUrl from '../../shared/ui/icons/assets/race.svg?url&no-inline'
import backgroundsUrl from '../../shared/ui/icons/assets/background.svg?url&no-inline'
import featsUrl from '../../shared/ui/icons/assets/feat.svg?url&no-inline'
import spellsUrl from './assets/Spells.svg?url&no-inline'
import itemsUrl from '../../shared/ui/icons/assets/magic-item.svg?url&no-inline'
import styles from './EncyclopediaSectionIcon.module.css'

const icons: Record<string, { url: string; ratio: number }> = {
  bestiary: { url: bestiaryUrl, ratio: 1453 / 1341 },
  classes: { url: classesUrl, ratio: 1069 / 659 },
  races: { url: racesUrl, ratio: 832 / 701 },
  backgrounds: { url: backgroundsUrl, ratio: 699 / 643 },
  feats: { url: featsUrl, ratio: 597 / 701 },
  spells: { url: spellsUrl, ratio: 864 / 832 },
  items: { url: itemsUrl, ratio: 779 / 825 },
}

type IconStyle = CSSProperties & { '--section-icon-url': string; '--section-icon-ratio': number }

export function EncyclopediaSectionIcon({ sectionId, variant = 'inline' }: {
  sectionId: string
  variant?: 'inline' | 'category'
}) {
  const asset = icons[sectionId]
  if (!asset) return variant === 'category'
    ? <IconFrame size="4rem" contentSize="2.75rem" glow={false} aria-hidden="true"><PlaceholderIcon /></IconFrame>
    : <PlaceholderIcon />

  const icon = <span
    className={styles.icon}
    style={{ '--section-icon-url': `url("${asset.url}")`, '--section-icon-ratio': asset.ratio } as IconStyle}
    aria-hidden="true"
  />

  return variant === 'category' ? <span className={styles.category} data-section={sectionId}>{icon}</span> : icon
}
