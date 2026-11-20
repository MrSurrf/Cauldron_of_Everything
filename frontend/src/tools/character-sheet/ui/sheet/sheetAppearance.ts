import type { CSSProperties } from 'react'

import type { SheetAppearance } from '../../model'

type CharacterSheetStyle = CSSProperties & {
  '--field-font-family': string
  '--field-font-size': string
  '--sheet-body-font': string
  '--sheet-body-size': string
  '--sheet-control-height': string
  '--sheet-gap': string
  '--sheet-heading-font': string
  '--sheet-heading-size': string
  '--sheet-section-padding': string
}

export function getSheetStyle(
  appearance: SheetAppearance,
): CharacterSheetStyle {
  const density = {
    compact: {
      control: 'calc(var(--control-height-sm) - var(--space-1))',
      gap: 'var(--sheet-layout-gap)',
      padding: 'var(--sheet-layout-gap)',
    },
    comfortable: {
      control: 'var(--control-height-md)',
      gap: 'var(--space-3)',
      padding: 'var(--space-3)',
    },
    spacious: {
      control: 'var(--control-height-lg)',
      gap: 'var(--space-4)',
      padding: 'var(--space-4)',
    },
  }[appearance.density]
  const bodyFont = {
    cauldron: 'var(--font-family-body)',
    sans: 'Arial, sans-serif',
    serif: 'Georgia, serif',
  }[appearance.font]

  return {
    '--field-font-family': bodyFont,
    '--field-font-size': `${appearance.bodyFontSize}px`,
    '--sheet-body-font': bodyFont,
    '--sheet-body-size': `${appearance.bodyFontSize}px`,
    '--sheet-control-height': density.control,
    '--sheet-gap': density.gap,
    '--sheet-heading-font':
      appearance.font === 'serif'
        ? 'var(--font-family-heading)'
        : bodyFont,
    '--sheet-heading-size': `${appearance.headingFontSize}px`,
    '--sheet-section-padding': density.padding,
  }
}
