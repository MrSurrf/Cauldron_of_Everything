import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'

import { captureImageAssetRepository, DEFAULT_IMAGE_EDITS, getImageAsset, saveImageAsset } from '../model'
import type { ArticleImage } from '../model'
import { getArticleImageDimensions, normalizeArticleCrop, renderArticleImage, validateArticleImageFile } from './articleImageProcessing'
import { ArticleImages } from './ArticleImages'

async function fixture(): Promise<{ original: Blob; image: ArticleImage }> {
  const canvas = document.createElement('canvas')
  canvas.width = 80
  canvas.height = 40
  const context = canvas.getContext('2d')!
  context.fillStyle = 'red'; context.fillRect(0, 0, 40, 20)
  context.fillStyle = 'lime'; context.fillRect(40, 0, 40, 20)
  context.fillStyle = 'blue'; context.fillRect(0, 20, 40, 20)
  context.fillStyle = 'yellow'; context.fillRect(40, 20, 40, 20)
  const original = await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!), 'image/png'))
  const assetId = crypto.randomUUID()
  await saveImageAsset(assetId, original)
  return { original, image: { id: crypto.randomUUID(), assetId, name: 'corners.png', alt: 'Четыре цветных угла', caption: '',
    edits: { ...DEFAULT_IMAGE_EDITS, crop: { ...DEFAULT_IMAGE_EDITS.crop } } } }
}

async function pixels(blob: Blob) {
  const bitmap = await createImageBitmap(blob)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')!
    context.drawImage(bitmap, 0, 0)
    return { width: canvas.width, height: canvas.height, at: (x: number, y: number) => Array.from(context.getImageData(x, y, 1, 1).data) }
  } finally { bitmap.close() }
}

