import {
  createClientId,
  currencyFormulaVariable,
  type CurrencyKey,
} from '../../model'
import { CurrencyBlock } from '../CurrencyBlock'
import { EquipmentSection } from '../EquipmentSection'
import styles from '../../CharacterSheetTool.module.css'
import {
  currencyLabels,
  mockItemNames,
} from './sheet.constants'
import type { CharacterSheetViewModel } from './sheetViewModel'

export type CharacterSheetInventoryRegionProps = {
  sheet: CharacterSheetViewModel
}

export function CharacterSheetInventoryRegion({
  sheet,
}: CharacterSheetInventoryRegionProps) {
  const {
    dispatch,
    document,
    isSectionOpen,
    resultFor,
    setSectionOpen,
    updateNumericField,
  } = sheet

  return (
    <div className={styles.inventoryRegion}>
      <CurrencyBlock
        fields={(Object.keys(currencyLabels) as CurrencyKey[])
          .map((currency) => ({
            id: currency,
            label: currencyLabels[currency],
            result: resultFor(
              currencyFormulaVariable(currency),
            ),
            value: document.currency[currency],
          }))}
        onFieldChange={(id, value) => {
          updateNumericField(
            {
              currency: id as CurrencyKey,
              kind: 'currency',
            },
            value,
          )
        }}
      />

      <EquipmentSection
        entries={document.inventory.map((entry) => ({
          attuned: entry.attuned,
          equipped: entry.equipped,
          id: entry.id,
          itemId:
            entry.definition.kind === 'encyclopedia'
              ? entry.definition.itemId
              : undefined,
          name:
            entry.definition.kind === 'custom'
              ? entry.definition.name
              : mockItemNames[entry.definition.itemId] ??
                entry.definition.itemId,
          notes: entry.notes,
          quantity: entry.quantity,
        }))}
        open={isSectionOpen('equipment')}
        onAdd={() => {
          dispatch({
            type: 'inventory/add',
            value: {
              attuned: false,
              definition: {
                kind: 'custom',
                name: `Новый предмет ${document.inventory.length + 1}`,
              },
              equipped: false,
              id: createClientId('inventory'),
              notes: '',
              overrides: {},
              quantity: 1,
            },
          })
        }}
        onEntryChange={(id, patch) => {
          const entry = document.inventory.find(
            (item) => item.id === id,
          )
          if (!entry) return
          const { name, ...instancePatch } = patch
          dispatch({
            type: 'inventory/update',
            id,
            patch: {
              ...instancePatch,
              definition:
                name !== undefined &&
                entry.definition.kind === 'custom'
                  ? {
                      ...entry.definition,
                      name,
                    }
                  : entry.definition,
            },
          })
        }}
        onEntryRemove={(id) => {
          dispatch({ type: 'inventory/remove', id })
        }}
        onOpenChange={(open) => {
          setSectionOpen('equipment', open)
        }}
      />
    </div>
  )
}
