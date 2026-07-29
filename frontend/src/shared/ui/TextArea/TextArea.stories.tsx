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
  (_, index) =>
    `Строка ${index + 1}: пример длинной записи.`,
).join('\n')

const meta = {
  component: TextArea,
  tags: ['ai-generated'],
  args: {
    label: 'Заметки',
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

function ResetExample() {
  return (
    <form aria-label={'Форма заметок'}>
      <TextArea
        defaultValue={'Черновик'}
        label={'История персонажа'}
        maxLength={20}
        name={'history'}
        showCharacterCount={true}
      />

      <button type={'reset'}>
        Сбросить
      </button>
    </form>
  )
}

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('textbox', {
        name: 'Заметки',
      }),
    ).toBeInTheDocument()
  },
}

export const LabelAndHint: Story = {
  args: {
    hint: 'Эту запись увидит только владелец листа.',
    label: 'Личная заметка',
  },
  play: async ({ canvas }) => {
    const textarea = canvas.getByRole(
      'textbox',
      { name: 'Личная заметка' },
    )
    const hint = canvas.getByText(
      'Эту запись увидит только владелец листа.',
    )

    await expect(
      textarea
        .getAttribute('aria-describedby')
        ?.split(/\s+/),
    ).toContain(hint.id)
  },
}

export const WithIcon: Story = {
  args: {
    icon: <PlaceholderIcon />,
  },
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelector(
        'svg[role=presentation]',
      ),
    ).toBeInTheDocument()
  },
}

export const Error: Story = {
  args: {
    error: 'Описание не удалось сохранить.',
    hint: 'Эта подсказка заменяется ошибкой.',
    label: 'Описание',
  },
  play: async ({ canvas }) => {
    const textarea = canvas.getByRole(
      'textbox',
      { name: 'Описание' },
    )
    const error = canvas.getByText(
      'Описание не удалось сохранить.',
    )

    await expect(textarea).toBeInvalid()
    await expect(
      textarea
        .getAttribute('aria-errormessage')
        ?.split(/\s+/),
    ).toContain(error.id)
    await expect(
      canvas.queryByText(
        'Эта подсказка заменяется ошибкой.',
      ),
    ).not.toBeInTheDocument()
  },
}

export const InvalidWithoutMessage: Story = {
  args: {
    invalid: true,
    label: 'Некорректное описание',
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('textbox', {
        name: 'Некорректное описание',
      }),
    ).toBeInvalid()
  },
}

export const CharacterLimit: Story = {
  args: {
    label: 'Короткая заметка',
    maxLength: 5,
    showCharacterCount: true,
  },
  play: async ({ canvas }) => {
    const textarea = canvas.getByRole(
      'textbox',
      { name: 'Короткая заметка' },
    )

    await userEvent.type(textarea, 'abcdef')
    await expect(textarea).toHaveValue('abcde')

    const counter = canvas.getByText('5 / 5')

    await expect(
      textarea
        .getAttribute('aria-describedby')
        ?.split(/\s+/),
    ).toContain(counter.id)
  },
}

export const FormReset: Story = {
  render: () => <ResetExample />,
  play: async ({ canvas }) => {
    const textarea = canvas.getByRole(
      'textbox',
      { name: 'История персонажа' },
    )

    await expect(textarea).toHaveValue(
      'Черновик',
    )
    await expect(
      canvas.getByText('8 / 20'),
    ).toBeInTheDocument()

    await userEvent.clear(textarea)
    await userEvent.type(textarea, 'Новый')
    await expect(
      canvas.getByText('5 / 20'),
    ).toBeInTheDocument()

    await userEvent.click(
      canvas.getByRole('button', {
        name: 'Сбросить',
      }),
    )

    await expect(textarea).toHaveValue(
      'Черновик',
    )
    await waitFor(() => {
      expect(
        canvas.getByText('8 / 20'),
      ).toBeInTheDocument()
    })
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
    const scrollBar = await canvas.findByRole(
      'slider',
      {
        name: 'Прокрутка текстового поля',
      },
    )

    await expect(
      textarea.scrollHeight,
    ).toBeGreaterThan(textarea.clientHeight)
    await expect(scrollBar).toHaveAttribute(
      'aria-controls',
      textarea.id,
    )

    const maximum = Number(
      scrollBar.getAttribute('max'),
    )

    fireEvent.change(scrollBar, {
      target: { value: maximum },
    })
    await expect(
      textarea.scrollTop,
    ).toBeGreaterThan(0)
    await expect(scrollBar).toHaveValue(
      String(maximum),
    )

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

export const PlaceholderBehavior: Story = {
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
