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

import { ContentEditor } from './ContentEditor'
import { emptyResource, resourceToSource } from './resourceContent'

function InteractiveEditor(
  props: Omit<
    ComponentProps<typeof ContentEditor>,
    'onValueChange'
  >,
) {
  const [value, setValue] = useState(props.value)

  return (
    <ContentEditor
      {...props}
      value={value}
      onValueChange={setValue}
    />
  )
}

const meta = {
  title: 'Shared/ContentEditor',
  component: ContentEditor,
  args: {
    renderPreview: true,
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
} satisfies Meta<typeof ContentEditor>

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
    const editor = canvas.getByRole('textbox', {
      name: 'Особенности, умения и заметки',
    })
    await expect(editor).toHaveTextContent(
      'Боевой стиль: оборона',
    )
    await expect(editor).not.toHaveTextContent('###')
    await expect(editor).not.toHaveTextContent('**')
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
      preview.closest<HTMLElement>('[data-content-editor]')!.style.getPropertyValue('--content-editor-scale'),
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
        name: 'Второе дыхание: 0 / 2',
      }),
    )
    await userEvent.click(await documentCanvas.findByRole('button', { name: 'Восстановить' }))
    await userEvent.click(documentCanvas.getByRole('button', { name: 'Закрыть настройки ресурса' }))
    await expect(canvas.getByRole('button', { name: 'Второе дыхание: 2 / 2' })).toBeVisible()

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

export const ResourceWidgets: Story = {
  args: {
    value: [
      resourceToSource(emptyResource),
      resourceToSource({ ...emptyResource, title: 'Ресурс', current: 10, maximum: '10', recovery: 'short' }),
      resourceToSource({ ...emptyResource, title: 'Ресурс 2', current: 10, maximum: '10', recovery: 'long', notes: 'Заметка для примера', showNotes: true }),
    ].join('\n\n'),
  },
  render: args => <InteractiveEditor {...args} />,
}
