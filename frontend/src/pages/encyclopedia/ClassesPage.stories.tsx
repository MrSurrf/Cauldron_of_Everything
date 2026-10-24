import type { Meta, StoryObj } from '@storybook/react-vite'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, userEvent, waitFor } from 'storybook/test'

import { SiteHeader } from '../../app/layouts/SiteHeader'
import ClassesPage from './ClassesPage'

const classes = [
  ['Бард', 'Bard', 'к8'],
  ['Варвар', 'Barbarian', 'к12'],
  ['Воин', 'Fighter', 'к10'],
  ['Волшебник', 'Wizard', 'к6'],
  ['Друид', 'Druid', 'к8'],
  ['Жрец', 'Cleric', 'к8'],
  ['Изобретатель', 'Artificer', 'к8'],
  ['Колдун', 'Warlock', 'к8'],
  ['Монах', 'Monk', 'к8'],
  ['Паладин', 'Paladin', 'к10'],
  ['Плут', 'Rogue', 'к8'],
  ['Следопыт', 'Ranger', 'к10'],
  ['Чародей', 'Sorcerer', 'к6'],
].map(([name, nameEn, hitDie], index) => ({
  id: 900 + index,
  entity_type: 'class',
  name,
  name_en: nameEn,
  slug: `class-${index + 1}`,
  sources: [name === 'Изобретатель' ? 'Tasha’s Cauldron of Everything' : 'Player’s Handbook'],
  summary: { hit_die: hitDie },
}))

const meta = {
  title: 'Pages/Encyclopedia/ClassesPage',
  component: ClassesPage,
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('*/api/encyclopedia/', () => HttpResponse.json({
          count: classes.length,
          next: null,
          previous: null,
          results: classes,
        })),
      ],
    },
  },
  decorators: [
    Story => <MemoryRouter initialEntries={['/encyclopedia/classes']}>
      <SiteHeader />
      <Routes><Route path="*" element={<Story />} /></Routes>
    </MemoryRouter>,
  ],
} satisfies Meta<typeof ClassesPage>

export default meta
type Story = StoryObj<typeof meta>

export const Catalog: Story = {}

export const Interactions: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText('Найдено материалов: 13')).toBeVisible()
    await expect(canvas.getByRole('link', { name: /Чародей/ })).toBeVisible()
    await expect(canvas.getByRole('link', { name: /Классы Классы персонажей/ })).toHaveAttribute('aria-current', 'page')

    const cards = [...canvasElement.querySelectorAll<HTMLAnchorElement>('a[href^="/encyclopedia/class/"]')]
    const heights = cards.map(card => Math.round(card.getBoundingClientRect().height))
    await expect(new Set(heights).size).toBe(1)

    await userEvent.click(canvas.getByRole('button', { name: 'Расширенные' }))
    await waitFor(() => expect(canvas.getByText('Найдено материалов: 1')).toBeVisible())
    await expect(canvas.getByRole('link', { name: /Изобретатель/ })).toBeVisible()

    await userEvent.click(canvas.getByRole('button', { name: 'Все' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Список' }))
    await expect(canvas.getByRole('button', { name: 'Список' })).toHaveAttribute('aria-pressed', 'true')
  },
}