describe('Неразрушительная обработка фотографий статьи', () => {
  it('читает исходные размеры и сохраняет пропорции при уменьшении', async () => {
    const { image } = await fixture()
    expect(await getArticleImageDimensions(image.assetId)).toEqual({ width: 80, height: 40 })
    const result = await pixels(await renderArticleImage(image, 40))
    expect([result.width, result.height]).toEqual([40, 20])
  })

  it('поворачивает на 90 градусов по часовой стрелке', async () => {
    const { image } = await fixture()
    image.edits.rotation = 90
    const result = await pixels(await renderArticleImage(image))
    expect([result.width, result.height]).toEqual([40, 80])
    const topLeft = result.at(8, 8)
    const topRight = result.at(32, 8)
    expect(topLeft[2]).toBeGreaterThan(220)
    expect(topLeft[0]).toBeLessThan(25)
    expect(topRight[0]).toBeGreaterThan(220)
    expect(topRight[2]).toBeLessThan(25)
  })

  it('кадрирует в нормализованных координатах повёрнутого изображения', async () => {
    const { image } = await fixture()
    image.edits.rotation = 90
    image.edits.crop = { x: 0, y: 0, width: 1, height: 0.5 }
    const result = await pixels(await renderArticleImage(image))
    expect([result.width, result.height]).toEqual([40, 40])
    expect(result.at(8, 8)[2]).toBeGreaterThan(220)
    expect(result.at(32, 8)[0]).toBeGreaterThan(220)
  })

  it('применяет цветокоррекцию и не меняет оригинальный Blob', async () => {
    const { original, image } = await fixture()
    image.edits.brightness = 0
    const result = await pixels(await renderArticleImage(image))
    expect(result.at(8, 8).slice(0, 3)).toEqual([0, 0, 0])
    const preserved = await getImageAsset(image.assetId)
    expect(Array.from(new Uint8Array(await preserved!.arrayBuffer())))
      .toEqual(Array.from(new Uint8Array(await original.arrayBuffer())))
  })

  it('защищает границы кадра и сообщает об отсутствующем оригинале', async () => {
    expect(normalizeArticleCrop({ x: 0.9, y: -1, width: 0.5, height: 2 }))
      .toEqual({ x: 0.5, y: 0, width: 0.5, height: 1 })
    const { image } = await fixture()
    image.assetId = crypto.randomUUID()
    await expect(renderArticleImage(image)).rejects.toThrow('Оригинал фотографии не найден')
  })

  it('проверяет тип и декодирование файла перед сохранением', async () => {
    const { original } = await fixture()
    await expect(validateArticleImageFile(new File([original], 'valid.png', { type: 'image/png' }))).resolves.toBeUndefined()
    await expect(validateArticleImageFile(new File(['text'], 'text.txt', { type: 'text/plain' }))).rejects.toThrow('JPEG, PNG и WebP')
    await expect(validateArticleImageFile(new File(['broken'], 'broken.png', { type: 'image/png' }))).rejects.toThrow('Не удалось прочитать')
    await expect(validateArticleImageFile(new File([], 'empty.png', { type: 'image/png' }))).rejects.toThrow('пуст')
  })

  it('разделяет Blob и размеры в кэше даже при одинаковом assetId у разных аккаунтов', async () => {
    const previousToken = localStorage.getItem('surveyAuth.access')
    const userPrefix = crypto.randomUUID()
    const setUser = (suffix: string) => localStorage.setItem('surveyAuth.access', `header.${btoa(JSON.stringify({ user_id: `${userPrefix}-${suffix}` }))}.signature`)
    try {
      setUser('first')
      const firstRepository = captureImageAssetRepository()
      const { image } = await fixture()
      expect(await getArticleImageDimensions(image.assetId)).toEqual({ width: 80, height: 40 })
      expect((await pixels(await renderArticleImage(image))).at(8, 8)[0]).toBeGreaterThan(220)

      setUser('second')
      const secondRepository = captureImageAssetRepository()
      const canvas = document.createElement('canvas')
      canvas.width = 40; canvas.height = 80
      const context = canvas.getContext('2d')!
      context.fillStyle = 'blue'; context.fillRect(0, 0, 40, 80)
      const secondBlob = await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!), 'image/png'))
      await secondRepository.save(image.assetId, secondBlob)
      expect(await getArticleImageDimensions(image.assetId)).toEqual({ width: 40, height: 80 })
      const secondPixels = await pixels(await renderArticleImage(image))
      expect([secondPixels.width, secondPixels.height]).toEqual([40, 80])
      expect(secondPixels.at(8, 8)[2]).toBeGreaterThan(220)
      expect(secondPixels.at(8, 8)[0]).toBeLessThan(25)

      // Начатая в первом аккаунте операция остаётся привязанной к нему после смены токена.
      expect(await getArticleImageDimensions(image.assetId, firstRepository)).toEqual({ width: 80, height: 40 })
      expect((await pixels(await renderArticleImage(image, 1600, firstRepository))).at(8, 8)[0]).toBeGreaterThan(220)

      setUser('third')
      await expect(getArticleImageDimensions(image.assetId)).rejects.toThrow('Оригинал фотографии не найден')
      await expect(renderArticleImage(image)).rejects.toThrow('Оригинал фотографии не найден')
    } finally {
      if (previousToken === null) localStorage.removeItem('surveyAuth.access')
      else localStorage.setItem('surveyAuth.access', previousToken)
    }
  })

  it('открывает медиатеку пустого черновика без падения', async () => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    try {
      await act(async () => root.render(<ArticleImages images={[]} coverImageId={null} onChange={vi.fn()} onCoverChange={vi.fn()} onInsert={vi.fn()} />))
      expect(host.textContent).toContain('Добавьте первую фотографию')
      expect(host.querySelector('[data-article-image-upload]')).not.toBeNull()
      expect(host.querySelector('[data-article-image-selected]')).toBeNull()
    } finally {
      await act(async () => root.unmount())
      host.remove()
    }
  })

  it('вписывает повёрнутый портрет целиком и не фиксирует пропорции по сохранённому crop', async () => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const { image } = await fixture()
    // Исходное кадрирование 16:9 повёрнуто на 90°: нормализованные координаты тоже повёрнуты.
    image.edits.rotation = 90
    image.edits.crop = { x: 0, y: 1 / 18, width: 1, height: 8 / 9 }
    const host = document.createElement('div')
    host.style.width = '320px'; host.style.height = '900px'
    document.body.append(host)
    const root = createRoot(host)
    const render = async () => {
      await act(async () => root.render(<ArticleImages images={[image]} coverImageId={image.id} onChange={vi.fn()} onCoverChange={vi.fn()} onInsert={vi.fn()} />))
      await act(async () => { await new Promise(resolve => window.setTimeout(resolve, 150)) })
    }
    try {
      await render()
      expect(host.querySelector('[aria-label="Пропорции кадра"]')!.textContent).toContain('Свободные пропорции')
      const preview = host.querySelector<HTMLElement>('[data-article-image-selected]')!
      const photo = preview.querySelector<HTMLImageElement>('img')!
      await photo.decode()
      expect(photo.naturalHeight).toBeGreaterThan(photo.naturalWidth)
      expect(getComputedStyle(photo).objectFit).toBe('contain')
      expect(photo.getBoundingClientRect().height).toBeCloseTo(preview.clientHeight, 0)
      expect(photo.getBoundingClientRect().top).toBeCloseTo(preview.getBoundingClientRect().top + preview.clientTop, 0)

      image.edits.crop = { x: 0.1, y: 0.1, width: 0.2, height: 0.3 }
      await render()
      expect(host.querySelector('[aria-label="Пропорции кадра"]')!.textContent).toContain('Свободные пропорции')
      image.edits.crop = { x: 0, y: 0, width: 1, height: 1 }
      await render()
      expect(host.querySelector('[aria-label="Пропорции кадра"]')!.textContent).toContain('Свободные пропорции')
    } finally {
      await act(async () => root.unmount())
      host.remove()
    }
  })
})
