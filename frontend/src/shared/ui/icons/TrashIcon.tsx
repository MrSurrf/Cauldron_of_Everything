import trashIconUrl from './assets/trash.svg?url&no-inline'
import {
  AssetIcon,
  type SharedIconProps,
} from './AssetIcon'

export function TrashIcon(props: SharedIconProps) {
  return (
    <AssetIcon
      {...props}
      name="trash"
      source={trashIconUrl}
    />
  )
}
