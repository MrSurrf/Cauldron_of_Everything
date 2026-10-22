import { act, StrictMode, useLayoutEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  captureImageAssetRepository,
  createArticleDraft,
  DEFAULT_IMAGE_EDITS,
  deleteArticleDraft,
  getImageAsset,
  isArticleDraft,
  listArticleDrafts,
  loadOrCreateDrafts,
  readActiveDraftId,
  saveActiveDraftId,
  saveArticleDraft,
  saveImageAsset,
  useArticleDrafts,
} from './index'
import type { ArticleDraftsState } from './useArticleDrafts'
import type { ArticleImage } from './types'

let mounted: { root: Root; container: HTMLDivElement } | null = null
let current: ArticleDraftsState | null = null
let previousAccess: string | null
let previousRefresh: string | null

function setOwner(id: string) {
  localStorage.setItem('surveyAuth.access', `header.${btoa(JSON.stringify({ user_id: id }))}.signature`)
  localStorage.removeItem('surveyAuth.refresh')
}

function Harness() {
  const state = useArticleDrafts()
  useLayoutEffect(() => { current = state }, [state])
  return null
}

async function mount(strict = false) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  mounted = { root, container }
  await act(async () => root.render(strict ? <StrictMode><Harness /></StrictMode> : <Harness />))
  await act(async () => { await vi.waitFor(() => expect(current?.loading).toBe(false)) })
  return current!
}

async function unmount() {
  if (mounted) {
    await act(async () => mounted!.root.unmount())
    mounted.container.remove()
    mounted = null
  }
  current = null
}

async function saved() {
  await act(async () => { await vi.waitFor(() => expect(current?.saveState).toBe('saved')) })
}

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  previousAccess = localStorage.getItem('surveyAuth.access')
  previousRefresh = localStorage.getItem('surveyAuth.refresh')
  setOwner(`article-editor-test-${crypto.randomUUID()}`)
})

afterEach(async () => {
  vi.restoreAllMocks()
  await unmount()
  if (previousAccess === null) localStorage.removeItem('surveyAuth.access')
  else localStorage.setItem('surveyAuth.access', previousAccess)
  if (previousRefresh === null) localStorage.removeItem('surveyAuth.refresh')
  else localStorage.setItem('surveyAuth.refresh', previousRefresh)
})

describe('Модель статьи', () => {
  it('создаёт независимые пустые черновики с валидным системным временем и UUID', () => {
    const first = createArticleDraft()
    const second = createArticleDraft()
    expect(isArticleDraft(first)).toBe(true)
    expect(first.id).not.toBe(second.id)
    expect(first.createdAt).toBe(first.updatedAt)
    expect(first.markdown).toBe('')
    expect(first.scheduledFor).toBeNull()
    expect(first.images).not.toBe(second.images)
    expect(first.entities).not.toBe(second.entities)
  })

  it('проверяет нормализованное кадрирование и фильтры, не исправляя данные молча', () => {
    const draft = createArticleDraft()
    const image: ArticleImage = { id: 'image', assetId: 'asset', name: 'cover.png', alt: '', caption: '', edits: structuredClone(DEFAULT_IMAGE_EDITS) }
    draft.images = [image]
    expect(isArticleDraft(draft)).toBe(true)
    image.edits.brightness = 201
    expect(isArticleDraft(draft)).toBe(false)
    image.edits.brightness = 100
    image.edits.crop.x = 0.5
    expect(isArticleDraft(draft)).toBe(false)
    expect(DEFAULT_IMAGE_EDITS.crop.x).toBe(0)
  })
})

