import { computed, getCurrentScope, onScopeDispose, ref, type ComputedRef, type Ref } from 'vue'
import { defaultCatalogData, resolveCatalog } from '../domain/catalog'
import type {
  Article,
  Catalog,
  CatalogData,
  CategoryDef,
  RoofModule,
  Stock,
  StockFile,
  TentTypeData
} from '../domain/types'
import { ConflictError } from '../storage/DataStore'
import { onVisible } from './onVisible'
import { useStore } from './useStore'

export const STOCK_SAVE_DELAY_MS = 800
export const MAX_CONFLICT_RETRIES = 3

export type StockEntries = StockFile['stock']

export type StockOp =
  | { type: 'setQuantity'; articleId: string; quantity: number }
  | { type: 'setNote'; articleId: string; note: string }
  | { type: 'remove'; articleId: string }
  // Katalog: anlegen bzw. ersetzen (gleiche id) und löschen
  | { type: 'upsertCategory'; category: CategoryDef }
  | { type: 'removeCategory'; id: string }
  | { type: 'upsertArticle'; article: Article }
  | { type: 'removeArticle'; id: string }
  | { type: 'upsertModule'; module: RoofModule }
  | { type: 'removeModule'; id: string }
  | { type: 'upsertTentType'; tentType: TentTypeData }
  | { type: 'removeTentType'; id: string }

export function normalizeQuantity(quantity: number): number {
  return Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id)
  return i < 0 ? [...list, item] : list.map((x, j) => (j === i ? item : x))
}

/** Rein: wendet eine Katalog-Operation auf die Katalog-Daten an. */
export function applyCatalogOp(data: CatalogData, op: StockOp): CatalogData {
  switch (op.type) {
    case 'upsertCategory':
      return { ...data, categories: upsert(data.categories, op.category) }
    case 'removeCategory':
      // Wandmaterial braucht seine Kategorie; belegte Kategorien bleiben.
      if (op.id === 'wand' || data.articles.some((a) => a.category === op.id)) return data
      return { ...data, categories: data.categories.filter((c) => c.id !== op.id) }
    case 'upsertArticle':
      return { ...data, articles: upsert(data.articles, op.article) }
    case 'removeArticle':
      return { ...data, articles: data.articles.filter((a) => a.id !== op.id) }
    case 'upsertModule':
      return { ...data, modules: upsert(data.modules, op.module) }
    case 'removeModule':
      return { ...data, modules: data.modules.filter((m) => m.id !== op.id) }
    case 'upsertTentType':
      return { ...data, tentTypes: upsert(data.tentTypes, op.tentType) }
    case 'removeTentType':
      return { ...data, tentTypes: data.tentTypes.filter((t) => t.id !== op.id) }
    default:
      return data
  }
}

/** Rein: wendet eine Operation auf die ganze Datei an. Unbekannte Artikel bleiben erhalten. */
export function applyFileOp(file: StockFile, op: StockOp): StockFile {
  if (op.type === 'setQuantity' || op.type === 'setNote' || op.type === 'remove') {
    return { ...file, stock: applyStockOp(file.stock, op) }
  }
  const catalog = applyCatalogOp(file.catalog ?? plain(defaultCatalogData), op)
  // Ein gelöschter Artikel verschwindet auch aus dem Bestand.
  const stock =
    op.type === 'removeArticle'
      ? applyStockOp(file.stock, { type: 'remove', articleId: op.id })
      : file.stock
  return { ...file, stock, catalog }
}

/** Rein: wendet eine Bestands-Operation an und gibt neue Einträge zurück. */
export function applyStockOp(entries: StockEntries, op: StockOp): StockEntries {
  if (op.type !== 'setQuantity' && op.type !== 'setNote' && op.type !== 'remove') {
    return entries
  }
  const next: StockEntries = { ...entries }
  if (op.type === 'remove') {
    delete next[op.articleId]
    return next
  }
  const current = next[op.articleId] ?? { quantity: 0 }
  if (op.type === 'setQuantity') {
    next[op.articleId] = { ...current, quantity: normalizeQuantity(op.quantity) }
  } else {
    const note = op.note.trim()
    next[op.articleId] = note === '' ? { quantity: current.quantity } : { ...current, note }
  }
  return next
}

export function toStock(entries: StockEntries): Stock {
  return Object.fromEntries(Object.entries(entries).map(([id, e]) => [id, e.quantity]))
}

export function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e))
}

