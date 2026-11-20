import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import {
  expect,
  userEvent,
} from 'storybook/test'

import { SiteHeader } from '../../app/layouts/SiteHeader'
import CharactersPage from './CharactersPage'

const meta = {
  title: 'Pages/CharactersPage',
  component: CharactersPage,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/characters']}>
        <SiteHeader />
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof CharactersPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Interactions: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: 'Мои персонажи' }),
    ).toBeVisible()
    await expect(
      canvas.getByRole('status'),
    ).toHaveTextContent('Найдено персонажей: 9')

    const search = canvas.getByRole('searchbox', {
      name: 'Поиск по персонажам',
    })
    await userEvent.type(search, 'Серафина')
    await expect(
      canvas.getByRole('link', { name: 'Открыть персонажа Серафина' }),
    ).toBeVisible()
    await expect(
      canvas.queryByRole('link', { name: 'Открыть персонажа Гарольд' }),
    ).not.toBeInTheDocument()

    await userEvent.clear(search)
    await userEvent.click(canvas.getByRole('button', { name: /Избранные/ }))
    await expect(canvas.getByRole('status')).toHaveTextContent('Найдено персонажей: 3')

    await userEvent.click(canvas.getByRole('radio', { name: 'Список' }))
    await expect(canvas.getByRole('radio', { name: 'Список' })).toBeChecked()
  },
}
