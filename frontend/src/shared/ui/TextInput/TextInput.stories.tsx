import {
  useRef,
  useState,
} from 'react'
import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import {
  expect,
  userEvent,
  waitFor,
} from 'storybook/test'

import { PlaceholderIcon } from '../icons/PlaceholderIcon'
import { TextInput } from './TextInput'

function ControlledCounterExample() {
  const [value, setValue] = useState('Эльф')

  return (
    <TextInput
      label="Раса"
      maxLength={12}
      showCharacterCount={true}
      value={value}
      onChange={(event) => {
        setValue(event.currentTarget.value)
      }}
    />
  )
}

function FormResetExample() {
  return (
    <form>
      <TextInput
        defaultValue="Ария"
        label="Имя персонажа"
        maxLength={12}
        name="characterName"
        showCharacterCount={true}
      />

      <button type="reset">Сбросить</button>
    </form>
  )
}

function RefExample() {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <TextInput ref={inputRef} label="Имя игрока" />
      <button
        type="button"
        onClick={() => inputRef.current?.focus()}
      >
        Перейти к полю
      </button>
    </div>
  )
}

const meta = {
  component: TextInput,
  tags: ['ai-generated'],
  args: { label: 'Название' },
  argTypes: {
    error: { control: 'text' },
    hint: { control: 'text' },
    icon: { control: false },
    label: { control: 'text' },
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

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByLabelText('Название'),
    ).toBeInTheDocument()
  },
}

export const WithHint: Story = {
  args: {
    hint: 'Это название увидят другие игроки.',
    label: 'Имя персонажа',
  },
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText(
      'Имя персонажа',
    )
    const hint = canvas.getByText(
      'Это название увидят другие игроки.',
    )

    await expect(
      input
        .getAttribute('aria-describedby')
        ?.split(/\s+/),
    ).toContain(hint.id)
  },
}

export const Error: Story = {
  args: {
    error: 'Введите имя персонажа.',
    label: 'Имя персонажа',
    required: true,
  },
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText(
      /Имя персонажа/,
    )
    const error = canvas.getByText(
      'Введите имя персонажа.',
    )

    await expect(input).toBeInvalid()
    await expect(
      input
        .getAttribute('aria-errormessage')
        ?.split(/\s+/),
    ).toContain(error.id)
  },
}

export const ExplicitInvalid: Story = {
  args: {
    invalid: true,
    label: 'Недопустимое значение',
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByLabelText(
        'Недопустимое значение',
      ),
    ).toBeInvalid()
  },
}

export const WithIcon: Story = {
  args: {
    icon: <PlaceholderIcon />,
    label: 'Поиск',
  },
  play: async ({ canvasElement }) => {
    const icon = canvasElement.querySelector(
      'svg[role=presentation]',
    )

    await expect(icon).toBeInTheDocument()
    await expect(
      icon?.closest('[data-has-icon=true]'),
    ).toBeInTheDocument()
    await expect(icon?.parentElement).toHaveAttribute(
      'aria-hidden',
      'true',
    )
  },
}

export const Search: Story = {
  args: {
    icon: <PlaceholderIcon />,
    label: 'Поиск по сайту',
    placeholder: 'Найти материал...',
    type: 'search',
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('searchbox', {
        name: 'Поиск по сайту',
      }),
    ).toHaveAttribute('type', 'search')
  },
}

export const Filled: Story = {
  args: {
    defaultValue: 'Введённый текст',
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByLabelText('Название'),
    ).toHaveValue('Введённый текст')
  },
}

export const CustomPlaceholder: Story = {
  args: {
    'aria-label': 'Название персонажа',
    label: undefined,
    placeholder: 'Название персонажа...',
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByLabelText('Название персонажа'),
    ).toHaveAttribute(
      'placeholder',
      'Название персонажа...',
    )
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    label: 'Недоступное поле',
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByLabelText('Недоступное поле'),
    ).toBeDisabled()
  },
}

export const CharacterLimit: Story = {
  args: {
    label: 'Короткое имя',
    maxLength: 5,
    showCharacterCount: true,
  },
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText(
      'Короткое имя',
    )

    await expect(
      canvas.getByText('0 / 5'),
    ).toBeInTheDocument()
    await userEvent.type(input, 'Дракон')
    await expect(input).toHaveValue('Драко')

    const counter = canvas.getByText('5 / 5')

    await expect(
      input
        .getAttribute('aria-describedby')
        ?.split(/\s+/),
    ).toContain(counter.id)
    await expect(input).toHaveAttribute(
      'maxlength',
      '5',
    )
  },
}

export const ControlledOverLimit: Story = {
  args: {
    label: 'Код персонажа',
    maxLength: 3,
    showCharacterCount: true,
    value: 'Дракон',
  },
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText(
      'Код персонажа',
    )

    await expect(input).toHaveValue('Дракон')
    await expect(input).toBeInvalid()
    await expect(
      canvas.getByText('6 / 3'),
    ).toBeInTheDocument()
  },
}

export const ConditionalIconDisabled: Story = {
  args: {
    icon: false,
    label: 'Поле без иконки',
  },
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText(
      'Поле без иконки',
    )

    await expect(
      input.closest('[data-has-icon]'),
    ).toBeNull()
  },
}

export const ControlledCounter: Story = {
  render: () => <ControlledCounterExample />,
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Раса')

    await expect(
      canvas.getByText('4 / 12'),
    ).toBeInTheDocument()
    await userEvent.clear(input)
    await userEvent.type(input, 'Тифлинг')
    await expect(input).toHaveValue('Тифлинг')
    await expect(
      canvas.getByText('7 / 12'),
    ).toBeInTheDocument()
  },
}

export const FormReset: Story = {
  render: () => <FormResetExample />,
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText(
      'Имя персонажа',
    )

    await expect(input).toHaveValue('Ария')
    await expect(
      canvas.getByText('4 / 12'),
    ).toBeInTheDocument()
    await userEvent.clear(input)
    await userEvent.type(input, 'Маг')
    await expect(
      canvas.getByText('3 / 12'),
    ).toBeInTheDocument()

    await userEvent.click(
      canvas.getByRole('button', {
        name: 'Сбросить',
      }),
    )
    await expect(input).toHaveValue('Ария')
    await waitFor(() => {
      expect(
        canvas.getByText('4 / 12'),
      ).toBeInTheDocument()
    })
  },
}

export const ForwardedRef: Story = {
  render: () => <RefExample />,
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Имя игрока')

    await userEvent.click(
      canvas.getByRole('button', {
        name: 'Перейти к полю',
      }),
    )
    await expect(input).toHaveFocus()
  },
}

export const PlaceholderBehavior: Story = {
  args: {
    'aria-label': 'Текстовое поле',
    label: undefined,
  },
  play: async ({ canvas }) => {
    const input = canvas.getByRole('textbox', {
      name: 'Текстовое поле',
    })

    await expect(input).toHaveValue('')
    await expect(input).toHaveAttribute(
      'placeholder',
      'Ваш текст...',
    )
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
