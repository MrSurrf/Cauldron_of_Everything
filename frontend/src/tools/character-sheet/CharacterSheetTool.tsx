import { useEffect, useRef, useState } from 'react'
import { fetchEncyclopedia, type EncyclopediaEntry } from '../../entities/encyclopedia'
import {
  CharacterSheetProvider,
  characterSheetActions,
  createEmptySpellcasting,
  getEffectiveSpellcastingAbility,
  getEffectiveSpellSlots,
  selectAbilityModifier,
  selectFormulaValue,
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
import { CharacterSheetContent } from './ui/sheet/CharacterSheetContent'
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

type CharacterSheetWorkspaceProps = Pick<CharacterSheetToolProps,
  'className' | 'fitWidth' | 'onPortraitFileSelect' | 'onPortraitRemove'
>

function CharacterSheetWorkspace({
  className,
  fitWidth,
  onPortraitFileSelect,
  onPortraitRemove,
}: CharacterSheetWorkspaceProps) {
  const { document, dispatch, formulas } = useCharacterSheet()
  const [spellsOpen, setSpellsOpen] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [libraryMode, setLibraryMode] = useState<CharacterEncyclopediaMode>('item')
  const [importError, setImportError] = useState('')
  const detailRequests = useRef(new Set<AbortController>())
  const spreadViewport = useRef<HTMLDivElement>(null)
  const book = useRef<HTMLDivElement>(null)

  useEffect(() => () => {
    detailRequests.current.forEach((request) => request.abort())
  }, [])

  useEffect(() => {
    const viewport = spreadViewport.current
    if (!viewport) return
    const measure = () => setViewportWidth(viewport.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const viewport = spreadViewport.current
    const pages = book.current
    if (!viewport || !pages) return
    let frame = 0
    const alignPages = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const left = spellsOpen ? Math.max(0, viewport.scrollWidth - viewport.clientWidth) : 0
        if (Math.abs(viewport.scrollLeft - left) > 1) viewport.scrollTo({ left, behavior: 'smooth' })
      })
    }
    alignPages()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(alignPages)
    observer?.observe(viewport)
    observer?.observe(pages)
    return () => { observer?.disconnect(); cancelAnimationFrame(frame) }
  }, [spellsOpen])

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
    setSpellsOpen(true)
  }

  function openLibrary(mode: CharacterEncyclopediaMode) {
    setLibraryMode(mode)
    setLibraryOpen(true)
  }

  const spellcasting = document.spellcasting ?? createEmptySpellcasting()
  const castingAbility = getEffectiveSpellcastingAbility(document)
  const abilityModifier = selectAbilityModifier(formulas, castingAbility) ?? 0
  const proficiency = selectFormulaValue(formulas, 'PROFICIENCY') ?? 0
  const compactSpread = viewportWidth > 0 && viewportWidth < 1984
  const scaledSpread = fitWidth || (spellsOpen && compactSpread)
  const spellPageScale = scaledSpread
    ? Math.min(1, Math.max(0.01, (viewportWidth - 40) / (2 * 972)))
    : 1

  return <div className={[styles.workspace, className].filter(Boolean).join(' ')}
    data-library-open={libraryOpen} data-spells-open={spellsOpen} data-fit-width={Boolean(scaledSpread)}>
    <div ref={spreadViewport} className={styles.spreadViewport} aria-label="Листы персонажа">
      <div ref={book} className={styles.book}>
        <div className={styles.characterPanel}>
          <CharacterSheetContent
            className={styles.characterContent}
            fitWidth={scaledSpread}
            onPortraitFileSelect={onPortraitFileSelect}
            onPortraitRemove={onPortraitRemove}
            onEncyclopediaItemDrop={(transfer) => {
              const entry = readCharacterEncyclopediaDrag(transfer)
              if (entry?.entityType === 'item') addEntry(entry)
            }}
          />
          <button type="button" className={styles.pageTab}
            title={spellsOpen ? 'Скрыть лист заклинаний' : 'Лист заклинаний'}
            aria-label={spellsOpen ? 'Скрыть лист заклинаний' : 'Лист заклинаний'}
            aria-expanded={spellsOpen}
            onClick={() => {
              setSpellsOpen((value) => !value)
              if (libraryOpen) setLibraryMode(spellsOpen ? 'item' : 'spell')
            }}><span aria-hidden="true">{spellsOpen ? '‹' : '›'}</span></button>
          <button type="button" className={styles.libraryTrigger}
            title="Энциклопедия" aria-expanded={libraryOpen}
            aria-label="Открыть энциклопедию для листа персонажа"
            onClick={() => openLibrary('item')}>Энциклопедия</button>
        </div>
        {spellsOpen && <div className={styles.spellPanel}>
          <SpellSheet
            pageScale={spellPageScale}
            spellcasting={{
              className: document.identity.className || spellcasting.className,
              abilityKey: castingAbility,
              ability: ABILITY_NAMES[castingAbility],
              saveDc: 8 + proficiency + abilityModifier,
              attackBonus: proficiency + abilityModifier,
            }}
            slots={getEffectiveSpellSlots(document)}
            spells={spellcasting.spells}
            onSlotUsedChange={(level, used) => dispatch(characterSheetActions.setSpellSlotUsed(level, used))}
            onSlotMaximumChange={(level, maximum) => dispatch(characterSheetActions.setSpellSlotMaximum(level, maximum))}
            onAbilityChange={(ability) => dispatch(characterSheetActions.setSpellcastingAbility(ability))}
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
            onOpenEncyclopedia={() => openLibrary('spell')}
          />
        </div>}
      </div>
    </div>
    {importError && <div className={styles.importError} role="alert">
      <span>{importError}</span>
      <button type="button" onClick={() => setImportError('')} aria-label="Закрыть сообщение">×</button>
    </div>}
    {libraryOpen && <CharacterEncyclopediaPanel
      className={styles.library}
      mode={libraryMode}
      onModeChange={setLibraryMode}
      onAdd={addEntry}
      onClose={() => setLibraryOpen(false)}
    />}
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
      <CharacterSheetWorkspace
        className={className}
        fitWidth={fitWidth}
        onPortraitFileSelect={onPortraitFileSelect}
        onPortraitRemove={onPortraitRemove}
      />
    </CharacterSheetProvider>
  )
}
