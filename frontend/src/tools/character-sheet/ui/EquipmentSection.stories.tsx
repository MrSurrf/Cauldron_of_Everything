import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { EquipmentSection } from './EquipmentSection'

const entries = [
  {
    attuned: false,
    equipped: true,
    id: 'armor-instance',
    itemId: 'chain-mail',
    name: 'Кольчуга',
    notes: 'Выдана орденом',
    quantity: 1,
  },
  {
    attuned: false,
    equipped: false,
    id: 'rations-instance',
    name: 'Сухой паёк',
    notes: '',
    quantity: 5,
  },
] as const

const meta = {
  component: EquipmentSection,
  args: {
    entries,
    onAdd: fn(),
    onEntryChange: fn(),
    onEntryRemove: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(66rem, 100%)' }}>
        <Story />
      </div>
    ),
  ],
  tags: ['ai-generated'],
} satisfies Meta<typeof EquipmentSection>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText('Encyclopedia · chain-mail'),
    ).toBeVisible()
    await expect(
      canvas.getByRole('button', {
        name: 'Экипировка: Кольчуга',
      }),
    ).toHaveAttribute('aria-pressed', 'true')
  },
}

export const Empty: Story = {
  args: {
    entries: [],
  },
}
