import type { CharacterSheetDocument, SpellSlotLevel, SpellSlotState } from './characterSheet.types'
import { createEmptySpellcasting, SPELL_SLOT_LEVELS } from './defaults'
import { selectFormulaEvaluation, selectFormulaValue } from './characterSheet.selectors'
import { getSingleClassSpellSlots } from './spellcastingRules'

/** Текущие ячейки: штатная таблица класса либо значения, заданные вручную. */
export function getEffectiveSpellSlots(document: CharacterSheetDocument): Record<SpellSlotLevel, SpellSlotState> {
  const spellcasting = document.spellcasting ?? createEmptySpellcasting()
  const level = selectFormulaValue(selectFormulaEvaluation(document), 'LEVEL')
  const className = spellcasting.className.trim() || document.identity.className.trim()
  const subclass = document.identity.subclass.trim()
  const progression = level === null ? null : (
    (subclass && getSingleClassSpellSlots(`${className} (${subclass})`, level, document.rulesetId))
    || getSingleClassSpellSlots(className, level, document.rulesetId)
  )

  return Object.fromEntries(SPELL_SLOT_LEVELS.map((slotLevel) => {
    const stored = spellcasting.slots[slotLevel] ?? { maximum: 0, used: 0 }
    const maximum = spellcasting.slotMode === 'automatic' && progression
      ? progression.slotsByLevel[slotLevel] ?? 0
      : stored.maximum
    return [slotLevel, {
      maximum,
      used: Math.min(maximum, Math.max(0, stored.used)),
    }]
  })) as Record<SpellSlotLevel, SpellSlotState>
}
