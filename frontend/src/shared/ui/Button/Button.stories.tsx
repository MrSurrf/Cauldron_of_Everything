import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { Button } from './Button'

const meta = {
  component: Button,
  tags: ['ai-generated'],
  args: {
    children: 'Начать приключение',
    variant: 'primary',
  },
  argTypes: {
    variant: {
      control: 'radio',
      options: ['primary', 'secondary'],
    },
  },
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

export const Primary: Story = {}

export const Secondary: Story = {
  args: {
    children: 'Пройти опрос',
    variant: 'secondary',
  },
}

export const WithoutArrow: Story = {
  args: {
    showArrow: false,
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
