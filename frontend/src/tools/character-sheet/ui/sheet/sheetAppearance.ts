import type { CSSProperties } from 'react'

import type { SheetAppearance } from '../../model'
import type { SheetAppearanceValue } from '../settings'

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

export function getAppearanceValue(
  appearance: SheetAppearance,
): SheetAppearanceValue {
  const getBodySize = (value: number) => {
    if (value <= 12) return 'small' as const
    if (value >= 16) return 'large' as const
    return 'medium' as const
  }
  const getHeadingSize = (value: number) => {
    if (value <= 14) return 'small' as const
    if (value >= 20) return 'large' as const
    return 'medium' as const
  }

  return {
    bodySize: getBodySize(appearance.bodyFontSize),
    density: appearance.density,
    fontFamily:
      appearance.font === 'serif'
        ? 'gothic'
        : appearance.font === 'sans'
          ? 'system'
          : 'gilroy',
    headingSize: getHeadingSize(
      appearance.headingFontSize,
    ),
  }
}

export function appearancePatch(
  value: SheetAppearanceValue,
): SheetAppearance {
  const sizeMap = {
    small: 12,
    medium: 14,
    large: 16,
  } as const
  const headingSizeMap = {
    small: 14,
    medium: 16,
    large: 20,
  } as const

  return {
    bodyFontSize: sizeMap[value.bodySize],
    density: value.density,
    font:
      value.fontFamily === 'gothic'
        ? 'serif'
        : value.fontFamily === 'system'
          ? 'sans'
          : 'cauldron',
    headingFontSize: headingSizeMap[value.headingSize],
  }
}

export function getSheetStyle(
  appearance: SheetAppearance,
): CharacterSheetStyle {
  const density = {
    compact: {
      control: 'var(--control-height-sm)',
      gap: 'var(--space-2)',
      padding: 'var(--space-2)',
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
