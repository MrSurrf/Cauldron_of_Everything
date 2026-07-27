import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import { useState } from 'react'

import { Button } from '../Button'
import { PlaceholderIcon } from '../icons/PlaceholderIcon'
import { FormField } from './FormField'
import type { FormFieldInputProps } from './FormField.types'

const longText = Array.from(
  { length: 14 },
  (_, index) =>
    `Строка ${index + 1}: пример длинной записи.`,
).join('\n')

const storyGridStyle = {
  display: 'grid',
  gap: 'var(--space-4)',
}

const meta = {
  component: FormField,
  args: {
    label: 'Имя персонажа',
    placeholder: 'Введите имя...',
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
} satisfies Meta<FormFieldInputProps>

export default meta

type Story = StoryObj<FormFieldInputProps>

function ValidationExample() {
  const [error, setError] = useState<
    string | undefined
  >()
  const [validationKey, setValidationKey] =
    useState(0)

  return (
    <div style={storyGridStyle}>
      <FormField
        error={error}
        label="Имя персонажа"
        validationKey={validationKey}
      />
      <Button
        type="button"
        onClick={() => {
          setError('Введите имя персонажа.')
          setValidationKey(
            (current) => current + 1,
          )
        }}
      >
        Проверить
      </Button>
    </div>
  )
}

export const Default: Story = {}

export const States: Story = {
  render: () => (
    <div style={storyGridStyle}>
      <FormField
        defaultValue="Лира"
        label="Заполненное поле"
      />
      <FormField
        hint="Так имя увидят другие игроки."
        label="Обязательное поле"
        required={true}
      />
      <FormField
        icon={<PlaceholderIcon />}
        label="Поиск"
        placeholder="Найти материал..."
        type="search"
      />
      <FormField
        defaultValue="Уже занято"
        error="Это имя уже используется."
        label="Поле с ошибкой"
      />
      <FormField
        disabled={true}
        label="Недоступное поле"
      />
      <FormField
        defaultValue="Значение нельзя изменить"
        label="Только для чтения"
        readOnly={true}
      />
    </div>
  ),
}

export const Validation: Story = {
  render: () => <ValidationExample />,
}

export const CharacterLimit: Story = {
  render: () => (
    <div style={storyGridStyle}>
      <FormField
        defaultValue="Лира"
        label="Имя игрока"
        maxLength={24}
        showCharacterCount={true}
      />
      <FormField
        as="textarea"
        defaultValue={'Первая строка\nВторая строка'}
        label="Краткая история"
        maxLength={160}
        rows={4}
        showCharacterCount={true}
      />
    </div>
  ),
}

export const Multiline: Story = {
  render: () => (
    <FormField
      as="textarea"
      label="История персонажа"
      placeholder="Расскажите о прошлом..."
      rows={5}
    />
  ),
}

export const MultilineWithOverflow: Story = {
  render: () => (
    <FormField
      as="textarea"
      defaultValue={longText}
      label="Большая заметка"
      maxLength={800}
      rows={4}
      showCharacterCount={true}
    />
  ),
}
