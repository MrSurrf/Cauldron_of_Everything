import {
  Button,
  IconButton,
  Popover,
  Tooltip,
} from '../../../../shared/ui'
import { RestIcon, SettingsIcon } from '../icons'
import {
  CharacterSheetSettings,
  type SheetAppearanceValue,
} from '../settings'
import styles from './CharacterSheetToolbar.module.css'

export type CharacterSheetToolbarProps = {
  appearance: SheetAppearanceValue
  onAppearanceChange: (value: SheetAppearanceValue) => void
  onLongRest?: () => void
  onResetAppearance: () => void
  onShortRest?: () => void
}

export function CharacterSheetToolbar({
  appearance,
  onAppearanceChange,
  onLongRest,
  onResetAppearance,
  onShortRest,
}: CharacterSheetToolbarProps) {
  return (
    <header className={styles.toolbar}>
      <div className={styles.titleGroup}>
        <span className={styles.eyebrow}>
          Инструмент
        </span>
        <h1>Лист персонажа</h1>
      </div>

      <div className={styles.actions}>
        {onShortRest && (
          <Button
            icon={<RestIcon />}
            size="sm"
            variant="secondary"
            onClick={onShortRest}
          >
            Короткий отдых
          </Button>
        )}

        {onLongRest && (
          <Button
            icon={<RestIcon />}
            size="sm"
            variant="secondary"
            onClick={onLongRest}
          >
            Долгий отдых
          </Button>
        )}

        <Popover
          content={(
            <CharacterSheetSettings
              appearance={appearance}
              onAppearanceChange={onAppearanceChange}
              onResetAppearance={onResetAppearance}
            />
          )}
          placement="bottom"
        >
          <Tooltip content="Настройки листа">
            <IconButton
              aria-label="Открыть настройки листа"
              icon={<SettingsIcon />}
              size="sm"
              variant="secondary"
            />
          </Tooltip>
        </Popover>
      </div>
    </header>
  )
}
