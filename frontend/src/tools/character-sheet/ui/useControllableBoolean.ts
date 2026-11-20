import { useState } from 'react'

export type ControllableBooleanOptions = {
  defaultValue?: boolean
  onChange?: (value: boolean) => void
  value?: boolean
}

export function useControllableBoolean({
  defaultValue = false,
  onChange,
  value,
}: ControllableBooleanOptions) {
  const [internalValue, setInternalValue] =
    useState(defaultValue)
  const controlled = value !== undefined
  const currentValue = controlled
    ? value
    : internalValue

  function setValue(nextValue: boolean) {
    if (!controlled) {
      setInternalValue(nextValue)
    }

    onChange?.(nextValue)
  }

  return [currentValue, setValue] as const
}
