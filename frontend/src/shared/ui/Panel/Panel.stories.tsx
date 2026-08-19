import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { Button } from '../Button'
import { Panel } from './Panel'

function ExampleContent() {
  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--space-3)',
      }}
    >
      <h2
        style={{
          margin: 0,
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-family-heading)',
          fontSize: 'var(--font-size-xl)',
          fontWeight: 400,
        }}
      >
        Лист персонажа
      </h2>

      <p
        style={{
          margin: 0,
          color: 'var(--color-text-secondary)',
        }}
      >
        Здесь может находиться содержимое инструмента,
        карточки или самостоятельного раздела страницы.
      </p>
    </div>
  )
}

const meta = {
  component: Panel,
  tags: ['ai-generated'],
  args: {
    children: <ExampleContent />,
    padding: 'normal',
  },
  argTypes: {
    children: {
      control: false,
    },
    padding: {
      control: 'inline-radio',
      options: [
        'none',
        'compact',
        'normal',
      ],
    },
    variant: {
      control: 'inline-radio',
      options: [
        'default',
        'draggable',
      ],
    },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: 'min(100%, 56rem)',
          minHeight: '28rem',
          padding: 'var(--space-6)',
          background: 'var(--color-background)',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Panel>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Draggable: Story = {
  args: {
    variant: 'draggable',
  },
}

export const CompactPadding: Story = {
  args: {
    padding: 'compact',
  },
}

export const WithoutPadding: Story = {
  args: {
    children: (
      <div
        style={{
          display: 'grid',
          minHeight: '15rem',
          placeItems: 'center',
          background: 'var(--color-surface-muted)',
          color: 'var(--color-text-secondary)',
        }}
      >
        Область будущего canvas
      </div>
    ),
    padding: 'none',
  },
}

export const NarrowContainer: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '18rem' }}>
        <Story />
      </div>
    ),
  ],
}

export const NestedControls: Story = {
  args: {
    'aria-label': 'Настройки персонажа',
    children: (
      <div
        style={{
          display: 'grid',
          gap: 'var(--space-4)',
        }}
      >
        <ExampleContent />

        <Button variant="secondary">
          Открыть настройки
        </Button>
      </div>
    ),
    role: 'region',
  },
  play: async ({
    canvas,
    userEvent,
  }) => {
    const panel = canvas.getByRole(
      'region',
      {
        name: 'Настройки персонажа',
      },
    )
    const button = canvas.getByRole(
      'button',
      {
        name: 'Открыть настройки',
      },
    )

    await expect(panel).toBeVisible()
    await userEvent.click(button)
    await expect(button).toHaveFocus()
  },
}
