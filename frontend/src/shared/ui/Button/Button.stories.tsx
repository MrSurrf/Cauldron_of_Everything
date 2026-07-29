import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import {
  expect,
  fn,
  userEvent,
} from 'storybook/test'

import { Button } from './Button'

const meta = {
  component: Button,
  tags: ['ai-generated'],
  args: {
    children: 'Начать приключение',
    variant: 'primary',
  },
  argTypes: {
    icon: {
      control: false,
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg', 'hero'],
    },
    variant: {
      control: 'radio',
      options: ['primary', 'secondary'],
    },
  },
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

export const Primary: Story = {}

export const Sizes: Story = {
  render: (args) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}
    >
      {(['sm', 'md', 'lg', 'hero'] as const).map((size) => (
        <Button
          {...args}
          key={size}
          size={size}
        >
          Размер {size}
        </Button>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    const expectedHeights = {
      sm: '32px',
      md: '40px',
      lg: '48px',
      hero: '88px',
    } as const

    for (const size of ['sm', 'md', 'lg', 'hero'] as const) {
      const button = canvas.getByRole('button', {
        name: `Размер ${size}`,
      })

      await expect(
        getComputedStyle(button).minHeight,
      ).toBe(expectedHeights[size])
    }
  },
}

export const Secondary: Story = {
  args: {
    children: 'Пройти опрос',
    variant: 'secondary',
  },
}

export const WithoutIcon: Story = {
  args: {
    icon: null,
  },
}

export const CustomIcon: Story = {
  args: {
    icon: (
      <svg viewBox={'0 0 24 24'}>
        <circle
          cx={12}
          cy={12}
          r={7}
          fill={'currentColor'}
        />
      </svg>
    ),
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
  },
}

export const FullWidth: Story = {
  args: {
    fullWidth: true,
  },
  parameters: {
    layout: 'padded',
  },
}

export const CssCheck: Story = {
  args: {
    children: 'Проверка стилей',
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button')

    await expect(
      getComputedStyle(button).backgroundColor,
    ).toBe('rgb(126, 20, 255)')
  },
}

const keyboardClick = fn()

export const KeyboardActivation: Story = {
  args: {
    children: 'Открыть инструмент',
    onClick: keyboardClick,
    size: 'md',
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', {
      name: 'Открыть инструмент',
    })

    await userEvent.tab()
    await expect(button).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    await expect(keyboardClick).toHaveBeenCalledTimes(1)
  },
}
