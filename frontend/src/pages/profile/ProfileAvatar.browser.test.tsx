import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { userEvent } from 'vitest/browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import avatarAsset from '../../shared/ui/icons/assets/notification.svg?url&no-inline'
import '../../app/styles/global.css'
import '../../shared/styles/tokens.css'
import { SiteHeader } from '../../app/layouts/SiteHeader'
import type { ProfileData } from '../../shared/api/account'
import ProfilePage from './ProfilePage'
import { cloneProfile, emptyProfile } from './profileModel'

let host: HTMLDivElement
let root: Root | undefined
let remote: ProfileData
let originalPortrait: string
let uploadedPortrait: string
let uploadedFiles: File[]
let patchedProfiles: Partial<ProfileData>[]
let previousAccess: string | null
let cacheKey: string

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  previousAccess = localStorage.getItem('surveyAuth.access')
  const userId = `portrait-integration-${crypto.randomUUID()}`
  cacheKey = `profile.cache:${userId}`
  localStorage.setItem('surveyAuth.access', `header.${btoa(JSON.stringify({ user_id: userId }))}.signature`)
  const asset = new URL(avatarAsset, window.location.href).href
  originalPortrait = `${asset}?portrait=old`
  uploadedPortrait = `${asset}?portrait=uploaded`
  remote = { ...cloneProfile(emptyProfile), name: 'Пользователь', portrait: originalPortrait }
  uploadedFiles = []
  patchedProfiles = []
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const address = input instanceof Request ? input.url : String(input)
    const url = new URL(address, window.location.origin)
    const method = init?.method ?? 'GET'
    if (url.pathname === '/api/me/profile/avatar/' && method === 'POST') {
      const form = init?.body as FormData
      const file = form.get('portrait')
      if (!(file instanceof File)) throw new Error('В multipart должен быть файл портрета.')
      uploadedFiles.push(file)
      remote = { ...remote, portrait: uploadedPortrait }
      return Response.json({ portrait: uploadedPortrait })
    }
    if (url.pathname === '/api/me/profile/' && method === 'PATCH') {
      const body = JSON.parse(String(init?.body)) as { data: Partial<ProfileData> }
      patchedProfiles.push(body.data)
      remote = { ...remote, ...body.data }
      return Response.json({ data: remote, updated_at: '2026-10-26T12:00:00Z' })
    }
    if (url.pathname === '/api/me/profile/' && method === 'GET') {
      return Response.json({ data: remote, updated_at: '2026-10-25T12:00:00Z' })
    }
    throw new Error(`Неожиданный запрос ${method} ${url.pathname}`)
  }))
  host = document.createElement('div')
  host.style.width = '1440px'
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  host.remove()
  localStorage.removeItem(cacheKey)
  if (previousAccess === null) localStorage.removeItem('surveyAuth.access')
  else localStorage.setItem('surveyAuth.access', previousAccess)
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function pictureFile() {
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 600
  const context = canvas.getContext('2d')!
  context.fillStyle = 'blue'
  context.fillRect(0, 0, 800, 600)
  const blob = await new Promise<Blob>(resolve => canvas.toBlob(value => resolve(value!), 'image/png'))
  return new File([blob], 'avatar.png', { type: 'image/png' })
}

function headerImage() {
  return host.querySelector<HTMLImageElement>('[aria-label="Открыть профиль"] img')
}

function pageButton(label: string) {
  return Array.from(host.querySelectorAll<HTMLButtonElement>('main button')).find(button => button.textContent?.trim() === label)!
}

function cropDialog() {
  return document.querySelector<HTMLDialogElement>('[data-image-crop-dialog]')
}

function dialogButton(label: string) {
  return Array.from(cropDialog()!.querySelectorAll('button')).find(button => button.textContent?.trim() === label)!
}

async function mount() {
  await act(async () => root!.render(<MemoryRouter initialEntries={['/profile']}><SiteHeader /><ProfilePage /></MemoryRouter>))
  await act(async () => { await new Promise(resolve => window.setTimeout(resolve, 40)) })
  await settleUi()
  await expect.poll(() => host.querySelector('main h1')?.textContent).toBe('Пользователь')
  await expect.poll(() => headerImage()?.src).toBe(originalPortrait)
}

async function settleUi() {
  await act(async () => {
    await Promise.all(Array.from(host.querySelectorAll('img')).map(image => image.decode().catch(() => undefined)))
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  })
}

async function startPhotoSelection() {
  await act(async () => pageButton('Редактировать профиль').click())
  await settleUi()
  const file = await pictureFile()
  const transfer = new DataTransfer()
  transfer.items.add(file)
  const input = host.querySelector<HTMLInputElement>('[aria-label="Выбрать изображение профиля"]')!
  await act(async () => {
    input.files = transfer.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => window.setTimeout(resolve, 40))
  })
  await expect.poll(() => cropDialog()?.matches(':modal')).toBe(true)
  await expect.poll(() => cropDialog() && !dialogButton('Применить').disabled).toBe(true)
}

