export type TileSize = {
  width: number
  height: number
}

export type TileLayout = TileSize & {
  x: number
  y: number
}

export type TileDefinition = {
  type: string
  title: string
  defaultSize: TileSize
  minSize: TileSize
  maxSize?: TileSize
  resizable?: boolean
}

export type TileInstance<
  TSettings extends Record<string, unknown> = Record<string, unknown>,
> = {
  id: string
  toolId: string
  tileType: string
  layout: TileLayout
  settings: TSettings
  schemaVersion: number
}
