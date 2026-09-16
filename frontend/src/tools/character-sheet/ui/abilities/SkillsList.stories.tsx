import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import { useState } from 'react'

import {
  SkillsList,
  type SkillListItem,
  type SkillsListProps,
} from './SkillsList'

const initialItems: SkillListItem[] = [
  {
    ability: 'ЛОВ',
    id: 'acrobatics',
    label: 'Акробатика',
    rank: 'proficient',
    result: { status: 'ok', value: 5 },
    value: {
      formulaOverride: null,
      manualValue: 0,
      mode: 'formula',
    },
  },
  {
    ability: 'МУД',
    id: 'perception',
    label: 'Восприятие',
    rank: 'expertise',
    result: { status: 'ok', value: 7 },
    value: {
      formulaOverride: null,
      manualValue: 0,
      mode: 'formula',
    },
  },
]

function StatefulSkills(props: SkillsListProps) {
  const [items, setItems] = useState(props.items)

  return (
    <SkillsList
      items={items}
      onItemChange={(id, patch) => {
        setItems((current) => current.map((item) =>
          item.id === id
            ? { ...item, ...patch }
            : item,
        ))
      }}
    />
  )
}

const meta = {
  component: SkillsList,
  decorators: [
    (Story) => (
      <div
        style={{
          width: '24rem',
          padding: 'var(--space-5)',
          background: 'var(--color-background)',
        }}
      >
        <Story />
      </div>
    ),
  ],
  render: (args) => <StatefulSkills {...args} />,
  args: {
    items: initialItems,
    onItemChange: () => undefined,
  },
} satisfies Meta<typeof SkillsList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
