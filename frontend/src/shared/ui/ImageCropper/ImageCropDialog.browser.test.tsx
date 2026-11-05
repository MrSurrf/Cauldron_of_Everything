import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import '../../../app/styles/global.css'
import '../../styles/tokens.css'
import { ImageCropDialog } from './ImageCropDialog'
import { exportCroppedImage, initialImageCrop, loadCropImage } from './imageProcessing'

let host: HTMLDivElement
let root: Root | undefined

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  // Портреты листа живут под transform: диалог должен всё равно попасть в top layer.
  host.style.transform = 'scale(0.5)'
  document.body.append(host)
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  host.remove()
  vi.restoreAllMocks()
})

async function fixture(width = 800, height = 600) {
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const context = canvas.getContext('2d')!
  context.fillStyle = 'red'; context.fillRect(0, 0, width / 2, height)
  context.fillStyle = 'blue'; context.fillRect(width / 2, 0, width / 2, height)
  const blob = await new Promise<Blob>(resolve => canvas.toBlob(value => resolve(value!), 'image/png'))
  return new File([blob], 'portrait.png', { type: 'image/png' })
}

async function mount(file: File, initialAspectRatio?: number) {
  const onConfirm = vi.fn<(file: File) => void>()
  const onCancel = vi.fn()
  root = createRoot(host)
  await act(async () => root!.render(<ImageCropDialog file={file} initialAspectRatio={initialAspectRatio} onConfirm={onConfirm} onCancel={onCancel} />))
  await settle()
  const dialog = document.querySelector<HTMLDialogElement>('[data-image-crop-dialog]')!
  return { dialog, onConfirm, onCancel }
}

async function settle() { await act(async () => { await new Promise(resolve => window.setTimeout(resolve, 40)) }) }
async function click(element: HTMLElement) { await act(async () => element.click()); await settle() }
function button(dialog: HTMLElement, text: string) {
  return Array.from(dialog.querySelectorAll('button')).find(element => element.textContent?.trim() === text)!
}

describe('Общее кадрирование загружаемых изображений', () => {
  it('выносит модальное окно из transform, показывает свободную рамку и сохраняет только после Применить', async () => {
    const file = await fixture()
    const { dialog, onConfirm } = await mount(file)
    expect(dialog.parentElement).toBe(document.body)
    expect(dialog.matches(':modal')).toBe(true)
    await expect.poll(() => dialog.querySelectorAll('[data-crop-handle]').length).toBe(8)
    expect(dialog.querySelector('input[type="range"]')).toBeNull()
    expect(onConfirm).not.toHaveBeenCalled()
    await click(button(dialog, 'Применить'))
    await expect.poll(() => onConfirm.mock.calls.length).toBe(1)
    const saved = onConfirm.mock.calls[0][0]
    expect(saved).toBeInstanceOf(File)
    expect(saved).not.toBe(file)
    expect(saved.name).toBe('portrait-cropped.webp')
  })

  it('показывает квадрат для аватара и позволяет переключиться на свободный кадр', async () => {
    const { dialog, onConfirm } = await mount(await fixture(), 1)
    await expect.poll(() => dialog.querySelector<HTMLElement>('[data-crop-frame]')?.offsetWidth ?? 0).toBeGreaterThan(0)
    const frame = dialog.querySelector<HTMLElement>('[data-crop-frame]')!
    expect(Math.abs(frame.getBoundingClientRect().width - frame.getBoundingClientRect().height)).toBeLessThan(2)
    const before = { left: frame.style.left, top: frame.style.top, width: frame.style.width, height: frame.style.height }
    await click(dialog.querySelector<HTMLButtonElement>('[role="combobox"]')!)
    const options = dialog.querySelectorAll<HTMLElement>('[role="option"]')
    expect(options).toHaveLength(4)
    await click(options[0])
    expect({ left: frame.style.left, top: frame.style.top, width: frame.style.width, height: frame.style.height }).toEqual(before)
    await click(button(dialog, 'Сбросить'))
    expect(frame.style.width).toBe('100%')
    expect(frame.style.height).toBe('100%')
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('Escape и backdrop отменяют выбор без сохранения', async () => {
    const { dialog, onConfirm, onCancel } = await mount(await fixture())
    await act(async () => {
      dialog.querySelector<HTMLElement>('[data-crop-frame]')!.focus()
      await userEvent.keyboard('{Escape}')
    })
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
    const box = dialog.getBoundingClientRect()
    await act(async () => dialog.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: box.left - 10, clientY: box.top - 10 })))
    expect(onCancel).toHaveBeenCalledTimes(2)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('показывает ошибку повреждённого файла и не разрешает сохранение', async () => {
    const { dialog, onConfirm } = await mount(new File(['not an image'], 'broken.png', { type: 'image/png' }))
    await expect.poll(() => dialog.querySelector('[role="alert"]')?.textContent).toContain('Не удалось прочитать')
    expect(button(dialog, 'Применить').disabled).toBe(true)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('освобождает URL фотографии после закрытия', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    const { dialog } = await mount(await fixture())
    await expect.poll(() => dialog.querySelector('img')?.src).toContain('blob:')
    const url = dialog.querySelector('img')!.src
    await act(async () => root?.unmount()); root = undefined
    expect(revoke).toHaveBeenCalledWith(url)
    expect(document.querySelector('[data-image-crop-dialog]')).toBeNull()
  })

  it('проверяет тип, пустой файл и лимит размера до декодирования', async () => {
    await expect(loadCropImage(new File(['text'], 'file.svg', { type: 'image/svg+xml' }))).rejects.toThrow('JPEG, PNG и WebP')
    await expect(loadCropImage(new File([], 'empty.png', { type: 'image/png' }))).rejects.toThrow('пуст')
    await expect(loadCropImage(new File([new Uint8Array(20)], 'large.png', { type: 'image/png' }), 10)).rejects.toThrow('не больше')
  })

  it('проверяет лимит в 40 мегапикселей и освобождает URL при отказе', async () => {
    const file = await fixture()
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(10000)
    vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(5000)
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    await expect(loadCropImage(file)).rejects.toThrow('40 мегапикселей')
    expect(revoke).toHaveBeenCalledTimes(1)
  })

  it('обрезает реальные пиксели, соблюдает пропорции и ограничивает длинную сторону 1024', async () => {
    const loaded = await loadCropImage(await fixture(2400, 1200))
    try {
      expect(initialImageCrop(2400, 1200, 1)).toEqual({ x: 0.25, y: 0, width: 0.5, height: 1 })
      const cropped = await exportCroppedImage(loaded.image, { x: 0.5, y: 0, width: 0.5, height: 1 }, 'portrait.png')
      const bitmap = await createImageBitmap(cropped)
      try {
        expect(bitmap.width).toBe(1024); expect(bitmap.height).toBe(1024)
        const canvas = document.createElement('canvas')
        canvas.width = 1024; canvas.height = 1024
        const context = canvas.getContext('2d')!
        context.drawImage(bitmap, 0, 0)
        const pixel = context.getImageData(512, 512, 1, 1).data
        expect(pixel[0]).toBeLessThan(15); expect(pixel[2]).toBeGreaterThan(240)
      } finally { bitmap.close() }
    } finally { loaded.release() }
  })
})
