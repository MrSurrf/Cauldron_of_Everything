import type { TileDefinition } from './tile'

export type ToolManifest = {
  id: string
  title: string
  description?: string
  tiles: readonly TileDefinition[]
}
