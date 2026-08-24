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
  within,
} from 'storybook/test'

import {
  createEmptyCharacterSheet,
  createMockCharacterSheet,
} from './model'
import { CharacterSheetTool } from './CharacterSheetTool'

const meta = {
  component: CharacterSheetTool,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          minHeight: '42rem',
          padding: 'var(--space-2)',
          background: 'var(--color-canvas-background)',
        }}
      >
        <Story />
      </div>
    ),
  ],
  args: {
    onDocumentChange: fn(),
  },
} satisfies Meta<typeof CharacterSheetTool>

export default meta
type Story = StoryObj<typeof meta>

function ControlledCharacterSheetStory() {
  const [document, setDocument] = useState(() =>
    createEmptyCharacterSheet({
      id: 'storybook-controlled-character',
    }),
  )

  return (
    <CharacterSheetTool
      document={document}
      onDocumentChange={setDocument}
    />
  )
}

export const FullCharacterSheet: Story = {
  args: {
    initialDocument: createMockCharacterSheet(),
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', {
        name: 'Лист персонажа',
      }),
    ).toBeVisible()
    await expect(
      canvas.getByDisplayValue('Брендон Вейл'),
    ).toBeVisible()
    await expect(
      canvas.getByRole('button', {
        name: 'Открыть настройки листа',
      }),
    ).toBeVisible()
    const featureNotes = canvas.getByRole('region', {
      name: 'Особенности, умения и заметки',
    })
    await expect(featureNotes.textContent).toContain(
      'Второе дыхание',
    )
    await expect(featureNotes.textContent).toContain(
      'Боевой стиль: оборона',
    )
    await expect(featureNotes.textContent).toContain(
      'Заметки кампании',
    )
    await expect(featureNotes.textContent).toContain(
      'Всплеск действий',
    )

    await userEvent.click(
      canvas.getByRole('button', {
        name: 'Открыть настройки листа',
      }),
    )
    const settingsDialog = await screen.findByRole(
      'dialog',
      {
        name: 'Дополнительные настройки',
      },
    )
    await waitFor(() => {
      expect(settingsDialog).toBeVisible()
    })
    const headingSize = within(
      settingsDialog,
    ).getByRole('radiogroup', {
      name: 'Размер заголовков',
    })
    await expect(
      within(headingSize).getByRole('radio', {
        name: 'Средний',
      }),
    ).toBeChecked()
    await userEvent.keyboard('{Escape}')

    const strengthCard = canvas.getByRole('article', {
      name: 'Сила',
    })
    const strength = within(strengthCard)
    const scoreInput = strength.getByRole('textbox', {
      name: 'Сила: значение',
    })

    await userEvent.clear(scoreInput)
    await userEvent.type(scoreInput, '18')
    await expect(strength.getByText('+4')).toBeVisible()
  },
}

export const EmptyCharacterSheet: Story = {
  args: {
    initialDocument: createEmptyCharacterSheet({
      id: 'storybook-empty-character',
    }),
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('textbox', {
        name: 'Имя персонажа',
      }),
    ).toHaveValue('')
    await expect(
      canvas.getByRole('region', {
        name: 'Особенности, умения и заметки',
      }),
    ).toHaveTextContent('Особенности персонажа, способности и заметки...')
  },
}

export const PortraitWorkflow: Story = {
  args: {
    initialDocument: createMockCharacterSheet(),
    onPortraitFileSelect: fn(),
    onPortraitRemove: fn(),
  },
  play: async ({ args, canvas }) => {
    const file = new File(
      ['portrait'],
      'brendon.png',
      { type: 'image/png' },
    )

    await userEvent.upload(
      canvas.getByLabelText('Выбрать изображение персонажа'),
      file,
    )
    await expect(args.onPortraitFileSelect).toHaveBeenCalledWith(
      file,
      'character-brendon',
    )

    await userEvent.click(
      canvas.getByRole('button', {
        name: 'Удалить изображение персонажа',
      }),
    )
    await expect(args.onPortraitRemove).toHaveBeenCalledWith(
      'character-brendon',
    )
  },
}

export const ReferenceDesktopLayout: Story = {
  args: {
    initialDocument: createMockCharacterSheet(),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '61rem',
          height: '72rem',
          margin: '0 auto',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const TwoColumnWorkspace: Story = {
  args: {
    initialDocument: createMockCharacterSheet(),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '55rem',
          height: '100vh',
          minHeight: '42rem',
          margin: '0 auto',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const NarrowWorkspace: Story = {
  args: {
    initialDocument: createMockCharacterSheet(),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '25rem',
          height: '100vh',
          minHeight: '42rem',
          margin: '0 auto',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const MinimumWorkspace: Story = {
  args: {
    initialDocument: createMockCharacterSheet(),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '18rem',
          height: '100vh',
          minHeight: '42rem',
          margin: '0 auto',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const ControlledDocument: Story = {
  render: () => <ControlledCharacterSheetStory />,
  play: async ({ canvas }) => {
    const preview = canvas.getByRole('region', {
      name: 'Особенности, умения и заметки',
    })

    await userEvent.click(preview)
    const notes = canvas.getByRole('textbox', {
      name: 'Особенности, умения и заметки',
    })
    const notesActions = canvas.getByRole('toolbar', {
      name: 'Действия текстового поля',
    })
    await userEvent.click(
      within(notesActions).getByRole('button', {
        name: 'Ресурс',
      }),
    )

    await expect(notes).toHaveValue(
      expect.stringContaining(':::resource['),
    )
  },
}