describe('Настоящий IndexedDB браузера', () => {
  it('атомарно создаёт ровно один черновик при одновременном первом открытии', async () => {
    const [first, second, third] = await Promise.all([loadOrCreateDrafts(), loadOrCreateDrafts(), loadOrCreateDrafts()])
    expect(first.drafts).toHaveLength(1)
    expect(second.activeId).toBe(first.activeId)
    expect(third.activeId).toBe(first.activeId)
    expect(await listArticleDrafts()).toHaveLength(1)
  })

  it('пишет по id и не затирает соседние статьи другой вкладки', async () => {
    const first = { ...createArticleDraft(), title: 'Первый' }
    const second = { ...createArticleDraft(), title: 'Из другой вкладки' }
    await Promise.all([saveArticleDraft(first), saveArticleDraft(second)])
    await saveArticleDraft({ ...first, markdown: 'Новая версия первого' })
    const stored = await listArticleDrafts()
    expect(stored).toHaveLength(2)
    expect(stored.find(draft => draft.id === second.id)?.title).toBe(second.title)
    expect(stored.find(draft => draft.id === first.id)?.markdown).toBe('Новая версия первого')
  })

  it('хранит Blob отдельно, не превращая его в URL или base64 в тексте статьи', async () => {
    const draft = createArticleDraft()
    const asset = new Blob(['image bytes'], { type: 'image/png' })
    await saveImageAsset('binary-asset', asset)
    await saveArticleDraft(draft)
    const loaded = await getImageAsset('binary-asset')
    expect(loaded).toBeInstanceOf(Blob)
    expect(loaded?.type).toBe('image/png')
    expect(await loaded?.text()).toBe('image bytes')
    expect(await getImageAsset('missing')).toBeUndefined()
    expect((await listArticleDrafts())[0]).toEqual(draft)
    await deleteArticleDraft(draft.id)
    expect(await listArticleDrafts()).toHaveLength(0)
    expect(await getImageAsset('binary-asset')).toBeInstanceOf(Blob)
  })

  it('запоминает выбранную статью и восстанавливает её при следующем входе', async () => {
    const first = createArticleDraft()
    const second = createArticleDraft()
    await saveArticleDraft(first)
    await saveArticleDraft(second)
    await saveActiveDraftId(second.id)
    expect(await readActiveDraftId()).toBe(second.id)
    expect((await loadOrCreateDrafts()).activeId).toBe(second.id)
  })

  it('разделяет статьи и медиа разных аккаунтов', async () => {
    const firstOwner = `owner-${crypto.randomUUID()}`
    setOwner(firstOwner)
    await saveArticleDraft({ ...createArticleDraft(), title: 'Личное' })
    await saveImageAsset('private-image', new Blob(['private']))
    setOwner(`another-${crypto.randomUUID()}`)
    expect(await listArticleDrafts()).toEqual([])
    expect(await getImageAsset('private-image')).toBeUndefined()
    setOwner(firstOwner)
    expect((await listArticleDrafts())[0].title).toBe('Личное')
  })

  it('захватывает аккаунт медиа до асинхронной обработки и разделяет одинаковые assetId', async () => {
    setOwner(`asset-owner-a-${crypto.randomUUID()}`)
    const first = captureImageAssetRepository()
    setOwner(`asset-owner-b-${crypto.randomUUID()}`)
    const second = captureImageAssetRepository()
    expect(first.scope).not.toBe(second.scope)
    await Promise.all([
      first.save('same-id', new Blob(['first-account'])),
      second.save('same-id', new Blob(['second-account'])),
    ])
    expect(await (await first.get('same-id'))?.text()).toBe('first-account')
    expect(await (await second.get('same-id'))?.text()).toBe('second-account')
    expect(await (await getImageAsset('same-id'))?.text()).toBe('second-account')
    await first.save('queued-after-account-change', new Blob(['private']))
    expect(await second.get('queued-after-account-change')).toBeUndefined()
    expect(await (await first.get('queued-after-account-change'))?.text()).toBe('private')
  })

  it('отклоняет некорректную запись, сохраняя существующий черновик', async () => {
    const draft = { ...createArticleDraft(), title: 'Сохранённое' }
    await saveArticleDraft(draft)
    await expect(saveArticleDraft({ ...draft, scheduledFor: 'not a date' })).rejects.toThrow('неверный формат')
    expect(await listArticleDrafts()).toEqual([draft])
  })

  it('не заменяет повреждённый или будущий формат черновиков пустой статьёй', async () => {
    const owner = `future-version-${crypto.randomUUID()}`
    setOwner(owner)
    const draft = createArticleDraft()
    await saveArticleDraft(draft)
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(`cauldron.article-editor.v1:${encodeURIComponent(owner)}`, 1)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('drafts', 'readwrite')
        transaction.objectStore('drafts').put({ ...draft, version: 2 })
        transaction.oncomplete = () => resolve()
        transaction.onabort = () => reject(transaction.error)
      })
      await expect(loadOrCreateDrafts()).rejects.toThrow('неизвестный формат')
      const stored = await new Promise<unknown[]>((resolve, reject) => {
        const request = db.transaction('drafts', 'readonly').objectStore('drafts').getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      expect(stored).toEqual([{ ...draft, version: 2 }])
    } finally {
      db.close()
    }
  })
})