function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export interface UseStock {
  entries: ComputedRef<StockEntries>
  stock: ComputedRef<Stock>
  /** Katalog-Daten der Materialliste (mitgelieferte, solange keine eigenen gespeichert sind) */
  catalogData: ComputedRef<CatalogData>
  /** aufgelöster Katalog zum Rechnen und Anzeigen */
  catalog: ComputedRef<Catalog>
  loading: Ref<boolean>
  saving: Ref<boolean>
  error: Ref<Error | null>
  canWrite: Ref<boolean>
  load(): Promise<void>
  /** Lädt still nach, wenn die Datei woanders geändert wurde; eigene ungespeicherte Änderungen bleiben. */
  refresh(): Promise<void>
  setQuantity(articleId: string, quantity: number): void
  setNote(articleId: string, note: string): void
  removeEntry(articleId: string): void
  /** Katalog bearbeiten (Kategorien, Artikel, Dächer, Zelttypen) */
  edit(op: StockOp): void
  flush(): Promise<void>
}

export function useStock(): UseStock {
  const store = useStore()
  const file = ref<StockFile>({ schemaVersion: 1, stock: {} })
  const entries = computed(() => file.value.stock)
  const catalogData = computed(() => file.value.catalog ?? defaultCatalogData)
  const catalog = computed(() => resolveCatalog(catalogData.value))
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<Error | null>(null)
  const canWrite = ref(false)
  const stock = computed(() => toStock(entries.value))

  let etag: string | null = null
  let pending: StockOp[] = []
  let timer: ReturnType<typeof setTimeout> | undefined
  let chain: Promise<void> = Promise.resolve()
  let unwatch: (() => void)[] | undefined

  function clearTimer() {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
  }

  async function load() {
    loading.value = true
    error.value = null
    try {
      const [writable, loaded] = await Promise.all([store.canWrite(), store.loadStock()])
      canWrite.value = writable
      file.value = loaded.data
      etag = loaded.etag
      pending = []
      watchChanges()
    } catch (e) {
      error.value = toError(e)
    } finally {
      loading.value = false
    }
  }

  function watchChanges() {
    if (unwatch) return
    const changed = store.watchStock?.((change) => {
      if (change.etag === null || change.etag !== etag) void refresh()
    })
    unwatch = [onVisible(() => void refresh())]
    if (changed) unwatch.push(changed)
  }

  async function doRefresh() {
    try {
      const fresh = await store.loadStock()
      if (fresh.etag === etag) return
      let next = fresh.data
      for (const op of pending) {
        next = applyFileOp(next, op)
      }
      file.value = next
      etag = fresh.etag
    } catch (e) {
      error.value = toError(e)
    }
  }

  /** Läuft nach laufenden Speicherungen, damit kein halber Stand überschrieben wird. */
  function refresh(): Promise<void> {
    const run = chain.then(doRefresh)
    chain = run
    return run
  }

  async function doSave() {
    if (pending.length === 0) {
      return
    }
    let ops = pending
    pending = []
    saving.value = true
    try {
      let snapshot: StockFile = plain(file.value)
      for (let attempt = 0; ; attempt++) {
        try {
          etag = await store.saveStock(snapshot, etag)
          error.value = null
          return
        } catch (e) {
          if (!(e instanceof ConflictError) || attempt >= MAX_CONFLICT_RETRIES) {
            throw e
          }
          const fresh = await store.loadStock()
          ops = [...ops, ...pending]
          pending = []
          let next = fresh.data
          for (const op of ops) {
            next = applyFileOp(next, op)
          }
          etag = fresh.etag
          file.value = next
          snapshot = plain(next)
        }
      }
    } catch (e) {
      error.value = toError(e)
      pending = [...ops, ...pending]
    } finally {
      saving.value = false
    }
  }

  function flush(): Promise<void> {
    clearTimer()
    const run = chain.then(doSave)
    chain = run
    return run
  }

  function push(op: StockOp) {
    if (!canWrite.value) {
      return
    }
    file.value = applyFileOp(file.value, op)
    pending.push(op)
    clearTimer()
    timer = setTimeout(() => void flush(), STOCK_SAVE_DELAY_MS)
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      for (const stop of unwatch ?? []) stop()
      if (pending.length > 0) {
        void flush()
      }
      clearTimer()
    })
  }

  return {
    entries,
    stock,
    catalogData,
    catalog,
    loading,
    saving,
    error,
    canWrite,
    load,
    refresh,
    setQuantity: (articleId, quantity) => push({ type: 'setQuantity', articleId, quantity }),
    setNote: (articleId, note) => push({ type: 'setNote', articleId, note }),
    removeEntry: (articleId) => push({ type: 'remove', articleId }),
    edit: push,
    flush
  }
}
