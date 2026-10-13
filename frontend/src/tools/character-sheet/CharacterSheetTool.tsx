import { useEffect, useRef, useState, type DragEvent } from 'react'
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
  hasCharacterEncyclopediaDrag,
  hasCharacterEncyclopediaSpellDrag,
  readCharacterEncyclopediaDrag,
  toCharacterEncyclopediaEntry,
  type CharacterEncyclopediaEntry,
  type CharacterEncyclopediaMode,
} from './ui/encyclopedia'
import {
  createEquipmentFromEncyclopedia,
  createSpellFromEncyclopedia,
  equipmentDetailPatch,
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
  const [page, setPage] = useState<'character' | 'spells'>('character')
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [libraryMode, setLibraryMode] = useState<CharacterEncyclopediaMode>('item')
  const [itemDragOver, setItemDragOver] = useState(false)
  const [importError, setImportError] = useState('')
  const detailRequests = useRef(new Set<AbortController>())

  useEffect(() => () => {
    detailRequests.current.forEach((request) => request.abort())
  }, [])

  function hydrateEntry(entry: CharacterEncyclopediaEntry, localId: string) {
    const controller = new AbortController()
    detailRequests.current.add(controller)
    void fetchEncyclopedia<EncyclopediaEntry>(`${entry.id}/`, controller.signal)
      .then((detail) => {
        if (controller.signal.aborted) return
        if (entry.entityType === 'item') {
          dispatch(characterSheetActions.updateEquipmentItem(localId, equipmentDetailPatch(detail)))
        } else {
          dispatch(characterSheetActions.updateSpell(localId, spellDetailPatch(detail)))
        }
      })
      .catch(() => { /* Запись уже добавлена по данным списка. */ })
      .finally(() => detailRequests.current.delete(controller))
  }

  function addEntry(entry: CharacterEncyclopediaEntry) {
    setImportError('')
    if (entry.entityType === 'item') {
      const item = createEquipmentFromEncyclopedia(entry)
      const existing = document.equipmentItems?.find((candidate) => candidate.entityId === entry.id)
      dispatch(characterSheetActions.addEquipmentItem(item))
      hydrateEntry(entry, existing?.id ?? item.id)
      setPage('character')
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
    setPage('spells')
  }

  function openLibrary(mode: CharacterEncyclopediaMode) {
    setLibraryMode(mode)
    setLibraryOpen(true)
  }

  function handleItemDragOver(event: DragEvent<HTMLDivElement>) {
    if (page !== 'character' || !hasCharacterEncyclopediaDrag(event.dataTransfer)
      || hasCharacterEncyclopediaSpellDrag(event.dataTransfer)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    if (!itemDragOver) setItemDragOver(true)
  }

  function handleItemDrop(event: DragEvent<HTMLDivElement>) {
    setItemDragOver(false)
    if (page !== 'character') return
    const entry = readCharacterEncyclopediaDrag(event.dataTransfer)
    if (entry?.entityType !== 'item') return
    event.preventDefault()
    addEntry(entry)
  }

  const spellcasting = document.spellcasting ?? createEmptySpellcasting()
  const castingAbility = getEffectiveSpellcastingAbility(document)
  const abilityModifier = selectAbilityModifier(formulas, castingAbility) ?? 0
  const proficiency = selectFormulaValue(formulas, 'PROFICIENCY') ?? 0

  return <div className={[styles.workspace, className].filter(Boolean).join(' ')} data-library-open={libraryOpen}>
    <div className={styles.stage} data-page={page}>
      <div className={styles.sheetSurface} data-item-drop-target={itemDragOver}
        onDragOver={handleItemDragOver}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setItemDragOver(false)
        }}
        onDrop={handleItemDrop}>
        {page === 'character' ? <CharacterSheetContent
          fitWidth={fitWidth}
          onPortraitFileSelect={onPortraitFileSelect}
          onPortraitRemove={onPortraitRemove}
        /> : <div className={styles.spellViewport}>
          <SpellSheet
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
            onBack={() => setPage('character')}
          />
        </div>}
      </div>
      <button type="button" className={styles.pageTab}
        title={page === 'character' ? 'Лист заклинаний' : 'Лист персонажа'}
        aria-label={page === 'character' ? 'Лист заклинаний' : 'Лист персонажа'}
        onClick={() => {
          setPage(page === 'character' ? 'spells' : 'character')
          if (libraryOpen) setLibraryMode(page === 'character' ? 'spell' : 'item')
        }}>
        <span aria-hidden="true">{page === 'character' ? '›' : '‹'}</span>
      </button>
      {page === 'character' && <button type="button" className={styles.libraryTrigger}
        title="Энциклопедия" aria-expanded={libraryOpen}
        aria-label="Открыть энциклопедию для листа персонажа"
        onClick={() => openLibrary('item')}>Энциклопедия</button>}
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
