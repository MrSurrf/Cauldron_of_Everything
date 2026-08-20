import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import { useState } from 'react'

import {
  SheetAppearanceSettings,
  type SheetAppearanceValue,
} from './SheetAppearanceSettings'

function StatefulAppearance() {
  const [value, setValue] = useState<SheetAppearanceValue>({
    bodySize: 'medium',
    density: 'compact',
    fontFamily: 'gilroy',
    headingSize: 'medium',
  })

  return (
    <SheetAppearanceSettings
      value={value}
      onValueChange={setValue}
    />
  )
}

const meta = {
  component: SheetAppearanceSettings,
  args: {
    onValueChange: () => undefined,
    value: {
      bodySize: 'medium',
      density: 'compact',
      fontFamily: 'gilroy',
      headingSize: 'medium',
    },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '30rem',
          padding: 'var(--space-5)',
          background: 'var(--color-background)',
        }}
      >
        <Story />
      </div>
    ),
  ],
  render: () => <StatefulAppearance />,
} satisfies Meta<typeof SheetAppearanceSettings>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
