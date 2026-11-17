import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { userEvent } from 'vitest/browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '../../../../app/styles/global.css'
import '../../../../shared/styles/tokens.css'
import { CharacterSheetTool } from '../../CharacterSheetTool'
import { createMockCharacterSheet } from '../../model'
import type { CharacterSheetDocument } from '../../model'
import { CharacterPortrait } from './CharacterPortrait'

let host: HTMLDivElement
let root: Root | undefined

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  host.style.width = '1200px'
  host.style.height = '900px'
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  host.remove()
  vi.restoreAllMocks()
})

async function pictureFile() {
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 600
  const context = canvas.getContext('2d')!
  context.fillStyle = 'red'
  context.fillRect(0, 0, 400, 600)
  context.fillStyle = 'blue'
  context.fillRect(400, 0, 400, 600)
  const blob = await new Promise<Blob>(resolve => canvas.toBlob(value => resolve(value!), 'image/png'))
  return new File([blob], 'hero.png', { type: 'image/png' })
}

async function upload(file: File) {
  const input = host.querySelector<HTMLInputElement>('input[type="file"]')!
  const transfer = new DataTransfer()
  transfer.items.add(file)
  await act(async () => {
    input.files = transfer.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => window.setTimeout(resolve, 40))
  })
}

function dialog() {
  return document.querySelector<HTMLDialogElement>('[data-image-crop-dialog]')
}

function cropButton(text: string) {
  return Array.from(dialog()!.querySelectorAll('button')).find(button => button.textContent?.trim() === text)!
}

async function applyCrop() {
  await expect.poll(() => dialog() && !cropButton('Применить').disabled).toBe(true)
  await act(async () => {
    cropButton('Применить').click()
    await new Promise(resolve => window.setTimeout(resolve, 40))
  })
  await expect.poll(() => dialog()).toBeNull()
}

