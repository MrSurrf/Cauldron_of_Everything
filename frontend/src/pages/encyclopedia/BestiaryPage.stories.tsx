import type { Meta, StoryObj } from '@storybook/react-vite'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, userEvent, waitFor } from 'storybook/test'

import BestiaryPage from './BestiaryPage'
import MockTarrasquePage from './MockTarrasquePage'

const meta = {
  component: BestiaryPage,
  parameters: {
    layout: 'fullscreen',
    msw: { handlers: [
      http.get('*/api/encyclopedia/', ({ request }) => {
        const searched = new URL(request.url).searchParams.has('q')
        const results = [
          { id: 101, entity_type: 'creature', name: 'Арло Киттоу', name_en: '', slug: 'arlo-kittow', sources: ['Бестиарий'], summary: { challenge_rating: '6', size: 'Средний', creature_type: 'Гуманоид', languages: ['Общий'], habitat: ['Город'], speed: '30 фт.', named_npc: true, is_homebrew: false } },
          { id: 102, entity_type: 'creature', name: 'Болотник', name_en: '', slug: 'bolotnik', sources: ['Бестиарий'], summary: { challenge_rating: '1', size: 'Большой', creature_type: 'Монстр', habitat: ['Болото'], speed: 'плавание 30 фт.', named_npc: false, is_homebrew: false } },
        ]
        return HttpResponse.json({ count: searched ? 1 : 2, results: searched ? results.slice(0, 1) : results })
      }),
      http.get('*/api/encyclopedia/:id/', ({ params }) => HttpResponse.json({
        id: Number(params.id), entity_type: 'creature',
        name: params.id === '101' ? 'Арло Киттоу' : 'Болотник',
        name_en: '', slug: params.id === '101' ? 'arlo-kittow' : 'bolotnik',
        sources: ['Бестиарий'], content_text: params.id === '101' ? 'Опытный исследователь.' : 'Живёт в болоте.',
        data: { challenge_rating: params.id === '101' ? '6' : '1', size: 'Средний', creature_type: 'Гуманоид', speed: '30 фт.', languages: ['Общий'] },
      })),
    ] },
  },
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
    await expect(await canvas.findByText('Найдено: 3')).toBeVisible()
    await expect(await canvas.findByRole('button', { name: /Арло Киттоу/ })).toBeVisible()
    await waitFor(() => expect(search).toBeEnabled())
    await userEvent.type(search, 'исследователь')
    await waitFor(() => expect(canvas.getByText('Найдено: 1')).toBeVisible())
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
