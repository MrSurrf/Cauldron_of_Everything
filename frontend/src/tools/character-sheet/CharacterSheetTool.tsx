import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { fetchEncyclopedia, type EncyclopediaEntry } from '../../entities/encyclopedia'
import { EncyclopediaSectionIcon } from '../../pages/encyclopedia/EncyclopediaSectionIcon'
import { PlaceholderIcon } from '../../shared/ui'
import {
  CharacterSheetProvider,
  FORMULA_FIELD_KEYS,
  characterSheetActions,
  createCharacterSheetVariableRegistry,
  createEmptySpellcasting,
  getEffectiveSpellcastingAbility,
  getEffectiveSpellSlots,
  selectFormulaResult,
  useCharacterSheet,
  type CharacterSheetDocument,
  type SpellLevel,
} from './model'
import {
  CharacterEncyclopediaPanel,
  readCharacterEncyclopediaDrag,
  toCharacterEncyclopediaEntry,
  type CharacterEncyclopediaEntry,
  type CharacterEncyclopediaMode,
} from './ui/encyclopedia'
import {
  createSpellFromEncyclopedia,
  equipmentDetailPatch,
  equipmentItemSource,
  spellDetailPatch,
} from './ui/encyclopedia/characterEntryImport'
import { CharacterEncyclopediaDragProvider } from './ui/encyclopedia/CharacterEncyclopediaDragProvider'
import { useCharacterEncyclopediaDrag } from './ui/encyclopedia/useCharacterEncyclopediaDrag'
import dragStyles from './ui/encyclopedia/characterEncyclopediaDragFeedback.module.css'
import { CharacterSheetContent } from './ui/sheet/CharacterSheetContent'
import { toComputedResult } from './ui/sheet/sheetViewModel'
import { SpellSheet } from './ui/spell-sheet/SpellSheet'
import styles from './CharacterSheetWorkspace.module.css'

const ABILITY_NAMES = {
  strength: 'Сила',
  dexterity: 'Ловкость',
  constitution: 'Телосложение',
  intelligence: 'Интеллект',
  wisdom: 'Мудрость',
  charisma: 'Харизма',
} as const

const LIBRARY_DOCK_WIDTH = {
  closed: 128,
  open: 384,
} as const
const SHEET_SPACE_GUTTER = 16

type CharacterSheetWorkspaceProps = Pick<CharacterSheetToolProps,
  'className' | 'fitWidth' | 'onPortraitFileSelect' | 'onPortraitRemove'
>

