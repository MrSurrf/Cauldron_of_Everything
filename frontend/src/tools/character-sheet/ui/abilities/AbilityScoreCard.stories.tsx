import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import { useState } from 'react'

import {
  AbilityScoreCard,
  type AbilityScoreCardProps,
} from './AbilityScoreCard'

function StatefulCard(props: AbilityScoreCardProps) {
  const [score, setScore] = useState(props.score)
  const [modifier, setModifier] = useState(
    props.modifier,
  )

  return (
    <AbilityScoreCard
      {...props}
      score={score}
      modifier={modifier}
      onScoreChange={setScore}
      onModifierChange={setModifier}
    />
  )
}

const meta = {
  component: AbilityScoreCard,
  decorators: [
    (Story) => (
      <div
        style={{
          width: '20rem',
          padding: 'var(--space-5)',
          background: 'var(--color-background)',
        }}
      >
        <Story />
      </div>
    ),
  ],
  render: (args) => <StatefulCard {...args} />,
  args: {
    abbreviation: 'STR',
    label: 'Сила',
    modifier: {
      formulaOverride: null,
      manualValue: 2,
      mode: 'formula',
    },
    modifierResult: { status: 'ok', value: 2 },
    onModifierChange: () => undefined,
    onScoreChange: () => undefined,
    score: {
      formulaOverride: null,
      manualValue: 15,
      mode: 'manual',
    },
    scoreResult: { status: 'ok', value: 15 },
  },
} satisfies Meta<typeof AbilityScoreCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
