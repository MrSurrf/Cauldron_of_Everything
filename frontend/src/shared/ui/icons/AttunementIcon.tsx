import attunementIconUrl from './assets/attunement.svg?url&no-inline'
import {
  AssetIcon,
  type SharedIconProps,
} from './AssetIcon'

export function AttunementIcon(
  props: SharedIconProps,
) {
  return (
    <AssetIcon
      {...props}
      name="attunement"
      source={attunementIconUrl}
    />
  )
}