describe('Аватар профиля и хедер', () => {
  it('показывает подтверждённое фото в хедере, отправляет кадрированный файл по Save и обновляет аватар без перезагрузки', async () => {
    await mount()
    await startPhotoSelection()
    expect(uploadedFiles).toHaveLength(0)
    expect(patchedProfiles).toHaveLength(0)
    expect(headerImage()?.src).toBe(originalPortrait)
    await act(async () => {
      dialogButton('Применить').click()
      await new Promise(resolve => window.setTimeout(resolve, 40))
    })
    await expect.poll(() => cropDialog()).toBeNull()
    expect(uploadedFiles).toHaveLength(0)
    expect(patchedProfiles).toHaveLength(0)
    expect(headerImage()?.src).toBe(originalPortrait)
    expect(pageButton('Сохранить').disabled).toBe(false)

    await act(async () => pageButton('Сохранить').click())
    await expect.poll(() => uploadedFiles.length).toBe(1)
    await expect.poll(() => patchedProfiles.length).toBe(1)
    await expect.poll(() => headerImage()?.src).toBe(uploadedPortrait)
    expect(patchedProfiles[0].portrait).toBe(uploadedPortrait)
    expect(patchedProfiles[0].portrait).not.toContain('blob:')
    const uploaded = uploadedFiles[0]
    expect(uploaded.name).toMatch(/^avatar-cropped\.(webp|png)$/)
    expect(uploaded.type).toMatch(/^image\/(webp|png)$/)
    const image = await createImageBitmap(uploaded)
    try {
      expect(image.width).toBe(600)
      expect(image.height).toBe(600)
    } finally { image.close() }
    await expect.poll(() => host.querySelector('main img')?.getAttribute('src')).toBe(uploadedPortrait)
    expect(localStorage.getItem(cacheKey)).toContain(uploadedPortrait)
    expect(localStorage.getItem(cacheKey)).not.toContain('blob:')
  })

  it('отмена рамки и отмена редактирования не загружают фото и не меняют хедер', async () => {
    await mount()
    await startPhotoSelection()
    await act(async () => dialogButton('Отмена').click())
    await expect.poll(() => cropDialog()).toBeNull()
    expect(pageButton('Сохранить').disabled).toBe(true)
    expect(headerImage()?.src).toBe(originalPortrait)
    await act(async () => pageButton('Отмена').click())
    expect(uploadedFiles).toHaveLength(0)
    expect(patchedProfiles).toHaveLength(0)

    await startPhotoSelection()
    await act(async () => {
      dialogButton('Применить').click()
      await new Promise(resolve => window.setTimeout(resolve, 40))
    })
    await expect.poll(() => cropDialog()).toBeNull()
    await act(async () => pageButton('Отмена').click())
    expect(uploadedFiles).toHaveLength(0)
    expect(patchedProfiles).toHaveLength(0)
    expect(headerImage()?.src).toBe(originalPortrait)
    expect(host.querySelector('main img')?.getAttribute('src')).toBe(originalPortrait)
  })

  it('удаляет аватар из профиля и хедера после сохранения', async () => {
    await mount()
    await act(async () => pageButton('Редактировать профиль').click())
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Удалить изображение профиля"]')!.click())
    expect(headerImage()?.src).toBe(originalPortrait)
    await act(async () => pageButton('Сохранить').click())
    await expect.poll(() => patchedProfiles.length).toBe(1)
    await expect.poll(() => headerImage()).toBeNull()
    expect(patchedProfiles[0].portrait).toBeNull()
    expect(uploadedFiles).toHaveLength(0)
    expect(host.querySelector('main img')).toBeNull()
  })

  it('запоздалый GET страницы не возвращает старый аватар после его сохранения', async () => {
    const previousProfile = structuredClone(remote)
    localStorage.setItem(cacheKey, JSON.stringify(previousProfile))
    const normalFetch = vi.mocked(fetch).getMockImplementation()!
    let getRequests = 0
    let finishProfileLoad!: (response: Response) => void
    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), window.location.origin)
      if (url.pathname === '/api/me/profile/' && (!init?.method || init.method === 'GET')) {
        getRequests += 1
        // Хедер получает обычный ответ; загрузка самой страницы задерживается.
        if (getRequests === 2) return new Promise(resolve => { finishProfileLoad = resolve })
      }
      return normalFetch(input, init)
    })
    await mount()
    expect(getRequests).toBe(2)
    expect(host.querySelector('main')?.getAttribute('aria-busy')).toBe('true')
    await startPhotoSelection()
    await act(async () => {
      dialogButton('Применить').click()
      await new Promise(resolve => window.setTimeout(resolve, 40))
    })
    await expect.poll(() => cropDialog()).toBeNull()
    await act(async () => pageButton('Сохранить').click())
    await expect.poll(() => patchedProfiles.length).toBe(1)
    await expect.poll(() => headerImage()?.src).toBe(uploadedPortrait)

    await act(async () => {
      finishProfileLoad(Response.json({ data: previousProfile, updated_at: '2026-10-25T12:00:00Z' }))
      await new Promise(resolve => window.setTimeout(resolve, 40))
    })
    expect(headerImage()?.src).toBe(uploadedPortrait)
    expect(host.querySelector('main img')?.getAttribute('src')).toBe(uploadedPortrait)
    expect(JSON.parse(localStorage.getItem(cacheKey)!).portrait).toBe(uploadedPortrait)
    expect(host.querySelector('main [role="status"]')?.textContent).toBe('Изменения сохранены.')
    expect(host.querySelector('main')?.getAttribute('aria-busy')).toBe('false')
  })

  it('при ошибке PATCH сохраняет загруженный аватар в хедере и не отправляет его повторно при повторной попытке', async () => {
    const normalFetch = vi.mocked(fetch).getMockImplementation()!
    let patchAttempts = 0
    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), window.location.origin)
      if (url.pathname === '/api/me/profile/' && init?.method === 'PATCH') {
        patchAttempts += 1
        if (patchAttempts === 1) return Promise.resolve(Response.json({ detail: 'Профиль временно недоступен.' }, { status: 503 }))
      }
      return normalFetch(input, init)
    })
    await mount()
    await startPhotoSelection()
    await act(async () => {
      dialogButton('Применить').click()
      await new Promise(resolve => window.setTimeout(resolve, 40))
    })
    await expect.poll(() => cropDialog()).toBeNull()
    // Изменённое имя остаётся несохранённым, даже если POST фотографии прошёл.
    await act(async () => userEvent.fill(host.querySelector<HTMLInputElement>('main input[required]')!, 'Новое имя'))
    await act(async () => pageButton('Сохранить').click())
    await expect.poll(() => host.querySelector('main [role="alert"]')?.textContent).toContain('Профиль временно недоступен.')
    expect(patchAttempts).toBe(1)
    expect(uploadedFiles).toHaveLength(1)
    expect(headerImage()?.src).toBe(uploadedPortrait)
    expect(JSON.parse(localStorage.getItem(cacheKey)!).portrait).toBe(uploadedPortrait)
    expect(pageButton('Сохранить').disabled).toBe(false)

    await act(async () => pageButton('Сохранить').click())
    await expect.poll(() => patchedProfiles.length).toBe(1)
    expect(patchAttempts).toBe(2)
    expect(uploadedFiles).toHaveLength(1)
    expect(patchedProfiles[0].name).toBe('Новое имя')
    expect(patchedProfiles[0].portrait).toBe(uploadedPortrait)
    expect(headerImage()?.src).toBe(uploadedPortrait)
    await expect.poll(() => host.querySelector('main [role="status"]')?.textContent).toBe('Изменения сохранены.')
  })

  it.each(['Отмена', 'Применить'])('не закрывает открытую рамку при обновлении портрета из GET и позволяет выбрать «%s»', async action => {
    localStorage.setItem(cacheKey, JSON.stringify(remote))
    const normalFetch = vi.mocked(fetch).getMockImplementation()!
    let getRequests = 0
    let finishProfileLoad!: (response: Response) => void
    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), window.location.origin)
      if (url.pathname === '/api/me/profile/' && (!init?.method || init.method === 'GET')) {
        getRequests += 1
        if (getRequests === 2) return new Promise(resolve => { finishProfileLoad = resolve })
      }
      return normalFetch(input, init)
    })
    await mount()
    await startPhotoSelection()
    const openedDialog = cropDialog()!
    expect(openedDialog.matches(':modal')).toBe(true)

    const receivedPortrait = originalPortrait.replace('portrait=old', 'portrait=received')
    remote = { ...remote, portrait: receivedPortrait }
    await act(async () => {
      finishProfileLoad(Response.json({ data: remote, updated_at: '2026-10-26T11:00:00Z' }))
      await new Promise(resolve => window.setTimeout(resolve, 40))
    })
    await settleUi()
    expect(cropDialog()).toBe(openedDialog)
    expect(openedDialog.matches(':modal')).toBe(true)
    expect(host.querySelector('main img')?.getAttribute('src')).toBe(receivedPortrait)
    expect(headerImage()?.src).toBe(receivedPortrait)
    expect(dialogButton('Применить').disabled).toBe(false)

    await act(async () => {
      dialogButton(action).click()
      await new Promise(resolve => window.setTimeout(resolve, 40))
    })
    await expect.poll(() => cropDialog()).toBeNull()
    expect(uploadedFiles).toHaveLength(0)
    expect(headerImage()?.src).toBe(receivedPortrait)
    if (action === 'Отмена') {
      expect(pageButton('Сохранить').disabled).toBe(true)
      expect(host.querySelector('main img')?.getAttribute('src')).toBe(receivedPortrait)
    } else {
      expect(pageButton('Сохранить').disabled).toBe(false)
      await act(async () => pageButton('Сохранить').click())
      await expect.poll(() => uploadedFiles.length).toBe(1)
      await expect.poll(() => headerImage()?.src).toBe(uploadedPortrait)
      expect(patchedProfiles[0].portrait).toBe(uploadedPortrait)
    }
  })
})
