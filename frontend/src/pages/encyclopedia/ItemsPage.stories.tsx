import type { Meta, StoryObj } from '@storybook/react-vite'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, screen, userEvent, waitFor } from 'storybook/test'

import { SiteHeader } from '../../app/layouts/SiteHeader'
import ItemEntityPage from './ItemEntityPage'
import ItemsPage from './ItemsPage'

const names = [
  'Абракадабрус', 'Адамантиновый доспех', 'Адская машина', 'Алхимический сборник',
  'Амулет благочестия', 'Амулет здоровья', 'Амулет планов', 'Антигравитационный пояс',
  'Арбалет звездострел', 'Арфа Анструт', 'Барабан задающего ритм', 'Бесконечный гримуар',
  'Боевая кирка камнетворца', 'Боеприпас +1', 'Браслет каменной магии', 'Брошь защиты',
  'Бутылка заклинаний', 'Веер ветра', 'Вечный фонарь', 'Волшебная палочка молний',
]

const summaries = names.map((name, index) => ({
  id: 700 + index,
  entity_type: 'item',
  name,
  name_en: index === 0 ? 'Abracadabrus' : '',
  slug: `item-${index + 1}`,
  sources: [index === names.length - 1 ? 'Homebrew' : index % 2 ? 'Книга мастера' : 'Книга обо всём'],
  summary: {
    classification: index % 3 === 0 ? 'Оружие' : index % 3 === 1 ? 'Доспех' : 'Чудесный предмет',
    rarity: index % 4 === 0 ? 'Очень редкий' : index % 4 === 1 ? 'Редкий' : index % 4 === 2 ? 'Необычный' : 'Обычный',
    requires_attunement: index % 2 === 0,
  },
}))

function handlers() {
  return [
    http.get('*/api/encyclopedia/', ({ request }) => {
      const params = new URL(request.url).searchParams
      const slug = params.get('slug')
      const query = params.get('q')?.toLocaleLowerCase('ru-RU') ?? ''
      const filtered = summaries.filter((item) =>
        (!slug || item.slug === slug)
        && (!query || item.name.toLocaleLowerCase('ru-RU').includes(query)),
      )
      return HttpResponse.json({ count: filtered.length, next: null, previous: null, results: filtered })
    }),
    http.get('*/api/encyclopedia/:id/', ({ params }) => {
      const summary = summaries.find((item) => item.id === Number(params.id)) ?? summaries[0]
      return HttpResponse.json({
        ...summary,
        content_html: '<p>Описание предмета из базы данных.</p><h3>Свойства</h3><p>Магическое свойство предмета.</p>',
        content_text: 'Описание предмета из базы данных.',
        data: {
          ...summary.summary,
          price: '5 001–50 000 зм',
          weight: '25 фунтов',
          tags: ['Магический'],
        },
      })
    }),
  ]
}

const meta = {
  title: 'Pages/Encyclopedia/ItemsPage',
  component: ItemsPage,
  parameters: {
    layout: 'fullscreen',
    msw: { handlers: handlers() },
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/encyclopedia/items']}>
        <SiteHeader />
        <Routes>
          <Route path="/encyclopedia/items" element={<Story />} />
          <Route path="/encyclopedia/item/:slug" element={<ItemEntityPage />} />
        </Routes>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof ItemsPage>

export default meta
type Story = StoryObj<typeof meta>

export const Catalog: Story = {}

export const Interactions: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Найдено: 19')).toBeVisible()
    await expect(canvas.getByRole('button', { name: /Абракадабрус/ })).toBeVisible()

    await userEvent.click(canvas.getByRole('button', { name: 'Фильтр: Тип' }))
    await userEvent.click(await screen.findByRole('checkbox', { name: /Оружие/ }))
    await waitFor(() => expect(canvas.getByText('Найдено: 7')).toBeVisible())

    await userEvent.click(canvas.getByRole('button', { name: 'Сбросить фильтры' }))
    const search = canvas.getByRole('searchbox', { name: 'Поиск по предметам' })
    await userEvent.type(search, 'Абракадабрус')
    await expect(canvas.getByText('Найдено: 1')).toBeVisible()

    await userEvent.click(canvas.getByRole('button', { name: /Абракадабрус/ }))
    await expect(canvas.getByRole('heading', { level: 3, name: 'Абракадабрус' })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Открыть полную запись →' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Абракадабрус' })).toBeVisible()
  },
}
