export type CampaignWikiImageKind = 'cover' | 'avatar'

export type ProcessedCampaignWikiImage = {
  blob: Blob
  width: number
  height: number
}

export const CAMPAIGN_WIKI_IMAGE_LIMITS = {
  cover: 1600,
  avatar: 512,
} as const satisfies Record<CampaignWikiImageKind, number>

export const CAMPAIGN_WIKI_MAX_SOURCE_BYTES = 15 * 1024 * 1024
export const CAMPAIGN_WIKI_MAX_SOURCE_PIXELS = 40_000_000
const CAMPAIGN_WIKI_MAX_RESULT_BYTES = 8 * 1024 * 1024
const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

type LoadedImage = {
  image: HTMLImageElement
  release: () => void
}

function loadImage(blob: Blob): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()
    let released = false

    const release = () => {
      if (released) return
      released = true
      image.onload = null
      image.onerror = null
      URL.revokeObjectURL(url)
    }

    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        release()
        reject(new Error('Не удалось определить размер изображения.'))
        return
      }
      if (image.naturalWidth * image.naturalHeight > CAMPAIGN_WIKI_MAX_SOURCE_PIXELS) {
        release()
        reject(new Error('Изображение слишком большое. Выберите файл до 40 мегапикселей.'))
        return
      }
      resolve({ image, release })
    }
    image.onerror = () => {
      release()
      reject(new Error('Не удалось прочитать изображение. Файл повреждён или имеет неподдерживаемый формат.'))
    }
    image.src = url
  })
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((webp) => {
      if (webp) {
        resolve(webp)
        return
      }
      canvas.toBlob((png) => {
        if (png) resolve(png)
        else reject(new Error('Браузер не смог обработать изображение.'))
      }, 'image/png')
    }, 'image/webp', 0.88)
  })
}

/** Проверяет файл и сохраняет реальное изображение с ограниченной длинной стороной. */
export async function processCampaignWikiImage(
  source: Blob,
  kind: CampaignWikiImageKind,
): Promise<ProcessedCampaignWikiImage> {
  if (!(source instanceof Blob) || !source.size) {
    throw new Error('Файл изображения пуст.')
  }
  if (!acceptedTypes.has(source.type)) {
    throw new Error('Поддерживаются изображения JPEG, PNG и WebP.')
  }
  if (source.size > CAMPAIGN_WIKI_MAX_SOURCE_BYTES) {
    throw new Error('Размер изображения должен быть не больше 15 МБ.')
  }

  const loaded = await loadImage(source)
  try {
    const maxDimension = CAMPAIGN_WIKI_IMAGE_LIMITS[kind]
    const scale = Math.min(
      1,
      maxDimension / Math.max(loaded.image.naturalWidth, loaded.image.naturalHeight),
    )
    const width = Math.max(1, Math.round(loaded.image.naturalWidth * scale))
    const height = Math.max(1, Math.round(loaded.image.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Браузер не смог открыть обработчик изображений.')

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(loaded.image, 0, 0, width, height)

    const blob = await canvasBlob(canvas)
    if (blob.size > CAMPAIGN_WIKI_MAX_RESULT_BYTES) {
      throw new Error('Обработанное изображение получилось слишком большим.')
    }
    return { blob, width, height }
  } finally {
    loaded.release()
  }
}

