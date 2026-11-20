import { useEffect, useState, useSyncExternalStore } from 'react'

import { captureDraftRepository } from './draftRepository'
import { createArticleDraft } from './types'
import type { ArticleDraft } from './types'

export type ArticleSaveState = 'saved' | 'saving' | 'error'

type Snapshot = {
  drafts: ArticleDraft[]
  activeDraft: ArticleDraft | null
  loading: boolean
  error: string | null
  saveState: ArticleSaveState
}

export type ArticleDraftsState = Snapshot & {
  updateDraft: (patch: Partial<ArticleDraft>) => void
  createDraft: () => void
  selectDraft: (id: string) => void
  deleteDraft: (id: string) => void
  retrySave: () => void
}

const SAVE_DELAY = 450
// Только незавершённые записи переживают SPA-размонтирование. Чистые контроллеры
// не превращаются в постоянный кеш статей и перечитывают IndexedDB при новом входе.
const retainedControllers = new Map<string, DraftController>()

function errorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return 'На устройстве недостаточно места. Изменения остались в этой вкладке; освободите место и повторите сохранение.'
  }
  return `${error instanceof Error ? error.message : 'Локальное хранилище недоступно.'} Изменения в открытой вкладке не удалены.`
}

/** Очередь вне React-эффектов: смена статьи не теряет debounce и незавершённую запись. */
class DraftController {
  private readonly repository: ReturnType<typeof captureDraftRepository>
  private readonly listeners = new Set<() => void>()
  private readonly pending = new Map<string, ArticleDraft>()
  private readonly pendingDeletes = new Set<string>()
  private drafts: ArticleDraft[] = []
  private activeId: string | null = null
  private loading = true
  private initialized = false
  private started = false
  private error: string | null = null
  private saveState: ArticleSaveState = 'saved'
  private selectionRevision = 0
  private savedSelectionRevision = 0
  private timer: ReturnType<typeof setTimeout> | undefined
  private writing: Promise<void> | null = null
  private snapshot: Snapshot = { drafts: [], activeDraft: null, loading: true, error: null, saveState: 'saved' }

  constructor(repository: ReturnType<typeof captureDraftRepository>) {
    this.repository = repository
  }

  getSnapshot = () => this.snapshot

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private publish() {
    this.snapshot = {
      drafts: this.drafts,
      activeDraft: this.drafts.find(draft => draft.id === this.activeId) ?? null,
      loading: this.loading,
      error: this.error,
      saveState: this.saveState,
    }
    if (!this.hasUnsavedChanges() && this.selectionRevision === this.savedSelectionRevision
      && retainedControllers.get(this.repository.scope) === this) {
      retainedControllers.delete(this.repository.scope)
    }
    for (const listener of this.listeners) listener()
  }

  retainPending = () => {
    if (this.hasUnsavedChanges() || this.selectionRevision !== this.savedSelectionRevision) {
      retainedControllers.set(this.repository.scope, this)
    }
  }

  start = async () => {
    if (this.started) return
    this.started = true
    this.loading = true
    this.publish()
    try {
      const loaded = await this.repository.load()
      this.drafts = loaded.drafts
      this.activeId = loaded.activeId
      this.initialized = true
      this.error = null
      this.saveState = 'saved'
    } catch (error) {
      this.error = errorMessage(error)
      this.saveState = 'error'
    }
    this.loading = false
    this.publish()
  }

  private schedule() {
    if (this.timer !== undefined) clearTimeout(this.timer)
    this.saveState = 'saving'
    this.timer = setTimeout(() => { this.timer = undefined; void this.flush() }, SAVE_DELAY)
    this.publish()
  }

  updateDraft = (patch: Partial<ArticleDraft>) => {
    if (!this.initialized || !this.activeId) return
    const previous = this.drafts.find(draft => draft.id === this.activeId)
    if (!previous || this.pendingDeletes.has(previous.id)) return
    const next: ArticleDraft = {
      ...previous,
      ...patch,
      // Системные поля нельзя поменять через пользовательский patch.
      id: previous.id,
      version: 1,
      createdAt: previous.createdAt,
      updatedAt: new Date().toISOString(),
    }
    this.drafts = this.drafts.map(draft => draft.id === next.id ? next : draft)
    this.pending.set(next.id, next)
    this.schedule()
  }

