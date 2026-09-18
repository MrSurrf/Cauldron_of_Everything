import source from './assets/saving-throw.svg'
import { AssetIcon, type SharedIconProps } from './AssetIcon'

export type SavingThrowIconProps = SharedIconProps

export function SavingThrowIcon(props: SavingThrowIconProps) {
  return (
    <AssetIcon
      {...props}
      name="saving-throw"
      source={source}
    />
  )
}
