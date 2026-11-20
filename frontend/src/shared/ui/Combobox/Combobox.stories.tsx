import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import { useState } from 'react'
import {
  expect,
  fn,
  screen,
  userEvent,
  waitFor,
} from 'storybook/test'

import { PlaceholderIcon } from '../icons/PlaceholderIcon'
import { Combobox } from './Combobox'
import type { ComboboxOption } from './Combobox.types'

const options: ComboboxOption[] = [
  {
    value: 'barbarian',
    label: 'Варвар',
    description: 'Сила и ярость',
    icon: <PlaceholderIcon />,
    keywords: ['берсерк'],
  },
  {
    value: 'bard',
    label: 'Бард',
    description: 'Вдохновение и музыка',
    icon: <PlaceholderIcon />,
  },
  {
    value: 'fighter',
    label: 'Воин',
    description: 'Мастер оружия',
    icon: <PlaceholderIcon />,
  },
  {
    value: 'wizard',
    label: 'Волшебник',
    description: 'Книжная магия',
    icon: <PlaceholderIcon />,
    keywords: ['маг'],
  },
  {
    value: 'druid',
    label: 'Друид',
    description: 'Силы природы',
    icon: <PlaceholderIcon />,
  },
  {
    value: 'cleric',
    label: 'Жрец',
    description: 'Божественная магия',
    icon: <PlaceholderIcon />,
  },
  {
    value: 'rogue',
    label: 'Плут',
    description: 'Ловкость и скрытность',
    icon: <PlaceholderIcon />,
  },
  {
    value: 'sorcerer',
    label: 'Чародей',
    description: 'Врождённая магия',
    icon: <PlaceholderIcon />,
  },
]

const submitAttempt = fn()
const controlledSubmitAttempt = fn()

function RetainedSelectionExample() {
  const [value, setValue] = useState('wizard')
  const [query, setQuery] = useState('')
  return <form onSubmit={event => { event.preventDefault(); controlledSubmitAttempt(new FormData(event.currentTarget)) }}>
    <Combobox label="Класс персонажа" name="classId" options={options} value={value} required
      onQueryChange={setQuery} onValueChange={next => { if (next !== null) setValue(next) }} />
    <output data-testid="confirmed-value">{value}</output>
    <output data-testid="search-query">{query}</output>
    <button type="button" onClick={() => setValue('cleric')}>Выбрать жреца извне</button>
    <button type="submit">Сохранить</button>
  </form>
}

function FormBehaviorExample() {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submitAttempt(
          new FormData(event.currentTarget),
        )
      }}
    >
      <Combobox
        defaultValue="wizard"
        label="Класс персонажа"
        name="classId"
        options={options}
        required={true}
      />

      <button type="submit">Сохранить</button>
      <button type="reset">Сбросить</button>
    </form>
  )
}

const meta = {
  component: Combobox,
  args: {
    label: 'Класс персонажа',
    options,
    placeholder: 'Выберите класс...',
  },
  argTypes: {
    options: {
      control: false,
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '28rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Combobox>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Filled: Story = {
  args: {
    defaultValue: 'wizard',
    hint: 'Можно найти класс по названию.',
  },
}

export const Invalid: Story = {
  args: {
    error: 'Выберите класс персонажа.',
    invalid: true,
    required: true,
  },
}

export const Disabled: Story = {
  args: {
    defaultValue: 'bard',
    disabled: true,
  },
}

export const ClearSelection: Story = {
  args: {
    defaultValue: 'wizard',
  },
  play: async ({ canvas }) => {
    const input = canvas.getByRole('combobox')

    await userEvent.click(input)
    await userEvent.clear(input)
    await expect(input).toHaveValue('')
  },
}

export const FormValueAndValidation: Story = {
  render: () => <FormBehaviorExample />,
  play: async ({ canvas, canvasElement }) => {
    submitAttempt.mockClear()
    const input = canvas.getByRole('combobox')

    await userEvent.click(input)
    await userEvent.type(input, 'неизвестный')
    await expect(input).toHaveValue(
      'неизвестный',
    )
    await expect(input).toBeInvalid()

    const hiddenInput =
      canvasElement.querySelector(
        'input[type="hidden"][name="classId"]',
      )

    await expect(hiddenInput).toHaveValue('')
    await userEvent.keyboard('{Enter}')
    await expect(
      submitAttempt,
    ).not.toHaveBeenCalled()
  },
}

export const FormReset: Story = {
  render: () => <FormBehaviorExample />,
  play: async ({ canvas }) => {
    const input = canvas.getByRole('combobox')

    await userEvent.click(input)
    await userEvent.click(
      screen.getByRole('option', {
        name: /Бард/,
      }),
    )
    await expect(input).toHaveValue('Бард')

    await userEvent.click(
      canvas.getByRole('button', {
        name: 'Сбросить',
      }),
    )
    await expect(input).toHaveValue(
      'Волшебник',
    )
  },
}

export const SearchAndSelect: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByRole('combobox')

    await userEvent.click(input)
    await waitFor(() => {
      expect(
        screen.getByRole('listbox'),
      ).toBeVisible()
    })

    await userEvent.type(input, 'маг')
    await userEvent.click(
      screen.getByRole('option', {
        name: /Волшебник/,
      }),
    )

    await expect(input).toHaveValue(
      'Волшебник',
    )
    await waitFor(() => {
      expect(
        screen.queryByRole('listbox'),
      ).not.toBeInTheDocument()
    })
  },
}

