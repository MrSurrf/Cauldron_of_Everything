import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { PlaceholderIcon } from '../icons/PlaceholderIcon'
import { IconFrame } from './IconFrame'

const designColorTokens = [
  'var(--palette-black)',
  'var(--palette-white)',
  'var(--palette-purple-300)',
  'var(--palette-purple-500)',
  'var(--palette-purple-700)',
  'var(--palette-gray-300)',
  'var(--palette-gray-700)',
  'var(--palette-gray-900)',
  'var(--palette-red-500)',
  'var(--palette-green-500)',
  'var(--palette-yellow-500)',
  'var(--color-background)',
  'var(--color-surface-default)',
  'var(--color-surface-muted)',
  'var(--color-surface-accent)',
  'var(--color-text-primary)',
  'var(--color-text-secondary)',
  'var(--color-text-disabled)',
  'var(--color-border-default)',
  'var(--color-border-accent)',
  'var(--color-action-primary)',
  'var(--color-status-danger)',
  'var(--color-status-success)',
  'var(--color-status-warning)',
] as const

const meta = {
  component: IconFrame,
  tags: ['ai-generated'],
  args: {
    children: <PlaceholderIcon />,
    circleBackgroundOpacity: 0.1,
    contentSize: '42%',
    frameColor: 'var(--palette-purple-300)',
    glow: true,
    size: 240,
    squareBackgroundColor: 'var(--color-background)',
  },
  argTypes: {
    children: {
      control: false,
    },
    circleBackgroundColor: {
      control: 'select',
      options: designColorTokens,
    },
    circleBackgroundOpacity: {
      control: {
        type: 'range',
        min: 0,
        max: 1,
        step: 0.05,
      },
    },
    frameColor: {
      control: 'select',
      options: designColorTokens,
    },
    squareBackgroundColor: {
      control: 'select',
      options: designColorTokens,
    },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          display: 'grid',
          minHeight: '32rem',
          placeItems: 'center',
          background: 'var(--color-background)',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof IconFrame>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  args: {
    children: null,
  },
}

export const SeparateSurfaces: Story = {
  args: {
    circleBackgroundColor:
      'var(--palette-purple-700)',
    circleBackgroundOpacity: 0.45,
    frameColor:
      'var(--palette-purple-300)',
    squareBackgroundColor:
      'var(--palette-gray-900)',
  },
}

export const WithoutGlow: Story = {
  args: {
    glow: false,
  },
}

export const ReferenceGeometry: Story = {
  args: {
    children: null,
    circleBackgroundColor:
      'var(--palette-white)',
    circleBackgroundOpacity: 1,
    frameColor: 'var(--palette-black)',
    glow: false,
    size: 420,
    squareBackgroundColor:
      'var(--palette-white)',
  },
  decorators: [
    (Story) => (
      <div
        style={{
          display: 'grid',
          minHeight: '34rem',
          placeItems: 'center',
          background:
            'var(--palette-white)',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const Compact: Story = {
  args: {
    size: 96,
  },
}

export const NarrowContainer: Story = {
  args: {
    contentSize: 120,
    size: 240,
  },
  render: (args) => (
    <div
      data-testid="narrow-container"
      style={{
        width:
          'calc(var(--space-7) + var(--space-5))',
      }}
    >
      <IconFrame
        {...args}
        data-testid="adaptive-icon-frame"
      />
    </div>
  ),
  play: async ({ canvas }) => {
    const container = canvas.getByTestId(
      'narrow-container',
    )
    const frame = canvas.getByTestId(
      'adaptive-icon-frame',
    )
    const contentIcon =
      frame.querySelectorAll('svg')[1]

    await expect(
      frame.getBoundingClientRect().width,
    ).toBeLessThanOrEqual(
      container.getBoundingClientRect().width,
    )
    await expect(contentIcon).toBeTruthy()
    await expect(
      contentIcon.getBoundingClientRect().width,
    ).toBeLessThanOrEqual(
      frame.getBoundingClientRect().width,
    )
  },
}

export const FluidSize: Story = {
  args: {
    size: 'clamp(6rem, 24vw, 15rem)',
  },
}
