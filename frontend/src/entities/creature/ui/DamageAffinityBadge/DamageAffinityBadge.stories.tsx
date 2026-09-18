import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import {
  expect,
  screen,
  userEvent,
} from 'storybook/test'

import { DAMAGE_TYPES } from '../../model/creature'
import { DamageAffinityBadge } from './DamageAffinityBadge'

const meta = {
  component: DamageAffinityBadge,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div
        style={{
          padding: '2rem',
          background: '#080611',
        }}
      >
        <Story />
      </div>
    ),
  ],
  args: {
    damageType: 'force',
    physicalState: 'resistance',
    magicalState: 'vulnerability',
  },
} satisfies Meta<typeof DamageAffinityBadge>

export default meta

type Story = StoryObj<typeof meta>

export const MixedStates: Story = {
  play: async ({ canvas }) => {
    const badge = canvas.getByRole('img', {
      name: /Силовой урон.*сопротивление.*уязвимость/i,
    })

    await expect(badge).toBeVisible()
    await expect(
      badge.querySelector(
        '[data-marker="physical-resistance"]',
      ),
    ).toBeInTheDocument()
    await expect(
      badge.querySelector(
        '[data-marker="magical-vulnerability"]',
      ),
    ).toBeInTheDocument()
    await userEvent.hover(badge)
    await expect(
      await screen.findByRole('tooltip'),
    ).toHaveTextContent(
      'Силовой урон: физический источник — сопротивление; магический источник — уязвимость.',
    )
  },
}

export const AllDamageTypes: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        maxWidth: '42rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '0.75rem',
      }}
    >
      {DAMAGE_TYPES.map((damageType) => (
        <DamageAffinityBadge
          key={damageType}
          damageType={damageType}
          physicalState="resistance"
          magicalState="immunity"
        />
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('img')).toHaveLength(
      DAMAGE_TYPES.length,
    )
  },
}

export const StateCombinations: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        maxWidth: '34rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '0.75rem',
      }}
    >
      <DamageAffinityBadge
        damageType="slashing"
        physicalState="vulnerability"
      />
      <DamageAffinityBadge
        damageType="slashing"
        magicalState="vulnerability"
      />
      <DamageAffinityBadge
        damageType="slashing"
        physicalState="resistance"
      />
      <DamageAffinityBadge
        damageType="slashing"
        magicalState="resistance"
      />
      <DamageAffinityBadge
        damageType="slashing"
        physicalState="resistance"
        magicalState="resistance"
      />
      <DamageAffinityBadge
        damageType="slashing"
        physicalState="immunity"
      />
      <DamageAffinityBadge
        damageType="slashing"
        magicalState="immunity"
      />
      <DamageAffinityBadge
        damageType="slashing"
        physicalState="immunity"
        magicalState="immunity"
      />
    </div>
  ),
}
