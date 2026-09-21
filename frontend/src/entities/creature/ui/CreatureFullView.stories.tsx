import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import {
  expect,
  screen,
  userEvent,
  waitFor,
} from 'storybook/test'

import { mockTarrasque } from '../model/mockTarrasque'
import { DAMAGE_TYPES } from '../model/creature'
import { CreatureFullView } from './CreatureFullView'

const meta = {
  component: CreatureFullView,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div
        style={{
          minHeight: '100vh',
          padding: 'clamp(1rem, 4vw, 3rem)',
          background:
            'radial-gradient(circle at 50% 0, #1b0d29, #020108 34rem)',
        }}
      >
        <Story />
      </div>
    ),
  ],
  args: {
    entity: mockTarrasque,
  },
} satisfies Meta<typeof CreatureFullView>

export default meta

type Story = StoryObj<typeof meta>

export const Tarrasque: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', {
        level: 1,
        name: 'Тараск',
      }),
    ).toBeVisible()
    await expect(
      canvas.getByLabelText('Хиты 676 (33к20 + 330)'),
    ).toBeVisible()
    await expect(
      canvas.getByLabelText('Хиты 676 (33к20 + 330)'),
    ).toHaveAttribute('data-creature-hp-frame', 'monster')
    await userEvent.click(canvas.getByRole('button', { name: 'Бросить хиты 33к20 + 330' }))
    await expect(canvas.getByText(/^Хиты: \d+$/)).toBeVisible()
    await expect(canvas.getByText('676')).toBeVisible()
    await expect(
      canvas.getByLabelText('Класс доспеха 25, природный доспех'),
    ).toBeVisible()
    await expect(
      canvas.getByText('природный доспех'),
    ).toBeVisible()
    await expect(
      canvas.queryByText('Спасброски'),
    ).not.toBeInTheDocument()
    const wisdomSaveTab = canvas.getByRole('button', {
      name: 'Бросить спасбросок МДР, d20 +9',
    })
    const collapsedHeight = wisdomSaveTab.getBoundingClientRect().height
    await userEvent.hover(wisdomSaveTab)
    const abilityPanel = wisdomSaveTab.closest<HTMLElement>('[data-ability="wisdom"]')!
    await waitFor(() => {
      expect(abilityPanel).toHaveAttribute('data-save-open', 'true')
    })
    expect(wisdomSaveTab.getBoundingClientRect().width)
      .toBeLessThanOrEqual(abilityPanel.getBoundingClientRect().width)
    await expect(wisdomSaveTab).toHaveTextContent('d20 +9')
    await userEvent.click(wisdomSaveTab)
    await waitFor(() => {
      expect(wisdomSaveTab).toHaveAccessibleName(/d20 \d+ \+ 9 = \d+/)
      expect(wisdomSaveTab.getBoundingClientRect().height).toBe(collapsedHeight)
    })
    const resultBounds = wisdomSaveTab.getBoundingClientRect()
    const abilityBounds = abilityPanel.getBoundingClientRect()
    expect(resultBounds.left).toBeGreaterThanOrEqual(abilityBounds.left)
    expect(resultBounds.right).toBeLessThanOrEqual(abilityBounds.right)
    expect(wisdomSaveTab.scrollWidth).toBeLessThanOrEqual(wisdomSaveTab.clientWidth)
    await expect(
      canvas.getByRole('img', {
        name: /Урон огнём.*иммунитет/i,
      }),
    ).toBeVisible()
    await expect(canvas.getAllByRole('img')).toHaveLength(
      mockTarrasque.damageAffinities.length,
    )
    await expect(mockTarrasque.damageAffinities).toHaveLength(
      DAMAGE_TYPES.length,
    )
    await userEvent.click(canvas.getByRole('button', {
      name: 'Как читать сопротивления и уязвимости',
    }))
    const legend = await screen.findByRole('dialog', {
      name: 'Пояснение обозначений урона',
    })
    await waitFor(() => expect(legend).toBeVisible())
    await userEvent.keyboard('{Escape}')
    await expect(
      canvas.getByRole('heading', {
        name: 'Легендарные действия',
      }),
    ).toBeVisible()
  },
}
