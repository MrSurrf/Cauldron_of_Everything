import {
  currencyFormulaVariable,
  type CurrencyKey,
} from '../../model'
import { CurrencyBlock } from '../CurrencyBlock'
import { currencyLabels } from './sheet.constants'
import type { CharacterSheetViewModel } from './sheetViewModel'

export type CharacterCurrencySectionProps = {
  sheet: CharacterSheetViewModel
}

export function CharacterCurrencySection({
  sheet,
}: CharacterCurrencySectionProps) {
  const {
    document,
    resultFor,
    updateNumericField,
  } = sheet

  return (
    <CurrencyBlock
      fields={(Object.keys(currencyLabels) as CurrencyKey[])
        .map((currency) => ({
          id: currency,
          label: currencyLabels[currency],
          result: resultFor(currencyFormulaVariable(currency)),
          value: document.currency[currency],
        }))}
      onFieldChange={(id, value) => {
        updateNumericField(
          { currency: id as CurrencyKey, kind: 'currency' },
          value,
        )
      }}
    />
  )
}
