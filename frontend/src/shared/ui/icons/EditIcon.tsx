import editIconUrl from './assets/edit.svg?url&no-inline'
import {
  AssetIcon,
  type SharedIconProps,
} from './AssetIcon'

export function EditIcon(props: SharedIconProps) {
  return (
    <AssetIcon
      {...props}
      name="edit"
      source={editIconUrl}
    />
  )
}
