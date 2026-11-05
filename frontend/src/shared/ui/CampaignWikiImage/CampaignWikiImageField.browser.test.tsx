import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import '../../../app/styles/global.css'
import '../../styles/tokens.css'
import {
  CAMPAIGN_WIKI_IMAGE_LIMITS,
  captureCampaignWikiImageRepository,
} from '../../local'
import type { CampaignWikiImageRepository } from '../../local'
import { CampaignWikiImageField } from './CampaignWikiImageField'

let host: HTMLDivElement
let root: Root | undefined

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  host.remove()
  vi.restoreAllMocks()
})

async function imageFile(width: number, height: number, name = 'image.png') {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')!
  context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--palette-purple-400').trim() || 'rgb(154, 98, 199)'
  context.fillRect(0, 0, width, height)
  const blob = await new Promise<Blob>(resolve => canvas.toBlob(value => resolve(value!), 'image/png'))
  return new File([blob], name, { type: 'image/png' })
}

async function settleEffects() {
  for (let index = 0; index < 4; index += 1) {
    await act(async () => { await new Promise(resolve => window.setTimeout(resolve, 30)) })
  }
}

function FieldHarness({ repository }: { repository: CampaignWikiImageRepository }) {
  const [assetId, setAssetId] = useState<string | null>(null)
  return (
    <CampaignWikiImageField
      assetId={assetId}
      kind="avatar"
      label="Портрет NPC"
      alt="Тестовый персонаж"
      repository={repository}
      onAssetIdChange={setAssetId}
    />
  )
}

describe('Локальные изображения wiki-карточек', () => {
  it('уменьшает обложки и аватары до отдельных лимитов', async () => {
    const repository = captureCampaignWikiImageRepository(`limits-${crypto.randomUUID()}`)
    const source = await imageFile(2000, 1000)
    const cover = await repository.save(source, { kind: 'cover' })
    const avatar = await repository.save(source, { kind: 'avatar' })

    expect(cover.width).toBe(CAMPAIGN_WIKI_IMAGE_LIMITS.cover)
    expect(cover.height).toBe(800)
    expect(avatar.width).toBe(CAMPAIGN_WIKI_IMAGE_LIMITS.avatar)
    expect(avatar.height).toBe(256)
    expect(cover.mimeType).toMatch(/^image\/(webp|png)$/)
  })

  it('не смешивает базы аккаунтов и удаляет asset по идентификатору', async () => {
    const first = captureCampaignWikiImageRepository(`first-${crypto.randomUUID()}`)
    const second = captureCampaignWikiImageRepository(`second-${crypto.randomUUID()}`)
    const saved = await first.save(await imageFile(320, 180), { kind: 'cover', assetId: 'shared-name' })

    expect((await first.get(saved.id))?.width).toBe(320)
    expect(await second.get(saved.id)).toBeUndefined()
    await first.remove(saved.id)
    expect(await first.get(saved.id)).toBeUndefined()
  })

  it('загружает, заменяет и удаляет изображение, освобождая URL превью', async () => {
    const repository = captureCampaignWikiImageRepository(`field-${crypto.randomUUID()}`)
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    root = createRoot(host)
    await act(async () => root!.render(<FieldHarness repository={repository} />))

    const input = host.querySelector<HTMLInputElement>('input[type="file"]')!
    await act(async () => {
      await userEvent.upload(input, await imageFile(900, 600, 'first.png'))
    })
    await settleEffects()
    expect(host.querySelector('img')?.src).toContain('blob:')
    const firstUrl = host.querySelector('img')!.src
    const firstAsset = host.querySelector<HTMLElement>('[data-campaign-wiki-image]')!
    expect(firstAsset.getAttribute('aria-busy')).toBeNull()

    await act(async () => {
      await userEvent.upload(input, await imageFile(600, 900, 'replacement.png'))
    })
    await settleEffects()
    expect(host.querySelector('img')?.src).not.toBe(firstUrl)
    expect(revoke).toHaveBeenCalledWith(firstUrl)

    const remove = Array.from(host.querySelectorAll('button')).find(button => button.textContent === 'Удалить')!
    await act(async () => {
      remove.click()
    })
    await settleEffects()
    expect(host.querySelector('img')).toBeNull()
    expect(host.querySelector('img')).toBeNull()
    expect(host.textContent).toContain('Добавить портрет')
  })

  it('отклоняет неподдерживаемый файл с понятной ошибкой', async () => {
    const repository = captureCampaignWikiImageRepository(`error-${crypto.randomUUID()}`)
    root = createRoot(host)
    await act(async () => root!.render(<FieldHarness repository={repository} />))
    const transfer = new DataTransfer()
    transfer.items.add(new File(['svg'], 'portrait.svg', { type: 'image/svg+xml' }))
    await act(async () => {
      host.querySelector('[data-campaign-wiki-image]')?.dispatchEvent(new DragEvent('drop', {
        bubbles: true,
        dataTransfer: transfer,
      }))
      await new Promise(resolve => window.setTimeout(resolve, 40))
    })
    await expect.poll(() => host.querySelector('[role="alert"]')?.textContent).toContain('JPEG, PNG и WebP')
  })
})

