import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { mockTarrasque } from '../model/mockTarrasque'
import { CreatureCompactCard } from './CreatureCompactCard'

const meta = {
  component: CreatureCompactCard,
  decorators: [
    (Story) => (
      <div
        style={{
          minHeight: '20rem',
          padding: 'var(--space-6)',
          background: 'var(--color-canvas-background)',
        }}
      >
        <Story />
      </div>
    ),
  ],
  args: {
    entity: mockTarrasque,
  },
} satisfies Meta<typeof CreatureCompactCard>

export default meta

type Story = StoryObj<typeof meta>

export const Tarrasque: Story = {
  play: async ({ canvas }) => {
    const card = canvas.getByRole('article', {
      name: 'Тараск',
    })

    await expect(card).toBeVisible()
    await expect(card.textContent).toContain('Tarrasque')
    await expect(card.textContent).toContain('30')
  },
}
