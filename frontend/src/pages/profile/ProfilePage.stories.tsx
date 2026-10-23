import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'

import ProfilePage from './ProfilePage'

const meta = {
  component: ProfilePage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ProfilePage>

export default meta
type Story = StoryObj<typeof meta>
export const ReadOnly: Story = {}

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('profile-cover')).toBeVisible()
    await expect(canvas.getByRole('heading', { name: 'Достижения' })).toBeVisible()
    await expect(canvas.queryByRole('tablist')).not.toBeInTheDocument()
    await expect(canvas.queryByRole('heading', { name: 'Приватность' })).not.toBeInTheDocument()

    await userEvent.click(canvas.getByRole('button', { name: 'Редактировать профиль' }))

    await expect(canvas.getByLabelText('Выбрать изображение профиля')).toBeInTheDocument()
    await expect(canvas.getByRole('heading', { name: 'Оформление' })).toBeVisible()
    await expect(canvas.getByRole('heading', { name: 'Приватность' })).toBeVisible()
  },
}
