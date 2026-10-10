import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { userEvent } from 'vitest/browser'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import '../../../../app/styles/global.css'
import '../../../../shared/styles/tokens.css'
import { NumericEditor, type NumericEditorProps } from './NumericEditor'

type HarnessProps = Pick<NumericEditorProps, 'min' | 'max'> & {
  initialValue?: number | null
}

let mounted: { container: HTMLDivElement; root: Root } | null = null

function Harness({ initialValue = 18, min, max }: HarnessProps) {
  const [value, setValue] = useState(initialValue)

  return (
    <div style={{ width: '12rem' }}>
      <NumericEditor
        aria-label="Числовое значение"
        min={min}
        max={max}
        value={value}
        onValueChange={setValue}
      />
      <output data-saved-value>{value === null ? 'null' : value}</output>
      <button type="button" onClick={() => setValue(7)}>Внешнее значение</button>
      <button type="button" onClick={() => setValue(null)}>Внешняя очистка</button>
    </div>
  )
}

async function mountEditor(props: HarnessProps = {}) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  mounted = { container, root }

  await act(async () => root.render(<Harness {...props} />))

  return {
    container,
    input: container.querySelector<HTMLInputElement>('input')!,
    saved: container.querySelector<HTMLOutputElement>('[data-saved-value]')!,
  }
}

async function fillValue(input: HTMLInputElement, value: string) {
  await act(async () => userEvent.fill(input, value))
}

beforeEach(() => {
  ;(globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean
  }).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(async () => {
  if (mounted) {
    await act(async () => mounted?.root.unmount())
    mounted.container.remove()
    mounted = null
  }
})

describe('NumericEditor', () => {
  it('отклоняет буквы с клавиатуры и вставку смешанного текста целиком', async () => {
    const { input, saved } = await mountEditor()

    await act(async () => userEvent.type(input, 'abcЖ'))
    expect(input.value).toBe('18')
    expect(saved.textContent).toBe('18')

    await act(async () => {
      // Событие ввода после вставки: обход React-трекера воспроизводит изменение DOM браузером.
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(input, '18abc')
      input.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        inputType: 'insertFromPaste',
        data: '18abc',
      }))
    })
    expect(input.value).toBe('18')
    expect(saved.textContent).toBe('18')

    await act(async () => input.blur())
    expect(input.value).toBe('18')
    expect(saved.textContent).toBe('18')
  })

  it('сохраняет числа сразу, включая минус и десятичную запятую', async () => {
    const { input, saved } = await mountEditor()

    await fillValue(input, '24')
    expect(input.value).toBe('24')
    expect(saved.textContent).toBe('24')
    expect(document.activeElement).toBe(input)

    await fillValue(input, '-3')
    expect(input.value).toBe('-3')
    expect(saved.textContent).toBe('-3')

    await fillValue(input, '-2,5')
    expect(saved.textContent).toBe('-2.5')
    await act(async () => input.blur())
    expect(input.value).toBe('-2.5')
  })

  it.each(['', '-', '+', ','])('нормализует незавершённый ввод «%s» при потере фокуса', async (draft) => {
    const { input, saved } = await mountEditor()

    await fillValue(input, draft)
    expect(input.value).toBe(draft)
    expect(saved.textContent).toBe('18')

    await act(async () => input.blur())
    expect(input.value).toBe('')
    expect(saved.textContent).toBe('null')
  })

  it.each(['blur', 'Enter'])('применяет min/max при подтверждении через %s', async (method) => {
    const { input, saved } = await mountEditor({ initialValue: 3, min: 0, max: 20 })
    const commit = async () => {
      await act(async () => {
        if (method === 'Enter') await userEvent.keyboard('{Enter}')
        else input.blur()
      })
    }

    await fillValue(input, '35')
    expect(saved.textContent).toBe('35')
    await commit()
    expect(input.value).toBe('20')
    expect(saved.textContent).toBe('20')

    await fillValue(input, '-8')
    expect(saved.textContent).toBe('-8')
    await commit()
    expect(input.value).toBe('0')
    expect(saved.textContent).toBe('0')
  })

  it('синхронизирует внешнее значение даже при незавершённом вводе', async () => {
    const { container, input, saved } = await mountEditor()
    const [setExternalValue, clearExternalValue] = container.querySelectorAll('button')

    await fillValue(input, '-')
    expect(input.value).toBe('-')
    await act(async () => setExternalValue.click())
    expect(input.value).toBe('7')
    expect(saved.textContent).toBe('7')

    await act(async () => clearExternalValue.click())
    expect(input.value).toBe('')
    expect(saved.textContent).toBe('null')
  })
})
