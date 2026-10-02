import type {
  CSSProperties,
  HTMLAttributes,
} from 'react'

import styles from './AssetIcon.module.css'

export type SharedIconProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  'aria-hidden' | 'children'
>

type AssetIconStyle = CSSProperties & {
  '--shared-icon-mask': string
}

type AssetIconProps = SharedIconProps & {
  name: string
  source: string
}

export function AssetIcon({
  className,
  name,
  source,
  style,
  ...spanProps
}: AssetIconProps) {
  return (
    <span
      {...spanProps}
      className={[styles.icon, className]
        .filter(Boolean)
        .join(' ')}
      style={{
        '--shared-icon-mask': `url("${source}")`,
        ...style,
      } as AssetIconStyle}
      aria-hidden="true"
      data-icon={name}
      data-shared-icon="true"
    />
  )
}
