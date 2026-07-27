import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import {
  expect,
  fireEvent,
  userEvent,
  waitFor,
} from 'storybook/test'

import { PlaceholderIcon } from '../icons/PlaceholderIcon'
import { TextArea } from './TextArea'

const longText = Array.from(
  { length: 14 },
  (_, index) => `Строка ${index + 1}: пример длинной записи.`,
).join('\n')

const meta = {
  component: TextArea,
  tags: ['ai-generated'],
  args: {
    'aria-label': 'Многострочное текстовое поле',
  },
  argTypes: {
    icon: {
      control: false,
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '30rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextArea>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithIcon: Story = {
  args: {
    icon: <PlaceholderIcon />,
  },
}

export const Filled: Story = {
  args: {
    defaultValue:
      'Первая строка записи.\nВторая строка сохраняет перенос.',
  },
}

export const Scrollable: Story = {
  args: {
    defaultValue: longText,
    rows: 5,
  },
  play: async ({ canvas }) => {
    const textarea = canvas.getByRole('textbox')
    const scrollBar = await canvas.findByRole('slider', {
      name: 'Прокрутка текстового поля',
    })

    await expect(textarea.scrollHeight).toBeGreaterThan(
      textarea.clientHeight,
    )
    await expect(scrollBar).toHaveAttribute(
      'aria-controls',
      textarea.id,
    )

    const maximum = Number(scrollBar.getAttribute('max'))

    fireEvent.change(scrollBar, {
      target: { value: maximum },
    })
    await expect(textarea.scrollTop).toBeGreaterThan(0)
    await expect(scrollBar).toHaveValue(String(maximum))

    textarea.scrollTop = 0
    fireEvent.scroll(textarea)
    await waitFor(() => {
      expect(scrollBar).toHaveValue('0')
    })
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
  },
}

export const DynamicOverflow: Story = {
  args: {
    icon: <PlaceholderIcon />,
    rows: 3,
  },
  play: async ({ canvas }) => {
    const textarea = canvas.getByRole('textbox')

    await expect(
      canvas.queryByRole('slider'),
    ).not.toBeInTheDocument()

    fireEvent.input(textarea, {
      target: { value: longText },
    })
    await expect(
      await canvas.findByRole('slider', {
        name: 'Прокрутка текстового поля',
      }),
    ).toBeInTheDocument()

    fireEvent.input(textarea, {
      target: { value: 'Короткий текст' },
    })
    await waitFor(() => {
      expect(
        canvas.queryByRole('slider'),
      ).not.toBeInTheDocument()
    })
  },
}

export const MultilineBehavior: Story = {
  play: async ({ canvas }) => {
    const textarea = canvas.getByRole('textbox')

    await userEvent.click(textarea)
    await expect(textarea).toHaveFocus()
    await expect(
      textarea.matches(':placeholder-shown'),
    ).toBe(true)

    await userEvent.type(
      textarea,
      'Первая строка{enter}Вторая строка',
    )
    await expect(textarea).toHaveValue(
      'Первая строка\nВторая строка',
    )
    await expect(
      textarea.matches(':placeholder-shown'),
    ).toBe(false)
  },
}
