import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import {
  expect,
  fn,
  userEvent,
} from 'storybook/test'

import { PlaceholderIcon } from '../icons/PlaceholderIcon'
import { IconButton } from './IconButton'

const meta = {
  component: IconButton,
  tags: ['ai-generated'],
  args: {
    'aria-label': 'Добавить',
    icon: <PlaceholderIcon />,
  },
  argTypes: {
    icon: {
      control: false,
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
    variant: {
      control: 'radio',
      options: ['primary', 'secondary'],
    },
  },
} satisfies Meta<typeof IconButton>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Primary: Story = {
  args: {
    variant: 'primary',
  },
}

export const Sizes: Story = {
  render: (args) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}
    >
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <IconButton
          {...args}
          key={size}
          aria-label={`Добавить, размер ${size}`}
          size={size}
        />
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    const expectedSizes = {
      sm: 32,
      md: 40,
      lg: 48,
    } as const

    for (const size of ['sm', 'md', 'lg'] as const) {
      const button = canvas.getByRole('button', {
        name: `Добавить, размер ${size}`,
      })

      await expect(button).toHaveAttribute(
        'data-size',
        size,
      )
      await expect(button.getBoundingClientRect().width)
        .toBe(expectedSizes[size])
      await expect(button.getBoundingClientRect().height)
        .toBe(expectedSizes[size])
    }
  },
}

export const Loading: Story = {
  args: {
    loading: true,
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', {
      name: 'Добавить',
    })

    await expect(button).toBeDisabled()
    await expect(button).toHaveAttribute(
      'aria-busy',
      'true',
    )
    await expect(getComputedStyle(button).opacity)
      .toBe('1')
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
  },
}

const iconButtonClick = fn()

export const KeyboardActivation: Story = {
  args: {
    'aria-label': 'Создать персонажа',
    onClick: iconButtonClick,
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', {
      name: 'Создать персонажа',
    })

    await userEvent.tab()
    await expect(button).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    await expect(iconButtonClick).toHaveBeenCalledTimes(1)
  },
}
