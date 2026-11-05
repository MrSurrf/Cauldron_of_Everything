import searchIconUrl from './assets/search.svg?url&no-inline'
import { AssetIcon, type SharedIconProps } from './AssetIcon'

export function SearchIcon(props: SharedIconProps) {
  return <AssetIcon {...props} name="search" source={searchIconUrl} />
}
