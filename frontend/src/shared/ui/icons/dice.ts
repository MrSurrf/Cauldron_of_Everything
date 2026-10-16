export const DICE_TYPES = [
  'd4',
  'd6',
  'd8',
  'd10',
  'd12',
  'd20',
] as const

export type DiceType = (typeof DICE_TYPES)[number]

export function getDiceTypeFromExpression(
  expression: string,
): DiceType | null {
  const match = expression.match(
    /(?:^|[^a-z0-9])(?:\d+)?d(4|6|8|10|12|20)(?=$|[^0-9])/i,
  )

  return match
    ? `d${match[1]}`.toLowerCase() as DiceType
    : null
}
