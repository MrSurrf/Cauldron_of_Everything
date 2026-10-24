import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  expect,
  fn,
  userEvent,
} from 'storybook/test'

import { CharacterPortrait } from './CharacterPortrait'

const meta = {
  component: CharacterPortrait,
  decorators: [
    (Story) => (
      <div
        style={{
          width: '12rem',
          padding: 'var(--space-4)',
          background: 'var(--color-canvas-background)',
        }}
      >
        <Story />
      </div>
    ),
  ],
  args: {
    characterName: 'Астрид',
    onFileSelect: fn(),
    onRemove: fn(),
    portraitUrl: null,
  },
} satisfies Meta<typeof CharacterPortrait>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  play: async ({ args, canvas }) => {
    await expect(
      canvas.getByTestId('character-portrait-placeholder'),
    ).toBeVisible()

    const file = new File(
      ['character portrait'],
      'astrid.png',
      { type: 'image/png' },
    )
    await userEvent.upload(
      canvas.getByLabelText('Выбрать изображение персонажа'),
      file,
    )

    await expect(args.onFileSelect).toHaveBeenCalledWith(file)
    await expect(
      canvas.getByRole('img', {
        name: 'Портрет персонажа Астрид',
      }),
    ).toBeVisible()

    const replacement = new File(
      ['replacement portrait'],
      'astrid-new.webp',
      { type: 'image/webp' },
    )
    await userEvent.upload(
      canvas.getByLabelText('Выбрать изображение персонажа'),
      replacement,
    )
    await expect(args.onFileSelect).toHaveBeenLastCalledWith(
      replacement,
    )

    await userEvent.click(
      canvas.getByRole('button', {
        name: 'Удалить изображение персонажа',
      }),
    )
    await expect(args.onRemove).toHaveBeenCalledOnce()
    await expect(
      canvas.getByTestId('character-portrait-placeholder'),
    ).toBeVisible()
  },
}

export const SavedImage: Story = {
  args: {
    portraitUrl: '/favicon.svg',
  },
}
