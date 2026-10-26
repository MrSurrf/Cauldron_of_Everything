import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  expect,
  fn,
  screen,
  userEvent,
  within,
} from 'storybook/test'

import { CharacterPortrait } from './CharacterPortrait'
import { createTestImageFile } from '../../../../shared/testing/imageFile'

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

    const file = await createTestImageFile('astrid.png')
    await userEvent.upload(
      canvas.getByLabelText('Выбрать изображение персонажа'),
      file,
    )

    const dialog = await screen.findByRole('dialog')
    await expect(await within(dialog).findByRole('group', { name: /Рамка кадрирования/ })).toBeVisible()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Применить' }))
    await expect(args.onFileSelect).toHaveBeenCalledWith(expect.objectContaining({ name: expect.stringMatching(/^astrid-cropped\.(webp|png)$/) }))
    await expect(
      canvas.getByRole('img', {
        name: 'Портрет персонажа Астрид',
      }),
    ).toBeVisible()

    const replacement = await createTestImageFile('astrid-new.png')
    await userEvent.upload(
      canvas.getByLabelText('Выбрать изображение персонажа'),
      replacement,
    )
    const replacementDialog = await screen.findByRole('dialog')
    await expect(await within(replacementDialog).findByRole('group', { name: /Рамка кадрирования/ })).toBeVisible()
    await userEvent.click(within(replacementDialog).getByRole('button', { name: 'Применить' }))
    await expect(args.onFileSelect).toHaveBeenLastCalledWith(expect.objectContaining({ name: expect.stringMatching(/^astrid-new-cropped\.(webp|png)$/) }))

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
