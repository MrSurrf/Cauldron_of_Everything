import type { SelectionMarkerProps } from './SelectionMarker.types'
import styles from './SelectionMarker.module.css'

export function SelectionMarker({
  className,
  state = 'unchecked',
  ...props
}: SelectionMarkerProps) {
  const classes = [styles.marker, className]
    .filter(Boolean)
    .join(' ')

  return (
    <span
      {...props}
      aria-hidden={true}
      className={classes}
      data-selection-marker
      data-state={state}
    />
  )
}
