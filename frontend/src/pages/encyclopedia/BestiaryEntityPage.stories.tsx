import type { Meta, StoryObj } from '@storybook/react-vite'
import { HttpResponse, http, passthrough } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, within } from 'storybook/test'

import { mockTarrasque } from '../../entities/creature/model/mockTarrasque'
import BestiaryEntityPage from './BestiaryEntityPage'

// Только автономный пример HTTP-загрузки. Это не снимок ответа реальной БД.
// Содержимое секций берём из общего fixture, без второй сокращённой копии Тараска.
const tarrasqueSummary = {
  id: 1285,
  entity_type: 'creature',
  name: mockTarrasque.name,
  name_en: mockTarrasque.nameEn,
  slug: mockTarrasque.slug,
}

const tarrasqueDetail = {
  ...tarrasqueSummary,
  content_html: mockTarrasque.sections.map((section) => section.html).join(''),
  data: {
    size: mockTarrasque.size,
    creature_type: mockTarrasque.creatureType,
    alignment: mockTarrasque.alignment,
    armor_class: mockTarrasque.armorClass,
    hit_points: mockTarrasque.hitPoints,
    speed: mockTarrasque.speed,
    abilities: mockTarrasque.abilities,
    saving_throws: mockTarrasque.savingThrows,
    skills: mockTarrasque.skills,
    condition_immunities: mockTarrasque.conditionImmunities,
    languages: mockTarrasque.languages,
    challenge_rating: mockTarrasque.challengeRating,
    proficiency_bonus: mockTarrasque.proficiencyBonus,
    sections: mockTarrasque.sections.map(({ id, title, html }) => ({ id, title, html })),
  },
}

function mockApi(detail: typeof tarrasqueDetail) {
  return [
    http.get('*/api/encyclopedia/', ({ request }) => {
      const url = new URL(request.url)
      const matches = url.searchParams.get('type') === 'creature'
        && url.searchParams.get('q') === 'tarrasque'

      return HttpResponse.json({
        count: matches ? 1 : 0,
        next: null,
        previous: null,
        results: matches ? [tarrasqueSummary] : [],
      })
    }),
    http.get(`*/api/encyclopedia/${tarrasqueSummary.id}/`, () => HttpResponse.json(detail)),
  ]
}

const meta = {
  component: BestiaryEntityPage,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/encyclopedia/bestiary/tarrasque']}>
        <Routes>
          <Route path="/encyclopedia/bestiary/:slug" element={<Story />} />
        </Routes>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof BestiaryEntityPage>

export default meta

type Story = StoryObj<typeof meta>

export const TarrasqueFromApi: Story = {
  // Ручная проверка доступного backend; автономные тесты не зависят от его запуска.
  tags: ['!test'],
  parameters: {
    docs: {
      description: {
        story: 'Настоящий API из VITE_API_BASE_URL (по умолчанию http://127.0.0.1:8000). '
          + 'Нужен запущенный backend с энциклопедией. При ошибке мок не подставляется.',
      },
    },
    msw: {
      handlers: [
        http.get('*/api/encyclopedia/', () => passthrough()),
        http.get('*/api/encyclopedia/:id/', () => passthrough()),
      ],
    },
  },
}

export const TarrasqueMockApi: Story = {
  name: 'Tarrasque / Mock API',
  parameters: {
    docs: {
      description: {
        story: 'Автономный тест загрузки через HTTP на основе mockTarrasque. Не данные БД.',
      },
    },
    msw: { handlers: mockApi(tarrasqueDetail) },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Тараск' })).toBeVisible()
    await expect(canvas.getByLabelText('Хиты 676 (33к20 + 330)'))
      .toHaveAttribute('data-creature-hp-frame', 'monster')
    await expect(canvas.getByText('природный доспех')).toBeVisible()

    const actions = within(canvas.getByRole('region', { name: 'Действия' }))
    for (const name of ['Мультиатака.', 'Укус.', 'Коготь.', 'Хвост.', 'Поглощение.']) {
      await expect(actions.getByText(name, { exact: true })).toBeVisible()
      await expect(canvas.getAllByText(name, { exact: true })).toHaveLength(1)
    }
    const legendary = within(canvas.getByRole('region', { name: 'Легендарные действия' }))
    await expect(legendary.getByText('Жевание.')).toBeVisible()
    const sidebar = within(canvas.getByRole('complementary', { name: 'Описание существа' }))
    await expect(sidebar.queryByText('Мультиатака.')).not.toBeInTheDocument()
  },
}

export const SectionsWithoutDescription: Story = {
  name: 'API / Секции без описания',
  parameters: {
    msw: {
      handlers: mockApi({
        ...tarrasqueDetail,
        data: {
          ...tarrasqueDetail.data,
          sections: tarrasqueDetail.data.sections.filter(({ id }) => id !== 'tarrasque-description'),
        },
      }),
    },
  },
  play: async ({ canvas }) => {
    await canvas.findByRole('heading', { level: 1, name: 'Тараск' })
    await expect(canvas.getAllByText('Мультиатака.')).toHaveLength(1)
    await expect(canvas.queryByRole('complementary')).not.toBeInTheDocument()
  },
}

export const HtmlWithoutSections: Story = {
  name: 'API / Только HTML карточки',
  parameters: {
    msw: {
      handlers: mockApi({
        ...tarrasqueDetail,
        data: { ...tarrasqueDetail.data, sections: [] },
      }),
    },
  },
  play: async ({ canvas }) => {
    const statblock = within(await canvas.findByRole('region', { name: 'Статблок' }))
    await expect(statblock.getByText('Укус.')).toBeVisible()
    await expect(statblock.getByText('Жевание.')).toBeVisible()
    await expect(canvas.queryByRole('complementary')).not.toBeInTheDocument()
  },
}

export const ApiUnavailable: Story = {
  name: 'API / Ошибка загрузки без подстановки мока',
  parameters: {
    msw: {
      handlers: [
        http.get('*/api/encyclopedia/', () => new HttpResponse(null, { status: 503 })),
      ],
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Не удалось загрузить существо')
    await expect(canvas.queryByRole('heading', { level: 1, name: 'Тараск' })).not.toBeInTheDocument()
  },
}
