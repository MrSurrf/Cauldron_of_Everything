import { Panel, ScrollArea } from '../../../../shared/ui'
import { characterSheetActions } from '../../model'
import { CharacterSheetToolbar } from '../toolbar'
import styles from '../../CharacterSheetTool.module.css'
import { CharacterIdentitySection } from './CharacterIdentitySection'
import {
  CharacterSavingThrowsSection,
  CharacterSkillsSection,
} from './CharacterSheetChecksColumn'
import {
  CharacterAttacksSection,
  CharacterDeathSavesSection,
  CharacterHitDiceSection,
  CharacterHitPointsSection,
} from './CharacterSheetCenterColumn'
import {
  CharacterCurrencySection,
  CharacterEquipmentSection,
} from './CharacterSheetInventoryRegion'
import { CharacterSheetLeftColumn } from './CharacterSheetLeftColumn'
import { CharacterFeaturesSection } from './CharacterFeaturesSection'
import { CharacterPersonalitySection } from './CharacterPersonalitySections'
import {
  CharacterSheetStat,
} from './CharacterSheetStatsStrip'
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
  const appearance = getAppearanceValue(document.appearance)

  return (
    <div
      className={rootClassName}
      data-density={document.appearance.density}
      style={getSheetStyle(document.appearance)}
    >
      <Panel className={styles.panel} padding="none">
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
            orientation="both"
            rootClassName={styles.scrollArea}
          >
            <div className={styles.sheetPage}>
              <CharacterIdentitySection
                sheet={sheet}
                onPortraitFileSelect={onPortraitFileSelect}
                onPortraitRemove={onPortraitRemove}
              />

              <div className={styles.bodyGrid}>
                <section
                  aria-label="Основные показатели"
                  className={styles.quickBar}
                >
                  <CharacterSheetStat
                    className={styles.quickStat}
                    compact={true}
                    sheet={sheet}
                    stat="inspiration"
                  />

                  <div className={styles.movementStats}>
                    <CharacterSheetStat
                      className={styles.quickStat}
                      compact={true}
                      presentation="list"
                      sheet={sheet}
                      stat="initiative"
                    />
                    <CharacterSheetStat
                      className={styles.quickStat}
                      compact={true}
                      presentation="list"
                      sheet={sheet}
                      stat="speed"
                    />
                  </div>

                  <CharacterSheetStat
                    className={styles.quickStat}
                    compact={true}
                    sheet={sheet}
                    stat="armorClass"
                  />

                  <div className={styles.hitPointsSlot}>
                    <CharacterHitPointsSection sheet={sheet} />
                  </div>

                  <CharacterSheetStat
                    className={styles.quickStat}
                    compact={true}
                    sheet={sheet}
                    stat="proficiency"
                  />
                </section>

                <div className={styles.idealsSlot}>
                  <CharacterPersonalitySection
                    className={styles.stretchSection}
                    editorClassName={styles.fillNotesEditor}
                    rows={1}
                    section="ideals"
                    sheet={sheet}
                  />
                </div>

                <div className={styles.leftLowerGrid}>
                  <div className={styles.abilityRail}>
                    <CharacterSheetLeftColumn sheet={sheet} />
                    <CharacterSheetStat
                      className={styles.passiveStat}
                      compact={true}
                      sheet={sheet}
                      stat="passivePerception"
                    />
                  </div>

                  <div className={styles.savesSlot}>
                    <CharacterSavingThrowsSection sheet={sheet} />
                  </div>

                  <div className={styles.skillsSlot}>
                    <CharacterSkillsSection sheet={sheet} />
                  </div>

                  <div className={styles.proficienciesSlot}>
                    <ProficienciesEditor />
                  </div>
                </div>

                <div className={styles.centerLowerGrid}>
                  <div className={styles.secondaryVitals}>
                    <div className={styles.hitDiceSlot}>
                      <CharacterHitDiceSection sheet={sheet} />
                    </div>
                    <div className={styles.deathSavesSlot}>
                      <CharacterDeathSavesSection sheet={sheet} />
                    </div>
                  </div>

                  <div className={styles.attacksSlot}>
                    <CharacterAttacksSection sheet={sheet} />
                  </div>

                  <div className={styles.equipmentSlot}>
                    <CharacterEquipmentSection sheet={sheet} />
                  </div>

                  <div className={styles.currencySlot}>
                    <CharacterCurrencySection sheet={sheet} />
                  </div>
                </div>

                <div className={styles.notesLowerGrid}>
                  <div className={styles.minorPersonality}>
                    <CharacterPersonalitySection
                      className={styles.stretchSection}
                      editorClassName={styles.fillNotesEditor}
                      rows={1}
                      section="bonds"
                      sheet={sheet}
                    />
                    <CharacterPersonalitySection
                      className={styles.stretchSection}
                      editorClassName={styles.fillNotesEditor}
                      rows={1}
                      section="flaws"
                      sheet={sheet}
                    />
                  </div>

                  <div className={styles.featuresSlot}>
                    <CharacterFeaturesSection
                      className={styles.stretchSection}
                      editorClassName={styles.fillNotesEditor}
                      rows={10}
                      sheet={sheet}
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </Panel>
    </div>
  )
}
