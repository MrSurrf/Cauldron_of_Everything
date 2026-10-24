import { authFetch } from '../../../shared/api/auth'
import type { LibraryReference } from './library'
import type { CharacterSheetDocument } from '../../character-sheet'
import { parseTable } from './table'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
export async function campaignRequest<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await authFetch(`${API_BASE_URL}/api/${path}`, { signal, headers: { Accept: 'application/json' } }, { forbiddenScope: 'resource' })
  if ([404, 501].includes(response.status)) throw new Error('Источник ещё не подключён к серверу.')
  if ([401, 403].includes(response.status)) throw new Error('Сервер не разрешил доступ к этим материалам.')
  if (!response.ok) throw new Error('Не удалось загрузить материалы. Повторите запрос.')
  return response.json() as Promise<T>
}
export type OwnedMaterial = {
  id: string; name: string; slug: string; description: string; facts: string[]; entityType: 'character' | 'npc' | 'campaign'
  document?: CharacterSheetDocument
}
export function ownedReference(entry: OwnedMaterial, source: 'character' | 'campaign'): LibraryReference {
  return { source, entityId: String(entry.id), entityType: entry.entityType, name: entry.name, slug: entry.slug, facts: entry.facts }
}
export async function loadPublicTable(campaignId: string, signal: AbortSignal) {
  const result = await campaignRequest<{ visibility: string; document: unknown }>(`campaigns/${encodeURIComponent(campaignId)}/table/public/`, signal)
  if (result.visibility !== 'public') throw new Error('Сервер не подтвердил публичный режим стола.')
  // Только отдельный серверный ответ. Локальные закрытые схемы сюда не подмешиваются.
  return parseTable(JSON.stringify(result.document))
}
