import { normalizeCrop } from './cropGeometry'
import type { CropRect } from './cropGeometry'

export const DEFAULT_CROP_FILE_SIZE = 5 * 1024 * 1024
const MAX_IMAGE_PIXELS = 40_000_000
const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export type LoadedCropImage = { image: HTMLImageElement; url: string; release: () => void }

/** URL принадлежит вызывающему компоненту и освобождается при закрытии редактора. */
export async function loadCropImage(file: File, maxFileSize = DEFAULT_CROP_FILE_SIZE, signal?: AbortSignal): Promise<LoadedCropImage> {
  if (!acceptedTypes.has(file.type)) throw new Error('Поддерживаются изображения JPEG, PNG и WebP.')
  if (!file.size) throw new Error('Файл изображения пуст. Выберите другую фотографию.')
  if (file.size > maxFileSize) throw new Error(`Изображение должно быть не больше ${Math.round(maxFileSize / 1024 / 1024)} МБ.`)
  if (signal?.aborted) throw new DOMException('Загрузка отменена.', 'AbortError')
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    let released = false
    const release = () => {
      if (released) return
      released = true
      image.onload = null; image.onerror = null
      URL.revokeObjectURL(url)
      signal?.removeEventListener('abort', abort)
    }
    const abort = () => { release(); image.src = ''; reject(new DOMException('Загрузка отменена.', 'AbortError')) }
    signal?.addEventListener('abort', abort, { once: true })
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        release(); reject(new Error('Не удалось прочитать изображение. Выберите другую фотографию.'))
      } else if (image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS) {
        release(); reject(new Error('Изображение слишком большое. Выберите фотографию до 40 мегапикселей.'))
      } else {
        image.onload = null; image.onerror = null
        signal?.removeEventListener('abort', abort)
        resolve({ image, url, release })
      }
    }
    image.onerror = () => { release(); reject(new Error('Не удалось прочитать изображение. Файл повреждён или имеет неподдерживаемый формат.')) }
    image.src = url
  })
}

/** Максимальный центральный кадр заданной пропорции; без пропорции — всё изображение. */
export function initialImageCrop(width: number, height: number, aspectRatio?: number): CropRect {
  if (!aspectRatio || !Number.isFinite(aspectRatio) || aspectRatio <= 0) return { x: 0, y: 0, width: 1, height: 1 }
  const normalizedAspect = aspectRatio / (width / height)
  const cropWidth = Math.min(1, normalizedAspect)
  const cropHeight = Math.min(1, 1 / normalizedAspect)
  return { x: (1 - cropWidth) / 2, y: (1 - cropHeight) / 2, width: cropWidth, height: cropHeight }
}

/** Возвращается новый файл с действительно обрезанными пикселями, а не только метаданные. */
export async function exportCroppedImage(image: HTMLImageElement, crop: CropRect, originalName: string): Promise<File> {
  const rect = normalizeCrop(crop)
  const sourceWidth = image.naturalWidth * rect.width
  const sourceHeight = image.naturalHeight * rect.height
  const scale = Math.min(1, 1024 / Math.max(sourceWidth, sourceHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(sourceWidth * scale))
  canvas.height = Math.max(1, Math.round(sourceHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Браузер не смог обработать изображение. Попробуйте другой браузер.')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, image.naturalWidth * rect.x, image.naturalHeight * rect.y, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob>((resolve, reject) => {
    // WebP сохраняет прозрачность. Браузеры без WebP-encoder вернут PNG.
    canvas.toBlob(result => result ? resolve(result) : reject(new Error('Не удалось сохранить кадрирование. Попробуйте ещё раз.')), 'image/webp', 0.9)
  })
  if (blob.size > DEFAULT_CROP_FILE_SIZE) throw new Error('Обработанное изображение слишком большое. Выберите меньшую область.')
  const extension = blob.type === 'image/webp' ? 'webp' : 'png'
  return new File([blob], `${originalName.replace(/\.[^.]+$/, '') || 'portrait'}-cropped.${extension}`, { type: blob.type, lastModified: Date.now() })
}
