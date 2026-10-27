import { fetchEncyclopedia } from './repository'
import type { EncyclopediaEntry } from './repository'

export type PopularEncyclopediaEntry = EncyclopediaEntry & { opens_count: number }
export type PopularEncyclopediaPage = { count: number; results: PopularEncyclopediaEntry[] }

// Рейтинг формирует только сервер, по открытиям всех пользователей.
export async function fetchPopularEncyclopedia(signal: AbortSignal): Promise<PopularEncyclopediaPage> {
  const page = await fetchEncyclopedia<PopularEncyclopediaPage>('popular/?page_size=20', signal)
  if (!page || !Number.isSafeInteger(page.count) || page.count < 0 || !Array.isArray(page.results)
    || !page.results.every(entry => entry && Number.isSafeInteger(entry.id) && entry.id > 0
      && typeof entry.name === 'string' && entry.name.length > 0
      && typeof entry.entity_type === 'string' && typeof entry.slug === 'string'
      && Number.isSafeInteger(entry.opens_count) && entry.opens_count >= 0)) {
    throw new Error('Некорректный ответ общего рейтинга энциклопедии.')
  }
  return page
}
