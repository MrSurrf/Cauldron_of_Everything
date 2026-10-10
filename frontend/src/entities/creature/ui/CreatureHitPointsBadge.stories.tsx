import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { CreatureHitPointsBadge } from './CreatureHitPointsBadge'
import { getCreatureHitPointsFrame } from './creatureHitPointsBadge/creatureHitPointsFrames'

const creatureTypes = [
  ['aberration', 'аберрация'],
  ['beast', 'зверь'],
  ['celestial', 'небожитель'],
  ['construct', 'конструкт'],
  ['dragon', 'дракон'],
  ['elemental', 'элементаль'],
  ['fairy', 'фея'],
  ['fiend', 'исчадие'],
  ['giant', 'великан'],
  ['humanoid', 'гуманоид'],
  ['monster', 'монстр'],
  ['plant', 'растение'],
  ['slime', 'слизь'],
  ['undead', 'нежить'],
] as const

const meta = {
  component: CreatureHitPointsBadge,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '2rem', background: 'var(--color-canvas-background)' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    creatureType: 'монстр',
    hitPoints: '676 (33к20 + 330)',
  },
} satisfies Meta<typeof CreatureHitPointsBadge>

export default meta

type Story = StoryObj<typeof meta>

export const Monster: Story = {}

export const AllCreatureTypes: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(7rem, 1fr))',
        gap: '2rem 1rem',
      }}
    >
      {creatureTypes.map(([frameType, creatureType]) => (
        <div
          key={frameType}
          style={{ display: 'grid', justifyItems: 'center', gap: '0.5rem' }}
        >
          <CreatureHitPointsBadge
            creatureType={creatureType}
            hitPoints="100 (10к10 + 45)"
          />
          <small style={{ color: 'var(--color-text-secondary)' }}>
            {creatureType}
          </small>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const badges = canvasElement.querySelectorAll<HTMLElement>(
      '[data-creature-hp-frame]',
    )

    await expect(badges).toHaveLength(creatureTypes.length)

    badges.forEach((badge, index) => {
      const [expectedFrame] = creatureTypes[index]
      const [, creatureType] = creatureTypes[index]
      const expectedPresentation = getCreatureHitPointsFrame(creatureType)
      const label = badge.querySelector<HTMLElement>('[data-creature-hp-label]')
      const shape = badge.querySelector<HTMLElement>('[data-creature-hp-shape]')
      const value = badge.querySelector<HTMLElement>('[data-creature-hp-value]')

      expect(badge).toHaveAttribute('data-creature-hp-frame', expectedFrame)
      expect(label).not.toBeNull()
      expect(shape).not.toBeNull()
      expect(value).not.toBeNull()

      const labelBounds = label!.getBoundingClientRect()
      const shapeBounds = shape!.getBoundingClientRect()
      const valueBounds = value!.getBoundingClientRect()

      expect(shapeBounds.top - labelBounds.bottom).toBeGreaterThanOrEqual(8)
      const renderedCenterX = (
        valueBounds.left + valueBounds.width / 2 - shapeBounds.left
      ) / shapeBounds.width * 100
      const renderedCenterY = (
        valueBounds.top + valueBounds.height / 2 - shapeBounds.top
      ) / shapeBounds.height * 100

      expect(Math.abs(
        renderedCenterX - expectedPresentation.valueCenter.x,
      )).toBeLessThanOrEqual(0.5)
      expect(Math.abs(
        renderedCenterY - expectedPresentation.valueCenter.y,
      )).toBeLessThanOrEqual(0.5)
    })
  },
}
