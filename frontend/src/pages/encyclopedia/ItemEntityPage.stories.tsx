import type { Meta, StoryObj } from '@storybook/react-vite'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect } from 'storybook/test'

import { SiteHeader } from '../../app/layouts/SiteHeader'
import ItemEntityPage from './ItemEntityPage'

const summary = {
  id: 501,
  entity_type: 'item',
  name: 'Абракадабрус',
  name_en: 'Abracadabrus',
  slug: 'abracadabrus',
}

const detail = {
  ...summary,
  sources: [{ name: 'Книга обо всём' }],
  content_html: [
    '<p>Абракадабрус — богато украшенный, усыпанный драгоценными камнями деревянный сундук. Его внутреннее отделение представляет собой куб со сторонами размером 1½ фута.</p>',
    '<h3>Свойства</h3>',
    '<p>Сундук имеет 20 зарядов. Действием существо может коснуться закрытой крышки сундука и израсходовать 1 заряд.</p>',
    '<p>Сундук восстанавливает 1к20 израсходованных зарядов ежедневно на рассвете.</p>',
  ].join(''),
  content_text: 'Абракадабрус — богато украшенный сундук.',
  data: {
    classification: 'Чудесный предмет',
    rarity: 'Очень редкий',
    requires_attunement: true,
    price: '5 001–50 000 зм',
    size: 'Куб 1½ фута',
    weight: '25 фунтов',
    tags: ['Хранилище', 'Призыв предметов'],
    tooltips: {
      Заряды: 'Расходуемый ресурс предмета, восстанавливаемый по указанным правилам.',
    },
  },
}

function handlers() {
  return [
    http.get('*/api/encyclopedia/', ({ request }) => {
      const params = new URL(request.url).searchParams
      const matches = params.get('type') === 'item' && params.get('slug') === summary.slug
      return HttpResponse.json({ count: matches ? 1 : 0, results: matches ? [summary] : [] })
    }),
    http.get(`*/api/encyclopedia/${summary.id}/`, () => HttpResponse.json(detail)),
  ]
}

const meta = {
  title: 'Pages/Encyclopedia/ItemEntityPage',
  component: ItemEntityPage,
  parameters: {
    layout: 'fullscreen',
    msw: { handlers: handlers() },
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/encyclopedia/item/abracadabrus']}>
        <SiteHeader />
        <Routes>
          <Route path="/encyclopedia/item/:slug" element={<Story />} />
        </Routes>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof ItemEntityPage>

export default meta
type Story = StoryObj<typeof meta>

export const FromDatabase: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Абракадабрус' })).toBeVisible()
    await expect(canvas.getByText('[Abracadabrus]')).toBeVisible()
    await expect(canvas.getByText('5 001–50 000 зм')).toBeVisible()
    await expect(canvas.getByText('Призыв предметов')).toBeVisible()
    await expect(canvas.getByText('Книга обо всём')).toBeVisible()
    await expect(canvas.queryByRole('complementary')).not.toBeInTheDocument()
  },
}

export const ApiUnavailable: Story = {
  name: 'API / Ошибка загрузки',
  parameters: {
    msw: { handlers: [http.get('*/api/encyclopedia/', () => new HttpResponse(null, { status: 503 }))] },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Не удалось загрузить предмет')
  },
}
