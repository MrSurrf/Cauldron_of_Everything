import {
  useState,
  type ComponentProps,
} from 'react'
import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import {
  expect,
  userEvent,
  within,
} from 'storybook/test'

import { CharacterNotesEditor } from './CharacterNotesEditor'

function InteractiveEditor(
  props: Omit<
    ComponentProps<typeof CharacterNotesEditor>,
    'onValueChange'
  >,
) {
  const [value, setValue] = useState(props.value)

  return (
    <CharacterNotesEditor
      {...props}
      value={value}
      onValueChange={setValue}
    />
  )
}

const meta = {
  component: CharacterNotesEditor,
  args: {
    accessibleLabel: 'Особенности, умения и заметки',
    onValueChange: () => undefined,
    rows: 8,
    showStructureActions: true,
    value:
      '### Боевой стиль: оборона\nПока вы носите доспехи, **КД увеличивается на 1**.',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(40rem, 100%)' }}>
        <Story />
      </div>
    ),
  ],
  tags: ['ai-generated'],
} satisfies Meta<typeof CharacterNotesEditor>

export default meta

type Story = StoryObj<typeof meta>

export const StructuredNotes: Story = {
  render: (args) => (
    <InteractiveEditor {...args} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const preview = canvas.getByRole('region', {
      name: 'Особенности, умения и заметки',
    })

    await expect(
      canvas.getByText('Боевой стиль: оборона'),
    ).toBeVisible()
    await userEvent.click(preview)
    await expect(
      canvas.getByRole('toolbar', {
        name: 'Действия текстового поля',
      }),
    ).toBeVisible()

    await userEvent.click(
      canvas.getByRole('button', {
        name: 'Разделитель',
      }),
    )
    const editor = canvas.getByRole('textbox', {
      name: 'Особенности, умения и заметки',
    })
    await expect(editor).toHaveValue(
      expect.stringContaining('---'),
    )
  },
}

export const RollsAndStructuredBlocks: Story = {
  args: {
    value: [
      'Проверка атаки: [[roll:2d6 + 1d4 - 2]]',
      '',
      ':::resource[Второе дыхание]{current=0 maximum=2 recovery=short}',
      'Восстановите [[roll:1d10+3]] хитов.',
      ':::',
      '',
      ':::collapsible[Тактика]',
      '- Держаться рядом с защитником',
      '- [ ] Использовать зелье',
      ':::',
    ].join('\n'),
  },
  render: (args) => (
    <InteractiveEditor {...args} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const documentCanvas = within(
      canvasElement.ownerDocument.body,
    )
    const preview = canvas.getByRole('region', {
      name: 'Особенности, умения и заметки',
    })

    await userEvent.click(
      canvas.getByRole('button', {
        name: 'Увеличить текст: Особенности, умения и заметки',
      }),
    )
    await expect(
      preview.style.getPropertyValue('--notes-preview-scale'),
    ).toBe('1.125em')

    await userEvent.click(
      canvas.getByRole('button', {
        name: 'Бросить 2d6 + 1d4 - 2',
      }),
    )
    await expect(
      await documentCanvas.findByRole('tooltip'),
    ).toHaveTextContent(/=/)

    await userEvent.click(
      canvas.getByRole('button', {
        name: 'Увеличить ресурс «Второе дыхание»',
      }),
    )
    await expect(canvas.getByText('1 / 2')).toBeVisible()

    await userEvent.click(canvas.getByText('Тактика'))
    await expect(
      canvas.getByText('Держаться рядом с защитником'),
    ).toBeVisible()
  },
}

export const InvalidRollDoesNotBreakEditor: Story = {
  args: {
    value: 'Неизвестный бросок: [[roll:2d20 + alert(1)]]',
  },
  render: (args) => (
    <InteractiveEditor {...args} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const documentCanvas = within(
      canvasElement.ownerDocument.body,
    )

    await userEvent.click(
      canvas.getByRole('button', {
        name: 'Бросить 2d20 + alert(1)',
      }),
    )
    await expect(
      await documentCanvas.findByRole('tooltip'),
    ).toHaveTextContent('Ошибка:')
    await expect(
      canvas.getByRole('region', {
        name: 'Особенности, умения и заметки',
      }),
    ).toBeVisible()
  },
}
