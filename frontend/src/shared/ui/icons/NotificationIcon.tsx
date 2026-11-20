import notificationIconUrl from './assets/notification.svg?url&no-inline'
import {
  AssetIcon,
  type SharedIconProps,
} from './AssetIcon'

export function NotificationIcon(props: SharedIconProps) {
  return (
    <AssetIcon
      {...props}
      name="notification"
      source={notificationIconUrl}
    />
  )
}