describe('Кадрирование портрета персонажа', () => {
  it('открывает рамку до изменения портрета и отдаёт реально обрезанный файл только после подтверждения', async () => {
    const onFileSelect = vi.fn<(file: File) => void>()
    const onImageChange = vi.fn<(url: string) => void>()
    await act(async () => root!.render(<div style={{ width: 160 }}><CharacterPortrait portraitUrl={null} onFileSelect={onFileSelect} onImageChange={onImageChange} /></div>))
    const original = await pictureFile()
    await upload(original)
    await expect.poll(() => dialog()?.matches(':modal')).toBe(true)
    expect(onFileSelect).not.toHaveBeenCalled()
    expect(onImageChange).not.toHaveBeenCalled()
    expect(host.querySelector('img')).toBeNull()
    await expect.poll(() => dialog()?.querySelectorAll('[data-crop-handle]').length).toBe(8)
    expect(dialog()!.querySelector('input[type="range"]')).toBeNull()

    await applyCrop()
    expect(onFileSelect).toHaveBeenCalledTimes(1)
    expect(onImageChange).toHaveBeenCalledTimes(1)
    const cropped = onFileSelect.mock.calls[0][0]
    expect(cropped).toBeInstanceOf(File)
    expect(cropped).not.toBe(original)
    expect(cropped.type).toMatch(/^image\/(webp|png)$/)
    expect(cropped.name).toMatch(/^hero-cropped\.(webp|png)$/)
    const bitmap = await createImageBitmap(cropped)
    try {
      expect(bitmap.width).toBe(600)
      expect(bitmap.height).toBe(600)
    } finally { bitmap.close() }
    expect(onImageChange.mock.calls[0][0]).toMatch(/^data:image\/(webp|png);base64,/)
    const preview = host.querySelector('img')!
    await expect.poll(() => preview.complete && preview.naturalWidth > 0).toBe(true)
    expect(preview.naturalWidth).toBe(600)
    expect(preview.naturalHeight).toBe(600)
  })

  it.each(['Отмена', 'Escape'])('сохраняет прежний портрет при отмене через %s', async action => {
    const oldPortrait = '/favicon.svg'
    const onFileSelect = vi.fn()
    const onImageChange = vi.fn()
    await act(async () => root!.render(<div style={{ width: 160 }}><CharacterPortrait portraitUrl={oldPortrait} onFileSelect={onFileSelect} onImageChange={onImageChange} /></div>))
    await upload(await pictureFile())
    await expect.poll(() => dialog()?.querySelector('[data-crop-frame]')).not.toBeNull()
    if (action === 'Escape') {
      await act(async () => {
        dialog()!.querySelector<HTMLElement>('[data-crop-frame]')!.focus()
        await userEvent.keyboard('{Escape}')
      })
    } else {
      await act(async () => cropButton('Отмена').click())
    }
    await expect.poll(() => dialog()).toBeNull()
    expect(host.querySelector('img')?.getAttribute('src')).toBe(oldPortrait)
    expect(onFileSelect).not.toHaveBeenCalled()
    expect(onImageChange).not.toHaveBeenCalled()
  })

  it('не заменяет сохранённый портрет повреждённым изображением', async () => {
    const onFileSelect = vi.fn()
    const onImageChange = vi.fn()
    await act(async () => root!.render(<div style={{ width: 160 }}><CharacterPortrait portraitUrl="/favicon.svg" onFileSelect={onFileSelect} onImageChange={onImageChange} /></div>))
    await upload(new File(['not an image'], 'broken.png', { type: 'image/png' }))
    await expect.poll(() => dialog()?.querySelector('[role="alert"]')?.textContent).toContain('Не удалось прочитать')
    expect(cropButton('Применить').disabled).toBe(true)
    expect(onFileSelect).not.toHaveBeenCalled()
    expect(onImageChange).not.toHaveBeenCalled()
    expect(host.querySelector('img')?.getAttribute('src')).toBe('/favicon.svg')
  })

  it('удаляет подтверждённый портрет без повторного кадрирования', async () => {
    const onRemove = vi.fn()
    function EditablePortrait() {
      const [portrait, setPortrait] = useState<string | null>('/favicon.svg')
      return <div style={{ width: 160 }}><CharacterPortrait portraitUrl={portrait} onImageChange={setPortrait} onRemove={() => { setPortrait(null); onRemove() }} /></div>
    }
    await act(async () => root!.render(<EditablePortrait />))
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Удалить изображение персонажа"]')!.click())
    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(host.querySelector('img')).toBeNull()
    expect(host.querySelector('[data-testid="character-portrait-placeholder"]')).not.toBeNull()
    expect(dialog()).toBeNull()
  })

  it('сохраняет кадр в документе листа и восстанавливает его после повторного открытия', async () => {
    const initial = createMockCharacterSheet()
    const onDocumentChange = vi.fn<(document: CharacterSheetDocument) => void>()
    await act(async () => root!.render(<CharacterSheetTool key="before" initialDocument={initial} onDocumentChange={onDocumentChange} />))
    await upload(await pictureFile())
    expect(onDocumentChange).not.toHaveBeenCalled()
    await applyCrop()
    await expect.poll(() => onDocumentChange.mock.calls.length).toBe(1)
    const saved = onDocumentChange.mock.calls[0][0]
    expect(saved.identity.portraitUrl).toMatch(/^data:image\/(webp|png);base64,/)
    expect(saved.identity).toEqual({ ...initial.identity, portraitUrl: saved.identity.portraitUrl })
    expect(saved.abilities).toEqual(initial.abilities)

    const restored = JSON.parse(JSON.stringify(saved)) as CharacterSheetDocument
    await act(async () => root!.render(<CharacterSheetTool key="restored" initialDocument={restored} />))
    const portrait = host.querySelector<HTMLImageElement>('img[alt^="Портрет персонажа"]')!
    expect(portrait.src).toBe(saved.identity.portraitUrl)
    expect(portrait.src).not.toContain('blob:')
    await expect.poll(() => portrait.complete && portrait.naturalWidth > 0).toBe(true)
    expect(portrait.naturalWidth).toBe(600)
  })
})