describe('useArticleDrafts', () => {
  it('в StrictMode создаёт одну статью и не плодит пустые черновики при повторном входе', async () => {
    await mount(true)
    const firstId = current!.activeDraft!.id
    expect(current!.drafts).toHaveLength(1)
    await unmount()
    await mount(true)
    expect(current!.drafts).toHaveLength(1)
    expect(current!.activeDraft!.id).toBe(firstId)
    expect(await listArticleDrafts()).toHaveLength(1)
  })

  it('автосохраняет с debounce, а callbacks не меняются после редактирования', async () => {
    const initial = await mount()
    const put = vi.spyOn(IDBObjectStore.prototype, 'put')
    await act(async () => {
      current!.updateDraft({ title: 'Раз' })
      current!.updateDraft({ title: 'Два', markdown: '# Текст' })
    })
    expect(current!.saveState).toBe('saving')
    expect(put.mock.calls).toHaveLength(0)
    await saved()
    expect((await listArticleDrafts())[0].title).toBe('Два')
    expect(put.mock.calls.filter(([value]) => typeof value === 'object')).toHaveLength(1)
    expect(current!.updateDraft).toBe(initial.updateDraft)
    expect(current!.selectDraft).toBe(initial.selectDraft)
    expect(current!.createDraft).toBe(initial.createDraft)
    expect(current!.deleteDraft).toBe(initial.deleteDraft)
    expect(current!.retrySave).toBe(initial.retrySave)
  })

  it('немедленно flush-ит правки при создании и переключении, не смешивая статьи', async () => {
    await mount()
    const firstId = current!.activeDraft!.id
    await act(async () => {
      current!.updateDraft({ title: 'Первая', markdown: 'Первый текст' })
      current!.createDraft()
    })
    const secondId = current!.activeDraft!.id
    expect(secondId).not.toBe(firstId)
    await act(async () => {
      current!.updateDraft({ title: 'Вторая', markdown: 'Второй текст' })
      current!.selectDraft(firstId)
    })
    await saved()
    expect(current!.activeDraft!.markdown).toBe('Первый текст')
    const drafts = await listArticleDrafts()
    expect(drafts.find(draft => draft.id === firstId)?.title).toBe('Первая')
    expect(drafts.find(draft => draft.id === secondId)?.markdown).toBe('Второй текст')
    expect(await readActiveDraftId()).toBe(firstId)
    await unmount()
    await mount()
    expect(current!.activeDraft!.id).toBe(firstId)
  })

  it('flush-ит последние символы при уходе со страницы до истечения debounce', async () => {
    await mount()
    const id = current!.activeDraft!.id
    await act(async () => current!.updateDraft({ markdown: 'Последние символы' }))
    await unmount()
    await vi.waitFor(async () => expect((await listArticleDrafts()).find(draft => draft.id === id)?.markdown).toBe('Последние символы'))
  })

  it('flush-ит по pagehide, не дожидаясь debounce', async () => {
    await mount()
    await act(async () => {
      current!.updateDraft({ markdown: 'Скрытая страница' })
      window.dispatchEvent(new Event('pagehide'))
    })
    await saved()
    expect((await listArticleDrafts())[0].markdown).toBe('Скрытая страница')
  })

  it('не отправляет flush в хранилище другого пользователя при выходе', async () => {
    const owner = `flush-owner-${crypto.randomUUID()}`
    setOwner(owner)
    await mount()
    const id = current!.activeDraft!.id
    await act(async () => current!.updateDraft({ markdown: 'Приватный текст' }))
    setOwner(`next-owner-${crypto.randomUUID()}`)
    await unmount()
    expect(await listArticleDrafts()).toEqual([])
    setOwner(owner)
    await vi.waitFor(async () => expect((await listArticleDrafts()).find(draft => draft.id === id)?.markdown).toBe('Приватный текст'))
  })

  it('сохраняет новую правку, пришедшую во время незавершённой предыдущей записи', async () => {
    await mount()
    const nativePut = IDBObjectStore.prototype.put
    let inserted = false
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      if (this.name === 'drafts' && !inserted) {
        inserted = true
        queueMicrotask(() => { current!.updateDraft({ markdown: 'Правка во время сохранения' }) })
      }
      return nativePut.call(this, value, key)
    })
    await act(async () => {
      current!.updateDraft({ markdown: 'Первая правка' })
      current!.selectDraft(current!.activeDraft!.id)
    })
    await saved()
    expect((await listArticleDrafts())[0].markdown).toBe('Правка во время сохранения')
  })

  it('не теряет несохранённые статьи при quota-ошибке и восстанавливает очередь через retry', async () => {
    await mount()
    const firstId = current!.activeDraft!.id
    const nativePut = IDBObjectStore.prototype.put
    const failing = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      if (this.name === 'drafts') throw new DOMException('Storage full', 'QuotaExceededError')
      return nativePut.call(this, value, key)
    })
    await act(async () => {
      current!.updateDraft({ markdown: 'Несохранённая первая' })
      current!.createDraft()
      current!.updateDraft({ markdown: 'Несохранённая вторая' })
      current!.selectDraft(firstId)
    })
    await act(async () => { await vi.waitFor(() => expect(current!.saveState).toBe('error')) })
    expect(current!.error).toContain('недостаточно места')
    expect(current!.drafts).toHaveLength(2)
    expect(current!.activeDraft!.markdown).toBe('Несохранённая первая')
    expect(current!.drafts.some(draft => draft.markdown === 'Несохранённая вторая')).toBe(true)
    failing.mockRestore()
    await act(async () => current!.retrySave())
    await saved()
    expect(current!.error).toBeNull()
    expect((await listArticleDrafts()).map(draft => draft.markdown).sort()).toEqual(['Несохранённая первая', 'Несохранённая вторая'].sort())
  })

  it('удерживает failed pending при SPA-уходе и возвращении, не показывая их другому аккаунту', async () => {
    const owner = `dirty-spa-owner-${crypto.randomUUID()}`
    setOwner(owner)
    await mount()
    const firstId = current!.activeDraft!.id
    const nativePut = IDBObjectStore.prototype.put
    const failing = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      if (this.name === 'drafts' && value && typeof value === 'object' && 'id' in value && value.id === firstId) {
        throw new DOMException('Storage full', 'QuotaExceededError')
      }
      return nativePut.call(this, value, key)
    })
    await act(async () => current!.updateDraft({ title: 'Несохранённая статья', markdown: 'Не потерять после SPA-перехода' }))
    // Уход до debounce: ошибка впервые возникает уже после размонтирования.
    await unmount()
    setOwner(`dirty-spa-other-${crypto.randomUUID()}`)
    await mount()
    expect(current!.drafts).toHaveLength(1)
    expect(current!.activeDraft!.markdown).toBe('')
    await act(async () => { current!.updateDraft({ title: 'Другой аккаунт' }); current!.retrySave() })
    await saved()
    await unmount()
    setOwner(owner)
    await mount()
    expect(current!.activeDraft!.id).toBe(firstId)
    expect(current!.activeDraft!.markdown).toBe('Не потерять после SPA-перехода')
    expect(current!.saveState).toBe('error')
    failing.mockRestore()
    await act(async () => current!.retrySave())
    await saved()
    expect((await listArticleDrafts()).find(draft => draft.id === firstId)?.markdown).toBe('Не потерять после SPA-перехода')
  })

  it('не удерживает чистый контроллер и перечитывает внешние изменения при новом входе', async () => {
    await mount()
    const id = current!.activeDraft!.id
    await act(async () => { current!.updateDraft({ title: 'Моя версия' }); current!.retrySave() })
    await saved()
    await unmount()
    const previous = (await listArticleDrafts()).find(draft => draft.id === id)!
    await saveArticleDraft({ ...previous, title: 'Новая версия из другой вкладки' })
    await mount()
    expect(current!.activeDraft!.title).toBe('Новая версия из другой вкладки')
  })

  it('не притворяется пустым успешным редактором при ошибке открытия IndexedDB', async () => {
    const failing = vi.spyOn(IDBFactory.prototype, 'open').mockImplementation(() => {
      throw new DOMException('Storage denied', 'SecurityError')
    })
    await mount()
    expect(current!.saveState).toBe('error')
    expect(current!.activeDraft).toBeNull()
    expect(current!.drafts).toEqual([])
    failing.mockRestore()
    await act(async () => current!.retrySave())
    await act(async () => { await vi.waitFor(() => expect(current!.loading).toBe(false)) })
    expect(current!.saveState).toBe('saved')
    expect(current!.drafts).toHaveLength(1)
  })

  it('удаляет только выбранную статью, а последнюю заменяет одним пустым черновиком', async () => {
    await mount()
    const firstId = current!.activeDraft!.id
    await act(async () => current!.createDraft())
    await saved()
    const secondId = current!.activeDraft!.id
    await act(async () => current!.deleteDraft(firstId))
    await saved()
    expect(current!.drafts.map(draft => draft.id)).toEqual([secondId])
    await act(async () => current!.deleteDraft(secondId))
    await saved()
    expect(current!.drafts).toHaveLength(1)
    expect(current!.activeDraft!.id).not.toBe(secondId)
    expect(current!.activeDraft!.markdown).toBe('')
    expect(await listArticleDrafts()).toHaveLength(1)
  })
})