function CharacterSheetWorkspace({
  className,
  fitWidth = false,
  onPortraitFileSelect,
  onPortraitRemove,
}: CharacterSheetWorkspaceProps) {
  const { document, dispatch, formulas } = useCharacterSheet()
  const { entry: draggedEntry } = useCharacterEncyclopediaDrag()
  const [spellsOpen, setSpellsOpen] = useState(false)
  const [spellTabExpanded, setSpellTabExpanded] = useState(false)
  const [spellSheetMounted, setSpellSheetMounted] = useState(false)
  const [workspaceWidth, setWorkspaceWidth] = useState(0)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [libraryMounted, setLibraryMounted] = useState(false)
  const [libraryMode, setLibraryMode] = useState<CharacterEncyclopediaMode>('item')
  const [importError, setImportError] = useState('')
  const detailRequests = useRef(new Set<AbortController>())
  const workspace = useRef<HTMLDivElement>(null)
  const libraryTrigger = useRef<HTMLButtonElement>(null)

  function expandSpellTab(button: HTMLButtonElement) {
    const moving = button.parentElement?.getAnimations()
      .some(animation => animation.playState === 'running')
    if (!moving) setSpellTabExpanded(true)
  }

  useEffect(() => () => {
    detailRequests.current.forEach((request) => request.abort())
  }, [])

  useEffect(() => {
    if (spellsOpen || !spellSheetMounted) return
    const fallback = window.setTimeout(() => setSpellSheetMounted(false), 750)
    return () => window.clearTimeout(fallback)
  }, [spellSheetMounted, spellsOpen])

  useEffect(() => {
    if (libraryOpen || !libraryMounted) return
    const focus = window.requestAnimationFrame(() => libraryTrigger.current?.focus({ preventScroll: true }))
    // transitionend не придёт при reduced motion или прерванной CSS-анимации.
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 750
    const fallback = window.setTimeout(() => setLibraryMounted(false), delay)
    return () => { window.cancelAnimationFrame(focus); window.clearTimeout(fallback) }
  }, [libraryMounted, libraryOpen])

  useEffect(() => {
    const root = workspace.current
    if (!root) return
    // DPR меняется и при переносе между мониторами, поэтому не используем его
    // как zoom. Сохраняем относительный масштаб страницы по размерам окна.
    const windowRatio = () => window.outerWidth > 0 && window.innerWidth > 0
      ? window.outerWidth / window.innerWidth
      : 1
    const initialWindowRatio = windowRatio()
    const measure = () => {
      const browserZoom = windowRatio() / initialWindowRatio
      setWorkspaceWidth(Math.round(root.clientWidth * browserZoom))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  function hydrateEntry(entry: CharacterEncyclopediaEntry, localId?: string) {
    const controller = new AbortController()
    detailRequests.current.add(controller)
    void fetchEncyclopedia<EncyclopediaEntry>(`${entry.id}/`, controller.signal)
      .then((detail) => {
        if (controller.signal.aborted) return
        if (entry.entityType === 'item') {
          dispatch(characterSheetActions.enrichEquipmentItem(entry.id, equipmentDetailPatch(detail)))
        } else if (localId) {
          dispatch(characterSheetActions.updateSpell(localId, spellDetailPatch(detail)))
        }
      })
      .catch(() => { /* Запись уже добавлена по данным списка. */ })
      .finally(() => detailRequests.current.delete(controller))
  }

  function addEntry(entry: CharacterEncyclopediaEntry) {
    setImportError('')
    if (entry.entityType === 'class' || entry.entityType === 'race' || entry.entityType === 'background') {
      const field = entry.entityType === 'class' ? 'className' : entry.entityType
      dispatch(characterSheetActions.patchIdentity({ [field]: entry.name }))
      return
    }
    if (entry.entityType === 'item') {
      dispatch(characterSheetActions.importEquipmentItem(entry.id, equipmentItemSource(entry)))
      hydrateEntry(entry)
      return
    }

    const spell = createSpellFromEncyclopedia(entry)
    if (!spell) {
      const controller = new AbortController()
      detailRequests.current.add(controller)
      void fetchEncyclopedia<EncyclopediaEntry>(`${entry.id}/`, controller.signal)
        .then((detail) => {
          if (controller.signal.aborted) return
          const resolved = toCharacterEncyclopediaEntry(detail)
          if (resolved?.level !== null && resolved?.level !== undefined) addEntry(resolved)
          else setImportError(`Для «${entry.name}» не указан уровень заклинания.`)
        })
        .catch(() => {
          if (!controller.signal.aborted) setImportError(`Не удалось определить уровень заклинания «${entry.name}».`)
        })
        .finally(() => detailRequests.current.delete(controller))
      return
    }
    const existing = document.spellcasting?.spells.find((candidate) => candidate.entityId === entry.id)
    dispatch(characterSheetActions.addSpell(spell))
    hydrateEntry(entry, existing?.id ?? spell.id)
    setSpellSheetMounted(true)
    setSpellsOpen(true)
  }

  const emptySpellcasting = createEmptySpellcasting()
  const spellcasting = document.spellcasting
    ? { ...emptySpellcasting, ...document.spellcasting }
    : emptySpellcasting
  const castingAbility = getEffectiveSpellcastingAbility(document)
  const formulaVariables = useMemo(
    () => createCharacterSheetVariableRegistry(document).list().map((variable) => ({
      key: variable.key,
      label: variable.label,
    })),
    [document],
  )
  const reservedLibraryWidth = libraryOpen || spellsOpen
    ? LIBRARY_DOCK_WIDTH.open
    : LIBRARY_DOCK_WIDTH.closed
  const pageScale = workspaceWidth > 0
    ? Math.min(1, Math.max(0.1, (workspaceWidth - reservedLibraryWidth - SHEET_SPACE_GUTTER) / (spellsOpen ? 1988 : 990)))
    : 1
  const spreadWidth = (spellsOpen ? 1988 : 990) * pageScale + SHEET_SPACE_GUTTER

  return <div ref={workspace} className={[styles.workspace, className].filter(Boolean).join(' ')}
    style={{ '--book-min-width': `${spreadWidth}px` } as CSSProperties}
    data-fit-width={fitWidth || undefined} data-library-mounted={libraryMounted || undefined}
    data-library-open={libraryOpen} data-spells-open={spellsOpen}>
    <div className={styles.sheetSpace} aria-label="Листы персонажа">
      <div
        className={`${styles.book} ${dragStyles.scene}`}
        data-encyclopedia-drag-active={Boolean(draggedEntry) || undefined}
        data-spells-open={spellsOpen}
        style={{ '--book-scale': pageScale } as CSSProperties}
      >
        <div className={styles.characterPanel}>
          <CharacterSheetContent
            className={styles.characterContent}
            onPortraitFileSelect={onPortraitFileSelect}
            onPortraitRemove={onPortraitRemove}
            onEncyclopediaItemDrop={(transfer) => {
              const entry = readCharacterEncyclopediaDrag(transfer)
              if (entry?.entityType === 'item') addEntry(entry)
            }}
          />
        </div>
        <div className={styles.spellReveal}>
          <div
            className={styles.spellDrawer}
            data-spell-sheet-drawer
            onTransitionRun={(event) => {
              if (event.target === event.currentTarget && event.propertyName === 'transform') {
                setSpellTabExpanded(false)
              }
            }}
            onTransitionEnd={(event) => {
              if (
                event.target === event.currentTarget &&
                event.propertyName === 'transform' &&
                !spellsOpen
              ) {
                setSpellSheetMounted(false)
              }
            }}
          >
            {spellSheetMounted && <div
              className={styles.spellPanel}
              data-spell-sheet-panel
              data-state={spellsOpen ? 'open' : 'closing'}
              inert={!spellsOpen}
            >
              <SpellSheet
                spellcasting={{
                  className: spellcasting.className || document.identity.className,
                  abilityKey: castingAbility,
                  ability: ABILITY_NAMES[castingAbility],
                  saveDc: spellcasting.saveDc,
                  saveDcResult: toComputedResult(selectFormulaResult(formulas, FORMULA_FIELD_KEYS.spellSaveDc)),
                  attackBonus: spellcasting.attackBonus,
                  attackBonusResult: toComputedResult(selectFormulaResult(formulas, FORMULA_FIELD_KEYS.spellAttackBonus)),
                }}
                slots={getEffectiveSpellSlots(document)}
                spells={spellcasting.spells}
                formulaVariables={formulaVariables}
                onSlotUsedChange={(level, used) => dispatch(characterSheetActions.setSpellSlotUsed(level, used))}
                onSlotMaximumChange={(level, maximum) => dispatch(characterSheetActions.setSpellSlotMaximum(level, maximum))}
                onClassNameChange={(className) => dispatch(characterSheetActions.setSpellcastingClassName(className))}
                onAbilityChange={(ability) => dispatch(characterSheetActions.setSpellcastingAbility(ability))}
                onSaveDcChange={(value) => dispatch(characterSheetActions.setNumericField({ kind: 'spellcasting', field: 'saveDc' }, value))}
                onAttackBonusChange={(value) => dispatch(characterSheetActions.setNumericField({ kind: 'spellcasting', field: 'attackBonus' }, value))}
                onSpellPreparedChange={(id, prepared) => dispatch(characterSheetActions.setSpellPrepared(id, prepared))}
                onSpellDrop={(transfer, level: SpellLevel) => {
                  const entry = readCharacterEncyclopediaDrag(transfer)
                  if (entry?.entityType !== 'spell') return
                  if (entry.level !== null && entry.level !== level) {
                    setImportError(`«${entry.name}» — заклинание ${entry.level}-го уровня. Перенесите его в соответствующий раздел.`)
                    return
                  }
                  addEntry({ ...entry, level })
                }}
                onRemoveSpell={(id) => dispatch(characterSheetActions.removeSpell(id))}
              />
            </div>}
            <button type="button" className={styles.pageTab}
              data-spell-sheet-toggle
              data-expanded={spellTabExpanded}
              aria-label={spellsOpen ? 'Скрыть лист заклинаний' : 'Лист заклинаний'}
              aria-expanded={spellsOpen}
              onMouseEnter={(event) => expandSpellTab(event.currentTarget)}
              onMouseLeave={() => setSpellTabExpanded(false)}
              onFocus={(event) => {
                if (event.currentTarget.matches(':focus-visible')) expandSpellTab(event.currentTarget)
              }}
              onBlur={() => setSpellTabExpanded(false)}
              onClick={() => {
                setSpellTabExpanded(false)
                const nextOpen = !spellsOpen
                if (nextOpen) setSpellSheetMounted(true)
                setSpellsOpen(nextOpen)
                if (libraryOpen) setLibraryMode(spellsOpen ? 'item' : 'spell')
              }}><span className={styles.pageTabContent} aria-hidden="true">
                <span className={styles.pageTabLabel}>Лист<br />заклинаний</span>
                <span className={styles.pageTabIcon} data-spell-sheet-icon>
                  <EncyclopediaSectionIcon sectionId="spells" />
                </span>
                <span className={styles.pageTabArrow} data-spell-sheet-arrow>{spellsOpen ? '‹' : '›'}</span>
              </span></button>
          </div>
        </div>
      </div>
    </div>
    <div className={styles.libraryDock} data-encyclopedia-dock data-open={libraryOpen}>
      {!libraryOpen && <button type="button" className={styles.libraryTrigger}
        ref={libraryTrigger}
        data-encyclopedia-trigger
        title="Открыть энциклопедию"
        aria-expanded={false}
        aria-label="Открыть энциклопедию для листа персонажа"
        onClick={() => { setLibraryMounted(true); setLibraryOpen(true) }}>
        <span className={styles.libraryTriggerIcon} aria-hidden="true"><PlaceholderIcon /></span>
        <span>Энциклопедия</span>
      </button>}
      <div className={styles.libraryReveal}>
        <div className={styles.libraryDrawer} data-encyclopedia-drawer
          data-state={libraryOpen ? 'open' : libraryMounted ? 'closing' : 'closed'}
          aria-hidden={!libraryOpen} inert={!libraryOpen}
          onTransitionEnd={event => {
            if (event.target === event.currentTarget && event.propertyName === 'transform' && !libraryOpen) setLibraryMounted(false)
          }}>
          {libraryMounted && <CharacterEncyclopediaPanel
            className={styles.library}
            mode={libraryMode}
            onModeChange={setLibraryMode}
            onAdd={addEntry}
            onClose={() => setLibraryOpen(false)}
          />}
        </div>
      </div>
    </div>
    {importError && <div className={styles.importError} role="alert">
      <span>{importError}</span>
      <button type="button" onClick={() => setImportError('')} aria-label="Закрыть сообщение">×</button>
    </div>}
  </div>
}

export type CharacterSheetToolProps = {
  className?: string
  /** Уменьшать лист целиком под ширину host-панели, не меняя его раскладку. */
  fitWidth?: boolean
  document?: CharacterSheetDocument
  initialDocument?: CharacterSheetDocument
  onDocumentChange?: (
    document: CharacterSheetDocument,
  ) => void
  onPortraitFileSelect?: (
    file: File,
    characterId: string,
  ) => void
  onPortraitRemove?: (characterId: string) => void
}

export function CharacterSheetTool({
  className,
  fitWidth,
  document,
  initialDocument,
  onDocumentChange,
  onPortraitFileSelect,
  onPortraitRemove,
}: CharacterSheetToolProps) {
  return (
    <CharacterSheetProvider
      document={document}
      initialDocument={initialDocument}
      onDocumentChange={onDocumentChange}
    >
      <CharacterEncyclopediaDragProvider>
        <CharacterSheetWorkspace
          className={className}
          fitWidth={fitWidth}
          onPortraitFileSelect={onPortraitFileSelect}
          onPortraitRemove={onPortraitRemove}
        />
      </CharacterEncyclopediaDragProvider>
    </CharacterSheetProvider>
  )
}
