export type ArticleImageEdits = {
  rotation: 0 | 90 | 180 | 270
  /** Нормализованный прямоугольник в уже повёрнутом изображении. */
  crop: { x: number; y: number; width: number; height: number }
  brightness: number
  saturation: number
  contrast: number
}

export type ArticleImage = {
  id: string
  assetId: string
  name: string
  alt: string
  caption: string
  edits: ArticleImageEdits
}

export type ArticleEntity = {
  id: number
  type: string
  slug: string
  name: string
  nameEn: string
  summary: Record<string, unknown>
}

export type ArticleDraft = {
  version: 1
  id: string
  title: string
  description: string
  markdown: string
  images: ArticleImage[]
  coverImageId: string | null
  entities: ArticleEntity[]
  /** Локальная настройка времени, не подтверждение серверного задания. */
  scheduledFor: string | null
  createdAt: string
  updatedAt: string
}

export const DEFAULT_IMAGE_EDITS: Readonly<ArticleImageEdits> = Object.freeze({
  rotation: 0,
  crop: Object.freeze({ x: 0, y: 0, width: 1, height: 1 }),
  brightness: 100,
  saturation: 100,
  contrast: 100,
})

export function createArticleDraft(): ArticleDraft {
  const now = new Date().toISOString()
  return {
    version: 1,
    id: crypto.randomUUID(),
    title: '',
    description: '',
    markdown: '',
    images: [],
    coverImageId: null,
    entities: [],
    scheduledFor: null,
    createdAt: now,
    updatedAt: now,
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value))
}

export function isArticleDraft(value: unknown): value is ArticleDraft {
  if (!isObject(value)) return false
  return value.version === 1 && typeof value.id === 'string' && Boolean(value.id)
    && ['title', 'description', 'markdown'].every(key => typeof value[key] === 'string')
    && isDate(value.createdAt) && isDate(value.updatedAt)
    && (value.scheduledFor === null || isDate(value.scheduledFor))
    && (value.coverImageId === null || typeof value.coverImageId === 'string')
    && Array.isArray(value.entities) && value.entities.every(entity => isObject(entity)
      && Number.isSafeInteger(entity.id) && Number(entity.id) > 0
      && ['type', 'slug', 'name', 'nameEn'].every(key => typeof entity[key] === 'string')
      && isObject(entity.summary))
    && Array.isArray(value.images) && value.images.every(image => {
      if (!isObject(image) || !['id', 'assetId', 'name', 'alt', 'caption'].every(key => typeof image[key] === 'string')) return false
      const edits = image.edits
      if (!isObject(edits) || typeof edits.rotation !== 'number' || ![0, 90, 180, 270].includes(edits.rotation)) return false
      if (!['brightness', 'saturation', 'contrast'].every(key => typeof edits[key] === 'number'
        && Number.isFinite(edits[key]) && edits[key] >= 0 && edits[key] <= 200)) return false
      const crop = edits.crop
      return isObject(crop) && ['x', 'y', 'width', 'height'].every(key => typeof crop[key] === 'number'
        && Number.isFinite(crop[key]) && crop[key] >= 0 && crop[key] <= 1)
        && Number(crop.width) > 0 && Number(crop.height) > 0
        && Number(crop.x) + Number(crop.width) <= 1.000001
        && Number(crop.y) + Number(crop.height) <= 1.000001
    })
}
