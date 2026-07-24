import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { zeroSessionSurvey } from '../surveys/zeroSessionSurvey'
import SurveyPage from './SurveyPage'

const meta = {
  component: SurveyPage,
  tags: ['ai-generated'],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    playerName: 'Анна',
    characterName: 'Лиара',
    config: zeroSessionSurvey,
    onComplete: fn(),
  },
} satisfies Meta<typeof SurveyPage>

export default meta

type Story = StoryObj<typeof meta>

export const FirstQuestion: Story = {}

export const SelectsAnswer: Story = {
  play: async ({ canvas, userEvent }) => {
    const scaleOption = canvas
      .getAllByRole('button')
      .find(
        (button) =>
          button.getAttribute('data-value') === '3',
      )

    const navigationButtons = canvas
      .getAllByRole('button')
      .filter((button) =>
        button.classList.contains(
          'survey-navigation__button',
        ),
      )

    const nextButton = navigationButtons[1]

    if (!scaleOption || !nextButton) {
      throw new Error(
        'Не найдены элементы управления опросом',
      )
    }

    await expect(nextButton).toBeDisabled()
    await userEvent.click(scaleOption)
    await expect(scaleOption).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(nextButton).toBeEnabled()
    await userEvent.click(nextButton)
    await expect(
      canvas.getByText('2 / 11'),
    ).toBeVisible()
  },
}
