import { createArticleDraft, isArticleDraft } from './types'
import type { ArticleDraft } from './types'

const DATABASE_PREFIX = 'cauldron.article-editor.v1:'
const DRAFTS = 'drafts'
const ASSETS = 'assets'
const META = 'meta'
const ACTIVE = 'active-draft'
const connections = new Map<string, Promise<IDBDatabase>>()

/** Это разделение локальных данных, не авторизация и не проверка JWT. */
function ownerKey(): string {
  try {
    for (const key of ['surveyAuth.access', 'surveyAuth.refresh']) {
      const token = localStorage.getItem(key)
      if (!token) continue
      try {
        const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
        const payload: unknown = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')))
        if (payload && typeof payload === 'object') {
          const fields = payload as Record<string, unknown>
          const id = fields.user_id ?? fields.sub
          if (typeof id === 'string' || typeof id === 'number') return encodeURIComponent(String(id))
        }
      } catch { /* Истёкший или повреждённый access не мешает прочитать refresh. */ }
    }
  } catch { /* IndexedDB может быть доступен при запрете localStorage. */ }
  return 'guest'
}

function database(owner = ownerKey()): Promise<IDBDatabase> {
  const name = DATABASE_PREFIX + owner
  const previous = connections.get(name)
  if (previous) return previous
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(DRAFTS)) db.createObjectStore(DRAFTS, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(ASSETS)) db.createObjectStore(ASSETS)
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META)
    }
    request.onerror = () => reject(request.error ?? new Error('Не удалось открыть локальное хранилище статей.'))
    request.onblocked = () => reject(new Error('Закройте другую вкладку редактора и повторите сохранение.'))
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => { db.close(); connections.delete(name) }
      resolve(db)
    }
  })
  connections.set(name, opening)
  void opening.catch(() => { if (connections.get(name) === opening) connections.delete(name) })
  return opening
}

function completed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error ?? new Error('Локальное сохранение прервано.'))
    transaction.onerror = () => reject(transaction.error ?? new Error('Не удалось сохранить статью на устройстве.'))
  })
}

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Не удалось прочитать локальные данные.'))
  })
}

function checkedDrafts(values: unknown[]): ArticleDraft[] {
  if (!values.every(isArticleDraft)) {
    throw new Error('Часть локальных статей имеет неизвестный формат. Данные сохранены без изменений.')
  }
  return values.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function listArticleDrafts(owner = ownerKey()): Promise<ArticleDraft[]> {
  const db = await database(owner)
  const transaction = db.transaction(DRAFTS, 'readonly')
  const done = completed(transaction)
  const [values] = await Promise.all([result<unknown[]>(transaction.objectStore(DRAFTS).getAll()), done])
  return checkedDrafts(values)
}

export async function saveArticleDraft(draft: ArticleDraft, owner = ownerKey()): Promise<void> {
  if (!isArticleDraft(draft)) throw new Error('Не удалось сохранить статью: неверный формат данных.')
  const db = await database(owner)
  const transaction = db.transaction(DRAFTS, 'readwrite')
  const done = completed(transaction)
  transaction.objectStore(DRAFTS).put(draft)
  await done
}

/** Медиа не удаляются каскадно: их могут использовать другие локальные статьи. */
export async function deleteArticleDraft(id: string, owner = ownerKey()): Promise<void> {
  const db = await database(owner)
  const transaction = db.transaction(DRAFTS, 'readwrite')
  const done = completed(transaction)
  transaction.objectStore(DRAFTS).delete(id)
  await done
}

export async function readActiveDraftId(): Promise<string | null> {
  const db = await database()
  const transaction = db.transaction(META, 'readonly')
  const done = completed(transaction)
  const [value]: [unknown, void] = await Promise.all([result(transaction.objectStore(META).get(ACTIVE)), done])
  return typeof value === 'string' ? value : null
}

export async function saveActiveDraftId(id: string | null, owner = ownerKey()): Promise<void> {
  const db = await database(owner)
  const transaction = db.transaction(META, 'readwrite')
  const done = completed(transaction)
  if (id === null) transaction.objectStore(META).delete(ACTIVE)
  else transaction.objectStore(META).put(id, ACTIVE)
  await done
}

/** Одна readwrite-транзакция защищает первый вход, StrictMode и две новые вкладки. */
export async function loadOrCreateDrafts(owner = ownerKey()): Promise<{ drafts: ArticleDraft[]; activeId: string }> {
  const db = await database(owner)
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DRAFTS, META], 'readwrite')
    const draftsStore = transaction.objectStore(DRAFTS)
    const metaStore = transaction.objectStore(META)
    const draftsRequest = draftsStore.getAll()
    const activeRequest = metaStore.get(ACTIVE)
    let loaded: { drafts: ArticleDraft[]; activeId: string } | undefined
    let validationError: unknown
    activeRequest.onsuccess = () => {
      try {
        const drafts = checkedDrafts(draftsRequest.result)
        if (drafts.length === 0) {
          const first = createArticleDraft()
          draftsStore.add(first)
          drafts.push(first)
        }
        const activeId = typeof activeRequest.result === 'string'
          && drafts.some(draft => draft.id === activeRequest.result) ? activeRequest.result as string : drafts[0].id
        metaStore.put(activeId, ACTIVE)
        loaded = { drafts, activeId }
      } catch (error) {
        validationError = error
        transaction.abort()
      }
    }
    transaction.oncomplete = () => loaded ? resolve(loaded) : reject(new Error('Черновики не загружены.'))
    transaction.onabort = transaction.onerror = () => reject(validationError ?? transaction.error ?? new Error('Не удалось загрузить локальные статьи.'))
  })
}

export async function saveImageAsset(id: string, blob: Blob, owner = ownerKey()): Promise<void> {
  if (!id || !(blob instanceof Blob)) throw new Error('Не удалось сохранить изображение: неверные данные.')
  const db = await database(owner)
  const transaction = db.transaction(ASSETS, 'readwrite')
  const done = completed(transaction)
  transaction.objectStore(ASSETS).put(blob, id)
  await done
}

export async function getImageAsset(id: string, owner = ownerKey()): Promise<Blob | undefined> {
  const db = await database(owner)
  const transaction = db.transaction(ASSETS, 'readonly')
  const done = completed(transaction)
  const [value]: [unknown, void] = await Promise.all([result(transaction.objectStore(ASSETS).get(id)), done])
  if (value === undefined || value instanceof Blob) return value
  throw new Error('Сохранённое изображение имеет неизвестный формат.')
}

/** Отложенный flush после выхода не должен записать данные аккаунта в guest/другой аккаунт. */
export function captureDraftRepository() {
  const owner = ownerKey()
  return {
    scope: owner,
    load: () => loadOrCreateDrafts(owner),
    save: (draft: ArticleDraft) => saveArticleDraft(draft, owner),
    remove: (id: string) => deleteArticleDraft(id, owner),
    select: (id: string | null) => saveActiveDraftId(id, owner),
  }
}

/** Вся асинхронная обработка одного файла остаётся в исходном аккаунте. */
export function captureImageAssetRepository() {
  const owner = ownerKey()
  return {
    scope: owner,
    save: (id: string, blob: Blob) => saveImageAsset(id, blob, owner),
    get: (id: string) => getImageAsset(id, owner),
  }
}
