import type { VisionType } from '../../model'
import blindsightSource from './assets/blindsight.svg'
import darkvisionSource from './assets/darkvision.svg'
import normalVisionSource from './assets/normal-vision.svg'
import tremorsenseSource from './assets/tremorsense.svg'
import truesightSource from './assets/truesight.svg'
import { AssetIcon, type SharedIconProps } from './AssetIcon'

const visionIconSources: Readonly<Record<VisionType, string>> = {
  normal: normalVisionSource,
  darkvision: darkvisionSource,
  blindsight: blindsightSource,
  tremorsense: tremorsenseSource,
  truesight: truesightSource,
}

export type VisionIconProps = SharedIconProps & {
  type: VisionType
}

export function VisionIcon({ type, ...props }: VisionIconProps) {
  return (
    <AssetIcon
      {...props}
      name={`${type}-vision`}
      source={visionIconSources[type]}
    />
  )
}