  private addDraft() {
    const draft = createArticleDraft()
    this.drafts = [draft, ...this.drafts]
    this.pending.set(draft.id, draft)
    this.activeId = draft.id
    this.selectionRevision++
    return draft
  }

  createDraft = () => {
    if (!this.initialized) return
    this.addDraft()
    this.saveState = 'saving'
    this.publish()
    void this.flush()
  }

  selectDraft = (id: string) => {
    if (!this.drafts.some(draft => draft.id === id) || this.pendingDeletes.has(id)) return
    this.activeId = id
    this.selectionRevision++
    this.saveState = 'saving'
    this.publish()
    void this.flush()
  }

  deleteDraft = (id: string) => {
    if (!this.drafts.some(draft => draft.id === id)) return
    // До подтверждения удаления транзакцией статья остаётся в памяти и списке.
    this.pendingDeletes.add(id)
    this.saveState = 'saving'
    this.publish()
    void this.flush()
  }

  retrySave = () => {
    if (!this.initialized) {
      this.started = false
      void this.start()
    } else {
      void this.flush()
    }
  }

  hasUnsavedChanges = () => this.pending.size > 0 || this.pendingDeletes.size > 0

  flush = (): Promise<void> => {
    if (this.timer !== undefined) { clearTimeout(this.timer); this.timer = undefined }
    if (this.writing) return this.writing
    if (!this.initialized || (!this.hasUnsavedChanges() && this.selectionRevision === this.savedSelectionRevision)) return Promise.resolve()
    this.saveState = 'saving'
    this.publish()
    this.writing = this.writePending().finally(() => { this.writing = null })
    return this.writing
  }

  private async writePending() {
    try {
      while (this.hasUnsavedChanges() || this.selectionRevision !== this.savedSelectionRevision) {
        for (const [id, draft] of this.pending) {
          if (this.pendingDeletes.has(id)) continue
          await this.repository.save(draft)
          // Правки, сделанные во время записи, остаются в очереди следующего прохода.
          if (this.pending.get(id) === draft) this.pending.delete(id)
        }
        for (const id of this.pendingDeletes) {
          await this.repository.remove(id)
          this.pending.delete(id)
          this.pendingDeletes.delete(id)
          this.drafts = this.drafts.filter(draft => draft.id !== id)
          if (this.activeId === id) {
            this.activeId = this.drafts[0]?.id ?? null
            this.selectionRevision++
          }
          if (this.drafts.length === 0) this.addDraft()
          this.publish()
        }
        if (this.selectionRevision !== this.savedSelectionRevision) {
          const revision = this.selectionRevision
          await this.repository.select(this.activeId)
          this.savedSelectionRevision = revision
        }
      }
      this.error = null
      this.saveState = 'saved'
    } catch (error) {
      // Не очищаем pending и не откатываем форму на последнюю сохранённую копию.
      this.error = errorMessage(error)
      this.saveState = 'error'
    }
    this.publish()
  }
}

export function useArticleDrafts(): ArticleDraftsState {
  const [controller] = useState(() => {
    const repository = captureDraftRepository()
    return retainedControllers.get(repository.scope) ?? new DraftController(repository)
  })
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)

  useEffect(() => {
    void controller.start()
    const flush = () => { void controller.flush() }
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') flush() }
    const beforeUnload = (event: BeforeUnloadEvent) => {
      flush()
      if (controller.hasUnsavedChanges()) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      controller.retainPending()
      flush()
    }
  }, [controller])

  return {
    ...snapshot,
    updateDraft: controller.updateDraft,
    createDraft: controller.createDraft,
    selectDraft: controller.selectDraft,
    deleteDraft: controller.deleteDraft,
    retrySave: controller.retrySave,
  }
}
