import { AssetIcon, type SharedIconProps } from '../../../shared/ui/icons/AssetIcon'
import { PlaceholderIcon } from '../../../shared/ui/icons/PlaceholderIcon'
import { getSpellSchool } from '../model/spellSchool'
import abjurationUrl from './assets/abjuration.svg?url&no-inline'
import conjurationUrl from './assets/conjuration.svg?url&no-inline'
import divinationUrl from './assets/divination.svg?url&no-inline'
import enchantmentUrl from './assets/enchantment.svg?url&no-inline'
import evocationUrl from './assets/evocation.svg?url&no-inline'
import illusionUrl from './assets/illusion.svg?url&no-inline'
import necromancyUrl from './assets/necromancy.svg?url&no-inline'
import transmutationUrl from './assets/transmutation.svg?url&no-inline'
import styles from './SpellSchoolIcon.module.css'

const icons = {
  abjuration: abjurationUrl,
  conjuration: conjurationUrl,
  divination: divinationUrl,
  enchantment: enchantmentUrl,
  evocation: evocationUrl,
  illusion: illusionUrl,
  necromancy: necromancyUrl,
  transmutation: transmutationUrl,
}

export type SpellSchoolIconProps = SharedIconProps & {
  school?: string | null
}

export function SpellSchoolIcon({ school, className, ...props }: SpellSchoolIconProps) {
  const kind = getSpellSchool(school)
  if (!kind) return <span {...props} className={[styles.fallback, className].filter(Boolean).join(' ')}
    aria-hidden="true" data-icon="spell-unknown"><PlaceholderIcon /></span>

  return <AssetIcon {...props} className={className} name={`spell-${kind}`} source={icons[kind]} />
}
