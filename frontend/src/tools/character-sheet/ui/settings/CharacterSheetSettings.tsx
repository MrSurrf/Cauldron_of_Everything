import { Button } from '../../../../shared/ui'
import {
  SheetAppearanceSettings,
  type SheetAppearanceValue,
} from './SheetAppearanceSettings'
import styles from './CharacterSheetSettings.module.css'

export type CharacterSheetSettingsProps = {
  appearance: SheetAppearanceValue
  onAppearanceChange: (value: SheetAppearanceValue) => void
  onResetAppearance: () => void
}

export function CharacterSheetSettings({
  appearance,
  onAppearanceChange,
  onResetAppearance,
}: CharacterSheetSettingsProps) {
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h2>Настройки листа</h2>
        <p>
          Параметры применяются только к этому листу.
        </p>
      </header>

      <SheetAppearanceSettings
        value={appearance}
        onValueChange={onAppearanceChange}
      />

      <Button
        icon={null}
        size="sm"
        variant="secondary"
        onClick={onResetAppearance}
      >
        Сбросить внешний вид
      </Button>
    </div>
  )
}
