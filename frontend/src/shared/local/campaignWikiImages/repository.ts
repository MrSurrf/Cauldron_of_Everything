import { getCampaignWikiImageAccountScope } from './accountScope'
import { processCampaignWikiImage } from './imageProcessing'
import type { CampaignWikiImageKind } from './imageProcessing'

const DATABASE_PREFIX = 'cauldron.campaign-wiki-media.v1:'
const ASSETS_STORE = 'assets'
const connections = new Map<string, Promise<IDBDatabase>>()

export const CAMPAIGN_WIKI_IMAGE_CHANGED_EVENT = 'campaign-wiki-image-changed'

export type CampaignWikiImageAsset = {
  id: string
  kind: CampaignWikiImageKind
  blob: Blob
  width: number
  height: number
  mimeType: string
  size: number
  updatedAt: string
}

export type SaveCampaignWikiImageOptions = {
  kind: CampaignWikiImageKind
  assetId?: string
}

export type CampaignWikiImageChange = {
  scope: string
  assetId: string
  operation: 'save' | 'remove'
}

export type CampaignWikiImageRepository = {
  readonly scope: string
  save: (source: Blob, options: SaveCampaignWikiImageOptions) => Promise<CampaignWikiImageAsset>
  get: (assetId: string) => Promise<CampaignWikiImageAsset | undefined>
  remove: (assetId: string) => Promise<void>
}

function validAssetId(assetId: string): string {
  const value = assetId.trim()
  if (!value || value.length > 200) throw new Error('Некорректный идентификатор изображения.')
  return value
}

function newAssetId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function openDatabase(scope: string): Promise<IDBDatabase> {
  const name = DATABASE_PREFIX + scope
  const current = connections.get(name)
  if (current) return current

  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Локальное хранилище изображений недоступно в этом браузере.'))
      return
    }

    const request = indexedDB.open(name, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(ASSETS_STORE)) {
        request.result.createObjectStore(ASSETS_STORE, { keyPath: 'id' })
      }
    }
    request.onerror = () => reject(request.error ?? new Error('Не удалось открыть локальное хранилище изображений.'))
    request.onblocked = () => reject(new Error('Закройте другую вкладку кампании и повторите попытку.'))
    request.onsuccess = () => {
      const database = request.result
      database.onversionchange = () => {
        database.close()
        connections.delete(name)
      }
      resolve(database)
    }
  })

  connections.set(name, opening)
  void opening.catch(() => {
    if (connections.get(name) === opening) connections.delete(name)
  })
  return opening
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error ?? new Error('Операция с изображением была прервана.'))
    transaction.onerror = () => reject(transaction.error ?? new Error('Не удалось изменить локальное изображение.'))
  })
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Не удалось прочитать локальное изображение.'))
  })
}

function isAsset(value: unknown): value is CampaignWikiImageAsset {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const asset = value as Partial<CampaignWikiImageAsset>
  return typeof asset.id === 'string'
    && (asset.kind === 'cover' || asset.kind === 'avatar')
    && asset.blob instanceof Blob
    && typeof asset.width === 'number'
    && Number.isFinite(asset.width)
    && typeof asset.height === 'number'
    && Number.isFinite(asset.height)
    && typeof asset.mimeType === 'string'
    && typeof asset.size === 'number'
    && typeof asset.updatedAt === 'string'
}

function announce(change: CampaignWikiImageChange) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<CampaignWikiImageChange>(
    CAMPAIGN_WIKI_IMAGE_CHANGED_EVENT,
    { detail: change },
  ))
}

export async function saveCampaignWikiImage(
  source: Blob,
  options: SaveCampaignWikiImageOptions,
  scope = getCampaignWikiImageAccountScope(),
): Promise<CampaignWikiImageAsset> {
  const id = validAssetId(options.assetId ?? newAssetId())
  const processed = await processCampaignWikiImage(source, options.kind)
  const asset: CampaignWikiImageAsset = {
    id,
    kind: options.kind,
    blob: processed.blob,
    width: processed.width,
    height: processed.height,
    mimeType: processed.blob.type,
    size: processed.blob.size,
    updatedAt: new Date().toISOString(),
  }

  const database = await openDatabase(scope)
  const transaction = database.transaction(ASSETS_STORE, 'readwrite')
  const done = transactionDone(transaction)
  transaction.objectStore(ASSETS_STORE).put(asset)
  await done
  announce({ scope, assetId: id, operation: 'save' })
  return asset
}

export async function getCampaignWikiImage(
  assetId: string,
  scope = getCampaignWikiImageAccountScope(),
): Promise<CampaignWikiImageAsset | undefined> {
  const id = validAssetId(assetId)
  const database = await openDatabase(scope)
  const transaction = database.transaction(ASSETS_STORE, 'readonly')
  const done = transactionDone(transaction)
  const value = await requestResult<unknown>(transaction.objectStore(ASSETS_STORE).get(id))
  await done
  if (value === undefined) return undefined
  if (!isAsset(value)) throw new Error('Сохранённое изображение имеет неизвестный формат.')
  return value
}

export async function removeCampaignWikiImage(
  assetId: string,
  scope = getCampaignWikiImageAccountScope(),
): Promise<void> {
  const id = validAssetId(assetId)
  const database = await openDatabase(scope)
  const transaction = database.transaction(ASSETS_STORE, 'readwrite')
  const done = transactionDone(transaction)
  transaction.objectStore(ASSETS_STORE).delete(id)
  await done
  announce({ scope, assetId: id, operation: 'remove' })
}

/** Фиксирует аккаунт до начала асинхронной операции и не допускает запись после выхода в guest. */
export function captureCampaignWikiImageRepository(
  scope = getCampaignWikiImageAccountScope(),
): CampaignWikiImageRepository {
  return {
    scope,
    save: (source, options) => saveCampaignWikiImage(source, options, scope),
    get: assetId => getCampaignWikiImage(assetId, scope),
    remove: assetId => removeCampaignWikiImage(assetId, scope),
  }
}

