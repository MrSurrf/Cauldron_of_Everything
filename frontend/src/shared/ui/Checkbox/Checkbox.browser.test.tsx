import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { userEvent } from 'vitest/browser'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import '../../../app/styles/global.css'
import '../../styles/tokens.css'
import { Checkbox } from './Checkbox'

let host: HTMLDivElement
let root: Root | undefined

function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

async function mount(node: ReactNode) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)

  await act(async () => {
    root!.render(node)
    await nextFrame()
  })
}

beforeEach(() => {
  ;(
    globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT: boolean
    }
  ).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(async () => {
  await act(async () => root?.unmount())
  host?.remove()
  root = undefined
})

describe('Checkbox design-system primitive', () => {
  it('переключается одним нажатием и использует общий маркер', async () => {
    const onCheckedChange = vi.fn()
    await mount(
      <Checkbox
        label="Экипировано"
        onCheckedChange={onCheckedChange}
      />,
    )
    const input = host.querySelector<HTMLInputElement>('input')!
    const marker = host.querySelector<HTMLElement>('[data-selection-marker]')!

    expect(input).not.toBeChecked()
    expect(marker.dataset.state).toBe('unchecked')

    await act(async () => {
      await userEvent.click(input.closest('label')!)
      await nextFrame()
    })

    expect(input).toBeChecked()
    expect(marker.dataset.state).toBe('checked')
    expect(onCheckedChange).toHaveBeenCalledTimes(1)
    expect(getComputedStyle(marker, '::before').borderRadius).not.toBe('0px')
  })

  it('сохраняет нативное управление с клавиатуры', async () => {
    const onCheckedChange = vi.fn()
    await mount(
      <Checkbox
        label="Учитывать бонус"
        onCheckedChange={onCheckedChange}
      />,
    )
    const input = host.querySelector<HTMLInputElement>('input')!

    input.focus()
    await act(async () => {
      await userEvent.keyboard(' ')
      await nextFrame()
    })

    expect(input).toBeChecked()
    expect(onCheckedChange).toHaveBeenCalledTimes(1)
  })

  it('сохраняет удобную область нажатия без видимой подписи', async () => {
    await mount(<Checkbox aria-label="Компактный выбор" />)
    const control = host.querySelector<HTMLElement>('[data-checkbox-root]')!
    const marker = host.querySelector<HTMLElement>('[data-selection-marker]')!

    expect(control.getBoundingClientRect().width).toBeGreaterThanOrEqual(16)
    expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(16)
    expect(marker.getBoundingClientRect().width).toBe(8)
    expect(marker.getBoundingClientRect().height).toBe(8)
  })

  it('заменяет круглый маркер пользовательской интерактивной иконкой', async () => {
    await mount(
      <Checkbox
        aria-label="Иконка состояния"
        indicator={<span data-testid="custom-indicator">I</span>}
      />,
    )
    const input = host.querySelector<HTMLInputElement>('input')!
    const control = host.querySelector<HTMLElement>('[data-checkbox-root]')!
    const indicator = host.querySelector<HTMLElement>('[data-checkbox-indicator]')!

    expect(host.querySelector('[data-selection-marker]')).toBeNull()
    expect(indicator.querySelector('[data-testid="custom-indicator"]')).not.toBeNull()
    expect(control.dataset.indicator).toBe('custom')

    await act(async () => {
      await userEvent.click(control)
      await nextFrame()
    })

    expect(input).toBeChecked()
    expect(control.dataset.state).toBe('checked')

    input.focus()
    await act(async () => {
      await userEvent.keyboard(' ')
      await nextFrame()
    })

    expect(input).not.toBeChecked()
    expect(control.dataset.state).toBe('unchecked')
  })

  it('отображает mixed и не меняет disabled-состояние', async () => {
    const onCheckedChange = vi.fn()
    await mount(
      <Checkbox
        disabled
        indeterminate
        label="Недоступный частичный выбор"
        onCheckedChange={onCheckedChange}
      />,
    )
    const input = host.querySelector<HTMLInputElement>('input')!
    const marker = host.querySelector<HTMLElement>('[data-selection-marker]')!

    expect(input.indeterminate).toBe(true)
    expect(input).toHaveAttribute('aria-checked', 'mixed')
    expect(marker.dataset.state).toBe('mixed')

    await act(async () => {
      input.click()
      await nextFrame()
    })

    expect(input).not.toBeChecked()
    expect(onCheckedChange).not.toHaveBeenCalled()
  })

  it('синхронизирует видимый маркер после сброса формы', async () => {
    await mount(
      <form>
        <Checkbox label="Сохранять результат" />
        <button type="reset">Сбросить</button>
      </form>,
    )
    const input = host.querySelector<HTMLInputElement>('input')!
    const marker = host.querySelector<HTMLElement>('[data-selection-marker]')!

    await act(async () => {
      await userEvent.click(input.closest('label')!)
      await nextFrame()
    })
    expect(input).toBeChecked()
    expect(marker.dataset.state).toBe('checked')

    await act(async () => {
      await userEvent.click(host.querySelector('button')!)
      await nextFrame()
    })

    expect(input).not.toBeChecked()
    expect(marker.dataset.state).toBe('unchecked')
  })
})
