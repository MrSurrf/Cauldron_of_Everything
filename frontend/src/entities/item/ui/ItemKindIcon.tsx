import type { CSSProperties } from 'react'
import { AssetIcon, type SharedIconProps } from '../../../shared/ui/icons/AssetIcon'
import { PlaceholderIcon } from '../../../shared/ui/icons/PlaceholderIcon'
import { getItemKind, type ItemKind } from '../model/itemKind'
import { getItemRarity } from '../model/itemRarity'
import armorUrl from './assets/armor.svg?url&no-inline'
import potionUrl from './assets/potion.svg?url&no-inline'
import ringUrl from './assets/ring.svg?url&no-inline'
import rodUrl from './assets/rod.svg?url&no-inline'
import scrollUrl from './assets/scroll.svg?url&no-inline'
import staffUrl from './assets/staff.svg?url&no-inline'
import wandUrl from './assets/wand.svg?url&no-inline'
import weaponUrl from './assets/weapon.svg?url&no-inline'
import wondrousUrl from './assets/wondrous.svg?url&no-inline'
import styles from './ItemKindIcon.module.css'

const icons: Record<ItemKind, string> = {
  armor: armorUrl,
  potion: potionUrl,
  ring: ringUrl,
  rod: rodUrl,
  scroll: scrollUrl,
  staff: staffUrl,
  wand: wandUrl,
  weapon: weaponUrl,
  wondrous: wondrousUrl,
}

export type ItemKindIconProps = SharedIconProps & {
  classification?: string
  rarity?: string
  colorMode?: 'rarity' | 'inherit'
}

export function ItemKindIcon({ classification, rarity, colorMode = 'rarity', className, style, ...props }: ItemKindIconProps) {
  const kind = getItemKind(classification)
  const itemRarity = colorMode === 'rarity' ? getItemRarity(rarity) : undefined
  const iconProps = {
    ...props,
    className: [itemRarity && styles.rarity, !kind && styles.fallback, className].filter(Boolean).join(' '),
    style: {
      ...(itemRarity ? { '--item-icon-rarity-color': `var(--color-item-rarity-${itemRarity})` } : {}),
      ...style,
    } as CSSProperties,
    'data-item-rarity': itemRarity,
    'data-color-mode': colorMode,
  }
  if (!kind) return <span {...iconProps}
    aria-hidden="true" data-icon="item-unknown"><PlaceholderIcon /></span>

  return <AssetIcon {...iconProps} name={`item-${kind}`} source={icons[kind]} />
}
