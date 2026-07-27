import type { AriaAttributes } from 'react'

export function isAriaInvalid(
  value: AriaAttributes['aria-invalid'],
): boolean {
  return (
    value === true ||
    value === 'true' ||
    value === 'grammar' ||
    value === 'spelling'
  )
}

export function mergeAriaIds(
  ...values: Array<string | undefined>
): string | undefined {
  const ids = new Set(
    values
      .flatMap((value) =>
        value?.split(/\s+/) ?? [],
      )
      .filter(Boolean),
  )

  return ids.size > 0
    ? Array.from(ids).join(' ')
    : undefined
}
