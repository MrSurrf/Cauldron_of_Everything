import d4Source from './assets/d4.svg'
import d6Source from './assets/d6.svg'
import d8Source from './assets/d8.svg'
import d10Source from './assets/d10.svg'
import d12Source from './assets/d12.svg'
import d20Source from './assets/d20.svg'
import { AssetIcon, type SharedIconProps } from './AssetIcon'
import type { DiceType } from './dice'

const diceIconSources: Readonly<Record<DiceType, string>> = {
  d4: d4Source,
  d6: d6Source,
  d8: d8Source,
  d10: d10Source,
  d12: d12Source,
  d20: d20Source,
}

export type DiceIconProps = SharedIconProps & {
  type: DiceType
}

export function DiceIcon({ type, ...props }: DiceIconProps) {
  return (
    <AssetIcon
      {...props}
      name={type}
      source={diceIconSources[type]}
    />
  )
}
