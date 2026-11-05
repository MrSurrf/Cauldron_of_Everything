import type { ToolManifest } from '../../workspace'

export type CharacterSheetTileSettings = {
  characterId: string
}

export const characterSheetManifest = {
  id: 'character-sheet',
  title: 'Лист персонажа',
  description:
    'Редактируемый лист персонажа с формулами, инвентарём и пользовательскими секциями.',
  tiles: [
    {
      type: 'character-sheet',
      title: 'Лист персонажа',
      defaultSize: { width: 12, height: 10 },
      minSize: { width: 4, height: 5 },
      resizable: true,
    },
  ],
} satisfies ToolManifest
