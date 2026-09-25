import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent, within } from 'storybook/test'
import { mockTarrasque } from '../model/mockTarrasque'
import { CreatureFeatureSections } from './CreatureFeatureSections'

const meta = {
  component: CreatureFeatureSections,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ padding: 'var(--space-4)', background: 'var(--color-background)' }}><Story /></div>],
  args: {
    entityId: mockTarrasque.id,
    sections: mockTarrasque.sections.filter((section) => section.type !== 'description'),
  },
} satisfies Meta<typeof CreatureFeatureSections>

export default meta
type Story = StoryObj<typeof meta>

export const Tarrasque: Story = {
  play: async ({ canvas }) => {
    const bite = within(canvas.getByRole('article', { name: 'Укус.' }))
    await userEvent.click(bite.getByRole('button', { name: 'Бросить: Укус. — атака, 1d20 +19' }))
    await expect(bite.getByLabelText('Результат: Укус. — атака')).toHaveTextContent(/1d20 \[\d+\] \+ 19 = \d+/)
    const damage = bite.getByRole('button', { name: 'Бросить: Укус. — колющий урон, 4к12 + 10' })
    const dieIcon = damage.querySelector<HTMLElement>('[data-icon="d12"]')!
    const damageIcon = damage.querySelector<HTMLElement>('[data-damage-icon="piercing"]')!
    await expect(dieIcon).toBeInTheDocument()
    expect(damageIcon.getBoundingClientRect().width).toBeGreaterThan(dieIcon.getBoundingClientRect().width * 2)
    expect(getComputedStyle(damage).borderTopStyle).toBe('solid')
    damage.focus()
    await userEvent.keyboard('{Enter}')
    await expect(bite.getByLabelText('Результат: Укус. — колющий урон')).toHaveTextContent(/4d12 \[\d+, \d+, \d+, \d+\] \+ 10 = \d+/)
    await userEvent.keyboard(' ')
    await expect(bite.getByLabelText('Результат: Укус. — атака')).not.toBeEmptyDOMElement()
    const swallow = within(canvas.getByRole('article', { name: 'Поглощение.' }))
    const acidDamage = swallow.getByRole('button', { name: 'Бросить: Поглощение. — кислотный урон, 16к6' })
    await expect(acidDamage.querySelector('[data-icon="d6"]')).toBeInTheDocument()
    await userEvent.click(acidDamage)
    await expect(swallow.getByLabelText('Результат: Поглощение. — кислотный урон')).toHaveTextContent(/16d6 \[[\d, ]+\] = \d+/)
    await expect(swallow.getByText('В начале хода Тараска')).toBeVisible()

    await userEvent.click(canvas.getByRole('button', { name: 'Спасбросок цели: Хвост., Сила, Сл 20' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Спасбросок цели: Хвост.' }))
    const modifier = dialog.getByRole('textbox', { name: 'Модификатор спасброска цели' })
    await userEvent.clear(modifier)
    await userEvent.type(modifier, '100')
    await userEvent.click(dialog.getByRole('button', { name: 'Бросить: Хвост. — спасбросок цели, 1d20 +100' }))
    await expect(dialog.getByLabelText('Результат: Хвост. — спасбросок цели')).toHaveTextContent('Успех')
    await userEvent.clear(modifier)
    await userEvent.type(modifier, '-100')
    await userEvent.click(dialog.getByRole('button', { name: 'Бросить: Хвост. — спасбросок цели, 1d20 -100' }))
    await expect(dialog.getByLabelText('Результат: Хвост. — спасбросок цели')).toHaveTextContent('Неудача')
    await userEvent.clear(modifier)
    await userEvent.type(modifier, '1.5')
    await expect(dialog.queryByRole('button', { name: /^Бросить:/ })).not.toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await expect(canvas.getByRole('button', { name: 'Спасбросок цели: Хвост., Сила, Сл 20' })).toHaveFocus()
    await expect(canvas.queryByText('Использование заклинаний')).not.toBeInTheDocument()
  },
}

export const LairAndRecharge: Story = {
  name: 'Действия логова и перезарядка / Демонстрация',
  args: {
    entityId: 'demo',
    sections: [
      {
        id: 'actions', type: 'actions', title: 'Действия', html: '',
        entries: [{
          id: 'burst', name: 'Всплеск энергии', description: 'Демонстрация действия с областью и перезарядкой.',
          rolls: [{ label: 'Перезарядка 5–6', formula: '1к6', successAt: 5 }],
          save: { ability: 'dexterity', dc: 18 }, damage: [{ formula: '5к8 + 5', type: 'lightning', average: 27 }],
          range: 'Конус 60 фт.', target: 'Все существа в области', effect: 'При успешном спасброске цель получает половину урона.',
        }],
      },
      {
        id: 'lair', type: 'lair-actions', title: 'Действия логова', html: '',
        introduction: 'Пример оформления логова для будущих существ бестиария.',
        entries: [
          { id: 'mist', name: 'Густой туман', description: 'Туман заполняет выбранную область и сильно заслоняет её.' },
          { id: 'doors', name: 'Запертые врата', description: 'Двери логова захлопываются до следующего хода.' },
          { id: 'whispers', name: 'Шёпот стен', description: 'Из стен доносятся голоса, выдающие присутствие незваных гостей.' },
        ],
      },
    ],
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Бросить: Всплеск энергии — Перезарядка 5–6, 1к6' }))
    await expect(canvas.getByLabelText('Результат: Всплеск энергии — Перезарядка 5–6')).toHaveTextContent(/1d6 \[[1-6]\] = [1-6] · (Успех|Неудача)/)
    await expect(canvas.getByRole('region', { name: 'Действия логова' })).toBeVisible()
  },
}
