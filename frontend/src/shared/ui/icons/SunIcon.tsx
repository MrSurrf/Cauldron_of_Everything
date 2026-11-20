import sunIconUrl from './assets/sun.svg?url&no-inline'
import { AssetIcon } from './AssetIcon'
import type { SharedIconProps } from './AssetIcon'

export function SunIcon(props: SharedIconProps) {
  return <AssetIcon {...props} name="sun" source={sunIconUrl} />
}
