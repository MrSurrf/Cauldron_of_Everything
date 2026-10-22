import { fetchEncyclopedia } from '../../encyclopedia'
import { toClassEntity } from './classEntity'
import type { ClassEntity, EncyclopediaClassDetail } from './classEntity'

export { toClassEntity } from './classEntity'

type ClassList = { count: number; results: { id: number; entity_type: string; slug: string }[] }

export async function getClassById(id: number | string, signal: AbortSignal): Promise<ClassEntity | null> {
  const raw = String(id)
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) < 1) return null
  const detail = await fetchEncyclopedia<EncyclopediaClassDetail>(`${encodeURIComponent(raw)}/`, signal)
  return detail.entity_type === 'class' ? toClassEntity(detail) : null
}

export async function getClassBySlug(slug: string, signal: AbortSignal): Promise<ClassEntity | null> {
  if (!slug.trim()) return null
  const params = new URLSearchParams({ type: 'class', slug, page_size: '100' })
  const response = await fetchEncyclopedia<ClassList>(`?${params}`, signal)
  const entry = response.results.find(item => item.entity_type === 'class' && item.slug === slug)
  return entry ? getClassById(entry.id, signal) : null
}
