import type { Meta, StoryObj } from '@storybook/react-vite'
import { http, HttpResponse } from 'msw'
import { expect, userEvent } from 'storybook/test'

import ProfilePage from './ProfilePage'

const profileFixture = {
  data: {
    name: 'Babaika',
    tagline: 'Бросаю кубики и строю миры',
    city: 'Москва',
    title: 'Мастер миров',
    role: 'Мастер',
    bio: 'Люблю глубоких персонажей, моральные дилеммы и истории, в которых мрак и надежда идут рука об руку.',
    portrait: null,
    theme: 'purple',
    visibility: 'all',
    messages: 'all',
    systems: ['Dungeons & Dragons 5e', 'Pathfinder 2e', 'Call of Cthulhu'],
    styles: ['Ролевая игра и отыгрыш', 'Политика и интриги', 'Глубокий лор и мир'],
    genres: ['Тёмное фэнтези', 'Готика', 'Мистика'],
    links: [{ label: 'Telegram', value: '@babaika_rpg' }],
    privacy: { online: true, activity: true, articles: true, characters: true, followers: true, city: true },
  },
  updated_at: '2026-10-23T12:30:00+03:00',
}

const meta = {
  component: ProfilePage,
  parameters: {
    layout: 'fullscreen',
    msw: { handlers: [http.get('*/api/me/profile/', () => HttpResponse.json(profileFixture))] },
  },
} satisfies Meta<typeof ProfilePage>

export default meta
type Story = StoryObj<typeof meta>
export const ReadOnly: Story = {}

export const EmptyProfile: Story = {
  parameters: {
    msw: { handlers: [http.get('*/api/me/profile/', () => HttpResponse.json({ data: {}, updated_at: profileFixture.updated_at }))] },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'Редактировать профиль' })).toBeVisible()
    await expect(canvas.queryByRole('heading', { name: 'Обо мне' })).not.toBeInTheDocument()
    await expect(canvas.queryByRole('heading', { name: 'Любимые системы' })).not.toBeInTheDocument()
    await expect(canvas.queryByRole('heading', { name: 'Стиль игры' })).not.toBeInTheDocument()
    await expect(canvas.queryByRole('heading', { name: 'Контакты и ссылки' })).not.toBeInTheDocument()
  },
}

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Babaika' })).toBeVisible()
    await expect(canvas.getByTestId('profile-cover')).toBeVisible()
    await expect(canvas.getByLabelText('Статистика профиля')).toBeVisible()
    await expect(canvas.getByRole('heading', { name: 'Достижения' })).toBeVisible()
    await expect(canvas.getByRole('heading', { name: 'Кампании и клубы' })).toBeVisible()
    await expect(canvas.getByRole('heading', { name: 'Недавняя активность' })).toBeVisible()
    await expect(canvas.queryByRole('tablist')).not.toBeInTheDocument()
    await expect(canvas.getByRole('heading', { name: 'Обо мне' })).toBeVisible()
    await expect(canvas.getByRole('heading', { name: 'Любимые системы' })).toBeVisible()
    await expect(canvas.queryByText('Личная цитата')).not.toBeInTheDocument()
    await expect(canvas.queryByRole('heading', { name: 'Приватность' })).not.toBeInTheDocument()

    await userEvent.click(canvas.getByRole('button', { name: 'Редактировать профиль' }))

    await expect(canvas.getByLabelText('Выбрать изображение профиля')).toBeInTheDocument()
    await expect(canvas.getByRole('heading', { name: 'Обо мне' })).toBeVisible()
    await expect(canvas.getByRole('heading', { name: 'Оформление' })).toBeVisible()
    await expect(canvas.getByRole('heading', { name: 'Приватность' })).toBeVisible()
  },
}
