import equippedIconUrl from './assets/equipped.svg?url&no-inline'
import {
  AssetIcon,
  type SharedIconProps,
} from './AssetIcon'

export function EquippedIcon(props: SharedIconProps) {
  return (
    <AssetIcon
      {...props}
      name="equipped"
      source={equippedIconUrl}
    />
  )
}
