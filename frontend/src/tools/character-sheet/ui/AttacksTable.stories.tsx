import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { AttacksTable } from './AttacksTable'

const attacks = [
  {
    attackBonus: '+5',
    damage: '1d8 + STR_MOD',
    damageType: 'Рубящий',
    id: 'longsword',
    name: 'Длинный меч',
    notes: 'Универсальное оружие',
  },
  {
    attackBonus: '+4',
    damage: '1d10',
    damageType: 'Огонь',
    id: 'fire-bolt',
    name: 'Огненный снаряд',
    notes: '',
  },
] as const

const meta = {
  component: AttacksTable,
  args: {
    attacks,
    onAdd: fn(),
    onAttackChange: fn(),
    onAttackRemove: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(54rem, 100%)' }}>
        <Story />
      </div>
    ),
  ],
  tags: ['ai-generated'],
} satisfies Meta<typeof AttacksTable>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('table'),
    ).toBeInTheDocument()
    await expect(
      canvas.getByDisplayValue('Длинный меч'),
    ).toBeVisible()
  },
}

export const Empty: Story = {
  args: {
    attacks: [],
  },
}
