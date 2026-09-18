export const VISION_TYPES = [
  'normal',
  'darkvision',
  'blindsight',
  'tremorsense',
  'truesight',
] as const

export type VisionType = (typeof VISION_TYPES)[number]

export type VisionSense = {
  type: VisionType
  range?: number
}

export const visionTypeLabels: Readonly<Record<VisionType, string>> = {
  normal: 'Обычное зрение',
  darkvision: 'Тёмное зрение',
  blindsight: 'Слепое зрение',
  tremorsense: 'Вибрационное чувство',
  truesight: 'Истинное зрение',
}

export function formatVisionSense(sense: VisionSense) {
  const label = visionTypeLabels[sense.type]
  return sense.range == null ? label : `${label} ${sense.range} фт.`
}
