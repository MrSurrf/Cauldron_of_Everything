import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import { expect } from 'storybook/test'

import GmResultsPage from './GmResultsPage'

const meta = {
  component: GmResultsPage,
  tags: ['ai-generated'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof GmResultsPage>

export default meta

type Story = StoryObj<typeof meta>

export const Login: Story = {}

export const RejectsWrongPassword: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(
      canvas.getByLabelText('Пароль'),
      'неверный-пароль',
    )
    await userEvent.click(
      canvas.getByRole('button', {
        name: 'Войти',
      }),
    )
    await expect(
      canvas.getByRole('alert'),
    ).toHaveTextContent('Неверный пароль')
  },
}

export const LoadsResults: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(
      canvas.getByLabelText('Пароль'),
      'gm-demo',
    )
    await userEvent.click(
      canvas.getByRole('button', {
        name: 'Войти',
      }),
    )

    await expect(
      await canvas.findByRole('heading', {
        name: 'Анна',
      }),
    ).toBeVisible()

    await expect(
      canvas.getByRole('button', {
        name: /Анна Лиара/,
      }),
    ).toHaveAttribute('aria-pressed', 'true')
  },
}
