import { captureImageAssetRepository } from '../model'
import type { ArticleImage } from '../model'

export type ArticleImageDimensions = { width: number; height: number }
type ImageAssetRepository = ReturnType<typeof captureImageAssetRepository>

const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const MAX_IMAGE_PIXELS = 40_000_000
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const renderedImages = new Map<string, Promise<Blob>>()
const imageDimensions = new Map<string, Promise<ArticleImageDimensions>>()

function loadImage(blob: Blob): Promise<{ image: HTMLImageElement; release: () => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS) {
        URL.revokeObjectURL(url)
        reject(new Error('Изображение слишком большое. Выберите фотографию до 40 мегапикселей.'))
        return
      }
      resolve({ image, release: () => URL.revokeObjectURL(url) })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Не удалось прочитать изображение. Выберите другой файл JPEG, PNG или WebP.'))
    }
    image.src = url
  })
}

export async function validateArticleImageFile(file: File): Promise<void> {
  if (!imageTypes.has(file.type)) throw new Error('Поддерживаются фотографии JPEG, PNG и WebP.')
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Размер каждой фотографии — не больше 20 МБ.')
  if (!file.size) throw new Error('Файл изображения пуст.')
  const { release } = await loadImage(file)
  release()
}

export function getArticleImageDimensions(assetId: string, repository = captureImageAssetRepository()): Promise<ArticleImageDimensions> {
  const key = JSON.stringify([repository.scope, assetId])
  const existing = imageDimensions.get(key)
  if (existing) return existing
  const request = (async () => {
    const blob = await repository.get(assetId)
    if (!blob) throw new Error('Оригинал фотографии не найден в этом браузере.')
    const { image, release } = await loadImage(blob)
    try {
      return { width: image.naturalWidth, height: image.naturalHeight }
    } finally { release() }
  })()
  imageDimensions.set(key, request)
  void request.catch(() => { if (imageDimensions.get(key) === request) imageDimensions.delete(key) })
  if (imageDimensions.size > 100) imageDimensions.delete(imageDimensions.keys().next().value!)
  return request
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

export function normalizeArticleCrop(crop: ArticleImage['edits']['crop']): ArticleImage['edits']['crop'] {
  const width = clamp(crop.width, 0.01, 1)
  const height = clamp(crop.height, 0.01, 1)
  return { x: clamp(crop.x, 0, 1 - width), y: clamp(crop.y, 0, 1 - height), width, height }
}

/** Оригинал не меняется: поворот, кадрирование и цвет применяются только к новой копии. */
export function renderArticleImage(articleImage: ArticleImage, maxSize = 1600, repository: ImageAssetRepository = captureImageAssetRepository()): Promise<Blob> {
  const size = clamp(Math.round(maxSize), 32, 4096)
  const key = JSON.stringify([repository.scope, articleImage.assetId, articleImage.edits, size])
  const existing = renderedImages.get(key)
  if (existing) return existing
  const request = (async () => {
    const blob = await repository.get(articleImage.assetId)
    if (!blob) throw new Error('Оригинал фотографии не найден в этом браузере.')
    const { image, release } = await loadImage(blob)
    try {
      const { rotation } = articleImage.edits
      const rotated = rotation === 90 || rotation === 270
      const width = rotated ? image.naturalHeight : image.naturalWidth
      const height = rotated ? image.naturalWidth : image.naturalHeight
      const crop = normalizeArticleCrop(articleImage.edits.crop)
      const croppedWidth = width * crop.width
      const croppedHeight = height * crop.height
      const scale = Math.min(1, size / Math.max(croppedWidth, croppedHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(croppedWidth * scale))
      canvas.height = Math.max(1, Math.round(croppedHeight * scale))
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Браузер не смог открыть редактор фотографий.')
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.filter = `brightness(${clamp(articleImage.edits.brightness, 0, 200)}%) saturate(${clamp(articleImage.edits.saturation, 0, 200)}%) contrast(${clamp(articleImage.edits.contrast, 0, 200)}%)`
      context.scale(canvas.width / croppedWidth, canvas.height / croppedHeight)
      context.translate(-width * crop.x, -height * crop.y)
      if (rotation === 90) context.translate(image.naturalHeight, 0)
      else if (rotation === 180) context.translate(image.naturalWidth, image.naturalHeight)
      else if (rotation === 270) context.translate(0, image.naturalWidth)
      context.rotate(rotation * Math.PI / 180)
      context.drawImage(image, 0, 0)
      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(result => result ? resolve(result) : reject(new Error('Не удалось обработать фотографию.')), 'image/webp', 0.9)
      })
    } finally { release() }
  })()
  renderedImages.set(key, request)
  void request.catch(() => { if (renderedImages.get(key) === request) renderedImages.delete(key) })
  if (renderedImages.size > 32) renderedImages.delete(renderedImages.keys().next().value!)
  return request
}