export const ControlledRetainedSelection: Story = {
  name: 'Управляемый выбор сохраняется во время поиска',
  render: () => <RetainedSelectionExample />,
  play: async ({ canvas, canvasElement }) => {
    controlledSubmitAttempt.mockClear()
    const input = canvas.getByRole('combobox')
    const hiddenInput = canvasElement.querySelector('input[type="hidden"][name="classId"]')
    const form = canvasElement.querySelector('form')!

    await userEvent.click(input)
    await userEvent.type(input, 'бер')
    await expect(input).toHaveValue('бер')
    await expect(canvas.getByTestId('search-query')).toHaveTextContent('бер')
    await expect(canvas.getByTestId('confirmed-value')).toHaveTextContent('wizard')
    await expect(hiddenInput).toHaveValue('wizard')
    await expect(screen.getAllByRole('option')).toHaveLength(1)
    await expect(screen.getByRole('option', { name: /Варвар/ })).toBeVisible()
    await expect(input).toBeInvalid()
    form.requestSubmit()
    await expect(controlledSubmitAttempt).not.toHaveBeenCalled()

    await userEvent.keyboard('{Enter}')
    await expect(input).toHaveValue('Варвар')
    await expect(input).toBeValid()
    await expect(hiddenInput).toHaveValue('barbarian')
    await expect(canvas.getByTestId('search-query')).toBeEmptyDOMElement()

    await userEvent.click(input)
    await userEvent.type(input, 'бард')
    await expect(input).toHaveValue('бард')
    await expect(screen.getAllByRole('option')).toHaveLength(1)
    await expect(input).toBeInvalid()
    await userEvent.keyboard('{Escape}')
    await expect(input).toHaveValue('Варвар')
    await expect(input).toBeValid()
    await expect(hiddenInput).toHaveValue('barbarian')
    await expect(canvas.getByTestId('search-query')).toBeEmptyDOMElement()

    await userEvent.click(input)
    await userEvent.type(input, 'бард')
    // Обновление извне без blur должно также сбросить локальный фильтр.
    canvas.getByRole('button', { name: 'Выбрать жреца извне' }).click()
    await waitFor(() => { expect(input).toHaveValue('Жрец') })
    await expect(input).toBeValid()
    await expect(hiddenInput).toHaveValue('cleric')
    await expect(screen.getAllByRole('option')).toHaveLength(options.length)
    await userEvent.keyboard('{Escape}')
  },
}

export const KeyboardNavigation: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByRole('combobox')

    await userEvent.click(input)
    await userEvent.keyboard(
      '{ArrowDown}{Enter}',
    )

    await expect(input).toHaveValue('Бард')
  },
}

export const ScrollableList: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByRole('combobox')

    await userEvent.click(input)
    await waitFor(() => {
      expect(
        screen.getByRole('listbox'),
      ).toBeVisible()
    })
    await expect(
      await screen.findByRole('slider', {
        name: /Вертикальная прокрутка/,
      }),
    ).toBeInTheDocument()
  },
}
