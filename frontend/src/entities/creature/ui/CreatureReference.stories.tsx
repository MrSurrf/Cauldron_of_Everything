import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { mockTarrasque } from '../model/mockTarrasque'
import { CreatureReference } from './CreatureReference'

const meta = {
  component: CreatureReference,
  decorators: [
    (Story) => (
      <div
        style={{
          display: 'grid',
          minHeight: '12rem',
          padding: 'var(--space-6)',
          placeItems: 'start',
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
} satisfies Meta<typeof CreatureReference>

export default meta

type Story = StoryObj<typeof meta>

export const Tarrasque: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Тараск')).toBeVisible()
    await expect(canvas.getByText('ПО 30')).toBeVisible()
  },
}
