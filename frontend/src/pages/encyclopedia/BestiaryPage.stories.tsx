import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, userEvent } from 'storybook/test'

import BestiaryPage from './BestiaryPage'
import MockTarrasquePage from './MockTarrasquePage'

const meta = {
  component: BestiaryPage,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => (
    <MemoryRouter initialEntries={['/encyclopedia/bestiary']}>
      <Routes>
        <Route path="/encyclopedia/bestiary" element={<Story />} />
        <Route path="/encyclopedia/bestiary/tarrasque" element={<MockTarrasquePage />} />
      </Routes>
    </MemoryRouter>
  )],
} satisfies Meta<typeof BestiaryPage>

export default meta
type Story = StoryObj<typeof meta>

export const Catalog: Story = {
  play: async ({ canvas }) => {
    const search = canvas.getByRole('searchbox', { name: 'Поиск по названию и содержанию карточки' })
    await expect(canvas.getByText('Найдено: 42')).toBeVisible()
    await expect(canvas.getByRole('heading', { name: 'А', level: 3 })).toBeVisible()
    await userEvent.type(search, 'исследователь')
    await expect(canvas.getByText('Найдено: 1')).toBeVisible()
    await expect(canvas.queryByRole('heading', { name: 'А', level: 3 })).not.toBeInTheDocument()
    await userEvent.clear(search)
    await userEvent.click(canvas.getByRole('button', { name: /Арло Киттоу/ }))
    await expect(canvas.getByRole('article', { name: 'Арло Киттоу' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: /Открыть полную запись/ })).toBeDisabled()
  },
}

export const TarrasqueFullRecord: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Тараск/ }))
    const openFull = canvas.getByRole('button', { name: /Открыть полную запись/ })
    await expect(openFull).toBeEnabled()
    await userEvent.click(openFull)
    await expect(await canvas.findByRole('heading', { name: 'Тараск', level: 1 })).toBeVisible()
  },
}
