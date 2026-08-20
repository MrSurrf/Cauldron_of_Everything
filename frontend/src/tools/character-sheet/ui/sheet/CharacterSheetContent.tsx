import {
  Panel,
  ScrollArea,
} from '../../../../shared/ui'
import { characterSheetActions } from '../../model'
import { CharacterSheetToolbar } from '../toolbar'
import styles from '../../CharacterSheetTool.module.css'
import { CharacterIdentitySection } from './CharacterIdentitySection'
import { CharacterSheetChecksColumn } from './CharacterSheetChecksColumn'
import { CharacterSheetCenterColumn } from './CharacterSheetCenterColumn'
import { CharacterSheetInventoryRegion } from './CharacterSheetInventoryRegion'
import { CharacterSheetLeftColumn } from './CharacterSheetLeftColumn'
import { CharacterSheetRightColumn } from './CharacterSheetRightColumn'
import { CharacterSheetStatsStrip } from './CharacterSheetStatsStrip'
import { ProficienciesEditor } from './ProficienciesEditor'
import {
  appearancePatch,
  getAppearanceValue,
  getSheetStyle,
} from './sheetAppearance'
import { useCharacterSheetViewModel } from './sheetViewModel'

export type CharacterSheetContentProps = {
  className?: string
  onPortraitFileSelect?: (
    file: File,
    characterId: string,
  ) => void
  onPortraitRemove?: (characterId: string) => void
}

export function CharacterSheetContent({
  className,
  onPortraitFileSelect,
  onPortraitRemove,
}: CharacterSheetContentProps) {
  const sheet = useCharacterSheetViewModel()
  const { dispatch, document } = sheet
  const rootClassName = [styles.root, className]
    .filter(Boolean)
    .join(' ')
  const appearance = getAppearanceValue(
    document.appearance,
  )

  return (
    <div
      className={rootClassName}
      data-density={document.appearance.density}
      style={getSheetStyle(document.appearance)}
    >
      <Panel
        className={styles.panel}
        padding="none"
      >
        <div className={styles.shell}>
          <CharacterSheetToolbar
            appearance={appearance}
            onAppearanceChange={(nextAppearance) => {
              dispatch(
                characterSheetActions.patchAppearance(
                  appearancePatch(nextAppearance),
                ),
              )
            }}
            onResetAppearance={() => {
              dispatch(
                characterSheetActions.patchAppearance({
                  bodyFontSize: 14,
                  density: 'compact',
                  font: 'cauldron',
                  headingFontSize: 16,
                }),
              )
            }}
          />

          <ScrollArea
            aria-label="Лист персонажа"
            className={styles.viewport}
            contentClassName={styles.document}
            orientation="vertical"
            rootClassName={styles.scrollArea}
          >
            <CharacterIdentitySection
              sheet={sheet}
              onPortraitFileSelect={onPortraitFileSelect}
              onPortraitRemove={onPortraitRemove}
            />
            <div className={styles.bodyGrid}>
              <div className={styles.leftRegion}>
                <CharacterSheetLeftColumn sheet={sheet} />

                <div className={styles.checksRegion}>
                  <CharacterSheetStatsStrip
                    group="support"
                    sheet={sheet}
                  />
                  <CharacterSheetChecksColumn sheet={sheet} />
                  <ProficienciesEditor />
                </div>
              </div>

              <div className={styles.centerRegion}>
                <CharacterSheetStatsStrip
                  group="combat"
                  sheet={sheet}
                />
                <CharacterSheetCenterColumn sheet={sheet} />
                <CharacterSheetInventoryRegion sheet={sheet} />
              </div>

              <CharacterSheetRightColumn sheet={sheet} />
            </div>
          </ScrollArea>
        </div>
      </Panel>
    </div>
  )
}
