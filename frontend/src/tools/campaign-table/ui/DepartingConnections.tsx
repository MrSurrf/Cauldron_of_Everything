import { ViewportPortal } from '@xyflow/react'
import type { DepartingConnection } from './useDepartingConnections'
import styles from './DepartingConnections.module.css'

export function DepartingConnections({ connections }: { connections: DepartingConnection[] }) {
  if (!connections.length) return null
  return <ViewportPortal><svg className={styles.departures} aria-hidden="true" data-departing-connections="">
    {connections.map(connection => <path key={connection.id} d={connection.path} pathLength={1}
      style={{ stroke: connection.color, strokeWidth: connection.width }} />)}
  </svg></ViewportPortal>
}
