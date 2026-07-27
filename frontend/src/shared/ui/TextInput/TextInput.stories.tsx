import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import {
  expect,
  userEvent,
} from 'storybook/test'

import { PlaceholderIcon } from '../icons/PlaceholderIcon'
import { TextInput } from './TextInput'

const meta = {
  component: TextInput,
  tags: ['ai-generated'],
  args: {
    'aria-label': 'Текстовое поле',
  },
  argTypes: {
    icon: {
      control: false,
    },
    type: {
      control: 'select',
      options: [
        'text',
        'search',
        'email',
        'password',
        'url',
        'tel',
      ],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '26rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextInput>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithIcon: Story = {
  args: {
    icon: <PlaceholderIcon />,
  },
}

export const Search: Story = {
  args: {
    icon: <PlaceholderIcon />,
    placeholder: 'Поиск по сайту...',
    type: 'search',
  },
}

export const Filled: Story = {
  args: {
    defaultValue: 'Введённый текст',
  },
}

export const CustomPlaceholder: Story = {
  args: {
    placeholder: 'Название персонажа...',
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
  },
}

export const PlaceholderBehavior: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByRole('textbox')

    await expect(input).toHaveValue('')
    await userEvent.click(input)
    await expect(input).toHaveFocus()
    await expect(
      input.matches(':placeholder-shown'),
    ).toBe(true)

    await userEvent.type(input, 'А')
    await expect(input).toHaveValue('А')
    await expect(
      input.matches(':placeholder-shown'),
    ).toBe(false)
  },
}
