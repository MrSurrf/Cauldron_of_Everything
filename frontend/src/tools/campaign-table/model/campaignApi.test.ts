import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authFetch } from '../../../shared/api/auth'
import { campaignRequest, loadPublicTable } from './campaignApi'
import { createTable } from './table'
import { searchLibrary } from './library'

vi.mock('../../../shared/api/auth', () => ({ authFetch: vi.fn() }))
const request = vi.mocked(authFetch)
beforeEach(() => request.mockReset())
describe('контракт источников пространства', () => {
  it('читает отдельный публичный документ, не запрашивая библиотеку или private', async () => {
    const table = createTable()
    request.mockResolvedValue(new Response(JSON.stringify({ visibility: 'public', document: table })))
    expect(await loadPublicTable('campaign/1', new AbortController().signal)).toEqual(table)
    expect(request).toHaveBeenCalledTimes(1)
    expect(String(request.mock.calls[0][0])).toContain('/campaigns/campaign%2F1/table/public/')
  })
  it.each([401, 403, 404, 500])('не заменяет отказ %i локальным документом', async status => {
    request.mockResolvedValue(new Response('{}', { status }))
    await expect(loadPublicTable('a', new AbortController().signal)).rejects.toThrow()
    expect(request).toHaveBeenCalledTimes(1)
  })
  it('отклоняет private и повреждённый public ответ', async () => {
    request.mockResolvedValueOnce(new Response(JSON.stringify({ visibility: 'private', document: createTable() })))
    await expect(loadPublicTable('a', new AbortController().signal)).rejects.toThrow('публичный режим')
    request.mockResolvedValueOnce(new Response(JSON.stringify({ visibility: 'public', document: {} })))
    await expect(loadPublicTable('a', new AbortController().signal)).rejects.toThrow()
  })
  it('сохраняет серверную фильтрацию и пагинацию персонажей', async () => {
    request.mockResolvedValue(new Response(JSON.stringify({ count: 31, results: [{ id: 'hero', entityType: 'character', name: 'Герой', slug: 'hero', facts: ['Воин'], description: '' }] })))
    const result = await searchLibrary('character', 'Герой', 2, new AbortController().signal)
    expect(result.count).toBe(31)
    expect(result.entries[0]).toMatchObject({ source: 'character', entityId: 'hero', entityType: 'character' })
    const url = new URL(String(request.mock.calls[0][0]))
    expect(url.pathname).toBe('/api/characters/')
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.get('q')).toBe('Герой')
  })
  it('отсутствующий источник показывает как неподключённый', async () => {
    request.mockResolvedValue(new Response('{}', { status: 404 }))
    await expect(campaignRequest('characters/', new AbortController().signal)).rejects.toThrow('не подключён')
  })
})
