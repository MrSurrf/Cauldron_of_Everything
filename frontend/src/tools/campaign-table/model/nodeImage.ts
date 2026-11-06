import type { EntityType } from '../../../entities/base'
import type { CampaignWikiImageKind } from '../../../shared/local'

export const IMAGE_NODE_CREATION_TYPES = ['location', 'playerCharacter', 'npc'] as const

export type NodeImageField = 'coverAssetId' | 'avatarAssetId'

export function nodeImageKind(type: EntityType): CampaignWikiImageKind | null {
  if (type === 'playerCharacter' || type === 'npc') return 'avatar'
  if (type === 'location' || type === 'creature' || type === 'item') return 'cover'
  return null
}

export function nodeImageField(type: EntityType): NodeImageField | null {
  const kind = nodeImageKind(type)
  return kind === 'avatar' ? 'avatarAssetId' : kind === 'cover' ? 'coverAssetId' : null
}

export function imageNodeTitle(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '')
  return withoutExtension.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Новое изображение'
}
