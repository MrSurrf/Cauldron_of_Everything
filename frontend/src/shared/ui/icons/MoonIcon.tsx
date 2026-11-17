import moonIconUrl from './assets/moon.svg?url&no-inline'
import { AssetIcon } from './AssetIcon'
import type { SharedIconProps } from './AssetIcon'

export function MoonIcon(props: SharedIconProps) {
  return <AssetIcon {...props} name="moon" source={moonIconUrl} />
}
