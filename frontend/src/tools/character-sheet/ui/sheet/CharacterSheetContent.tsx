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
import { CharacterCurrencySection } from './CharacterSheetCurrencySection'
import { CharacterEquipmentSection } from './CharacterEquipmentSection'
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

const PERSONALITY_SECTION_ORDER = [
  'traits',
  'ideals',
  'bonds',
  'flaws',
] as const

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
                  headingFontSize: 14,
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
            <div
              className={styles.sheetPage}
              data-character-sheet-page={true}
            >
              <CharacterIdentitySection
                sheet={sheet}
                onPortraitFileSelect={onPortraitFileSelect}
                onPortraitRemove={onPortraitRemove}
              />

              <div
                className={styles.bodyGrid}
                data-character-sheet-layout="body"
              >
                <section
                  aria-label="Основные показатели"
                  className={styles.quickBar}
                >
                  <div
                    className={styles.inspirationStats}
                    data-character-sheet-stat-stack="mastery"
                  >
                    <CharacterSheetStat
                      className={styles.quickStat}
                      compact={true}
                      sheet={sheet}
                      stat="inspiration"
                    />

                    <CharacterSheetStat
                      className={styles.quickStat}
                      compact={true}
                      presentation="list"
                      sheet={sheet}
                      stat="proficiency"
                    />
                  </div>

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

                  <div
                    className={styles.vitalsPanel}
                    data-character-sheet-vitals={true}
                  >
                    <div
                      className={styles.hitPointsSlot}
                      data-character-sheet-slot="hit-points"
                    >
                      <CharacterHitPointsSection sheet={sheet} />
                    </div>

                    <div
                      className={styles.deathSavesSlot}
                      data-character-sheet-slot="death-saves"
                    >
                      <CharacterDeathSavesSection sheet={sheet} />
                    </div>
                  </div>
                </section>

                <div
                  className={styles.leftLowerGrid}
                  data-character-sheet-column="left"
                >
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

                <div
                  className={styles.centerLowerGrid}
                  data-character-sheet-column="center"
                >
                  <div
                    className={styles.hitDiceSlot}
                    data-character-sheet-slot="hit-dice"
                  >
                    <CharacterHitDiceSection sheet={sheet} />
                  </div>

                  <div
                    className={styles.attacksSlot}
                    data-character-sheet-slot="attacks"
                  >
                    <CharacterAttacksSection sheet={sheet} />
                  </div>

                  <div
                    className={styles.equipmentSlot}
                    data-character-sheet-slot="equipment"
                  >
                    <CharacterEquipmentSection sheet={sheet} />
                  </div>

                  <div
                    className={styles.currencySlot}
                    data-character-sheet-slot="currency"
                  >
                    <CharacterCurrencySection sheet={sheet} />
                  </div>
                </div>

                <div
                  className={styles.notesLowerGrid}
                  data-character-sheet-column="right"
                >
                  <div className={styles.featuresSlot}>
                    <CharacterFeaturesSection
                      className={styles.stretchSection}
                      editorClassName={styles.fillNotesEditor}
                      rows={10}
                      sheet={sheet}
                    />
                  </div>

                  <div
                    className={styles.personalitySections}
                    data-character-sheet-personality-sections={true}
                  >
                    {PERSONALITY_SECTION_ORDER.map((section) => (
                      <CharacterPersonalitySection
                        key={section}
                        className={styles.personalitySection}
                        editorClassName={styles.personalityEditor}
                        rows={3}
                        section={section}
                        sheet={sheet}
                      />
                    ))}
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
