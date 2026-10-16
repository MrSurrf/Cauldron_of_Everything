import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'

import { SelectionMarker } from './SelectionMarker'
import type { SelectionMarkerState } from './SelectionMarker.types'

const states: readonly SelectionMarkerState[] = [
  'unchecked',
  'checked',
  'mixed',
  'diamond',
]

const meta = {
  component: SelectionMarker,
  tags: ['ai-generated'],
} satisfies Meta<typeof SelectionMarker>

export default meta

type Story = StoryObj<typeof meta>

export const States: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {states.map((state) => (
        <div
          key={state}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <SelectionMarker state={state} />
          <span>{state}</span>
        </div>
      ))}
    </div>
  ),
}
