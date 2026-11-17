import {
  computed,
  getCurrentScope,
  onScopeDispose,
  ref,
  shallowRef,
  type ComputedRef,
  type Ref
} from 'vue'
import { catalog as defaultCatalog, catalogOf } from '../domain/catalog'
import {
  createPacklist,
  createTentConfig,
  defaultTentOptions,
  fingerprint
} from '../domain/packlist'
import type { Catalog, Finish, PacklistFile, Part, Stock, TentConfig } from '../domain/types'
import { ConflictError, type PacklistDocument } from '../storage/DataStore'
import { applyOp, newId, type PacklistOp } from './packlistOps'
import { MAX_CONFLICT_RETRIES, toError, toStock } from './useStock'
import { onVisible } from './onVisible'
import { useStore } from './useStore'

export const PACKLIST_SAVE_DELAY_MS = 800

export interface UsePacklist {
  list: Ref<PacklistFile | null>
  loading: Ref<boolean>
  saving: Ref<boolean>
  error: Ref<Error | null>
  canWrite: Ref<boolean>
  /** Katalog aus der Materialliste (Zelttypen, Artikel, Kategorien) */
  catalog: Ref<Catalog>
  /** Bestand oder Katalog haben sich seit der Berechnung geändert (F-37). */
  stale: ComputedRef<boolean>
  load(): Promise<void>
  /** Lädt still nach, wenn Packliste oder Bestand woanders geändert wurden. */
  refresh(): Promise<void>
  flush(): Promise<void>
  setDate(date: string | undefined): void
  setFinishOrder(order: Finish[]): void
  /** Fügt `count` Zelte in Standardkonfiguration hinzu und liefert deren IDs. */
  addTent(typeId: string, count?: number): string[]
  updateTent(tentId: string, patch: Partial<Omit<TentConfig, 'id' | 'typeId'>>): void
  /** Setzt Dach, Wand, Bauart und Ausführung auf die Standardkonfiguration des Zelttyps. */
  resetTent(tentId: string): void
  removeTent(tentId: string): void
  duplicateTent(tentId: string): void
  moveTent(tentId: string, direction: -1 | 1): void
  /** Verschiebt das Zelt an die (0-basierte) Position `index`, z. B. nach dem Ziehen. */
  moveTentTo(tentId: string, index: number): void
  toggleItem(articleId: string): void
  toggleExtra(extraId: string): void
  /** weiteres Material aus der Materialliste (ersetzt die Liste) */
  setMaterials(materials: Part[]): void
  addExtra(text: string, quantity: number): void
  removeExtra(extraId: string): void
  recalc(): void
}

function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/**
 * Bearbeitet die Packliste in `doc`. Der Bestand kommt immer vom festen Ablageort (useStore).
 */
export function usePacklist(doc: PacklistDocument): UsePacklist {
  const store = useStore()
  const list = ref<PacklistFile | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<Error | null>(null)
  const canWrite = ref(false)
  const stock = ref<Stock>({})
  const catalog = shallowRef<Catalog>(defaultCatalog)
  const stockLoaded = ref(false)

  const stale = computed(
    () =>
      list.value !== null &&
      stockLoaded.value &&
      list.value.fingerprint !== fingerprint(catalog.value, stock.value)
  )

  let etag: string | null = null
  let pending: PacklistOp[] = []
  let timer: ReturnType<typeof setTimeout> | undefined
  let chain: Promise<void> = Promise.resolve()
  let stockEtag: string | null = null
  const unwatch: (() => void)[] = []

  const ctx = () => ({ catalog: catalog.value, stock: stock.value })

  function clearTimer() {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
  }

  async function load() {
    clearTimer()
    loading.value = true
    error.value = null
    try {
      const [writable, stockFile, loaded] = await Promise.all([
        doc.canWrite(),
        store.loadStock(),
        doc.load()
      ])
      canWrite.value = writable
      stock.value = toStock(stockFile.data.stock)
      catalog.value = catalogOf(stockFile.data)
      stockLoaded.value = true
      stockEtag = stockFile.etag
      etag = loaded.etag
      pending = []
      if (loaded.data) {
        list.value = loaded.data
      } else {
        // Leere Datei, frisch über „Neu“ angelegt: mit einer leeren Packliste füllen.
        const created = createPacklist(doc.name, catalog.value, stock.value)
        if (writable) {
          etag = await doc.save(created, etag)
        }
        list.value = created
      }
      watchChanges()
    } catch (e) {
      list.value = null
      error.value = toError(e)
    } finally {
      loading.value = false
    }
  }

  function watchChanges() {
    if (unwatch.length > 0) return
    const listChanged = doc.watch?.((change) => {
      if (change.etag === null || change.etag !== etag) void enqueue(refreshList)
    })
    const stockChanged = store.watchStock?.((change) => {
      if (change.etag === null || change.etag !== stockEtag) void enqueue(refreshStock)
    })
    unwatch.push(onVisible(() => void refresh()))
    for (const stop of [listChanged, stockChanged]) if (stop) unwatch.push(stop)
  }

  async function refreshList() {
    try {
      const fresh = await doc.load()
      if (fresh.etag === etag || !fresh.data) return
      let next = fresh.data
      for (const op of pending) {
        next = applyOp(next, op, ctx())
      }
      list.value = next
      etag = fresh.etag
    } catch (e) {
      error.value = toError(e)
    }
  }

  /** Neuer Bestand oder Katalog: Die Liste zeigt dann „Neu berechnen“ an (stale). */
  async function refreshStock() {
    try {
      const fresh = await store.loadStock()
      if (fresh.etag === stockEtag) return
      stock.value = toStock(fresh.data.stock)
      catalog.value = catalogOf(fresh.data)
      stockEtag = fresh.etag
    } catch (e) {
      error.value = toError(e)
    }
  }

  /** Läuft nach laufenden Speicherungen, damit kein halber Stand überschrieben wird. */
  function enqueue(task: () => Promise<void>): Promise<void> {
    const run = chain.then(task)
    chain = run
    return run
  }

  async function refresh() {
    await enqueue(refreshStock)
    await enqueue(refreshList)
  }

  async function doSave() {
    if (pending.length === 0 || !list.value) {
      return
    }
    let ops = pending
    pending = []
    saving.value = true
    try {
      let snapshot = plain(list.value)
      for (let attempt = 0; ; attempt++) {
        try {
          etag = await doc.save(snapshot, etag)
          error.value = null
          return
        } catch (e) {
          if (!(e instanceof ConflictError) || attempt >= MAX_CONFLICT_RETRIES) {
            throw e
          }
          // F-38: neu laden, eigene Änderungen auf den frischen Stand anwenden, erneut speichern.
          const fresh = await doc.load()
          ops = [...ops, ...pending]
          pending = []
          let next = fresh.data ?? createPacklist(doc.name, catalog.value, stock.value)
          for (const op of ops) {
            next = applyOp(next, op, ctx())
          }
          etag = fresh.etag
          list.value = next
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

  function push(op: PacklistOp) {
    if (!canWrite.value || !list.value) {
      return
    }
    list.value = applyOp(list.value, op, ctx())
    pending.push(op)
    clearTimer()
    timer = setTimeout(() => void flush(), PACKLIST_SAVE_DELAY_MS)
  }

  function toggleItem(articleId: string) {
    const item = list.value?.items.find((i) => i.articleId === articleId)
    if (item) {
      push({ type: 'setItemChecked', articleId, checked: !item.checked })
    }
  }

  function toggleExtra(extraId: string) {
    const extra = list.value?.extraItems.find((e) => e.id === extraId)
    if (extra) {
      push({ type: 'setExtraChecked', extraId, checked: !extra.checked })
    }
  }

  function addTent(typeId: string, count = 1): string[] {
    const type = catalog.value.tentTypes.find((t) => t.id === typeId)
    if (!type) {
      return []
    }
    const ids: string[] = []
    for (let i = 0; i < count; i++) {
      const id = newId()
      ids.push(id)
      push({ type: 'addTent', tent: { ...createTentConfig(type), id } })
    }
    return ids
  }

  function resetTent(tentId: string) {
    const tent = list.value?.tents.find((t) => t.id === tentId)
    const type = catalog.value.tentTypes.find((t) => t.id === tent?.typeId)
    if (type) {
      push({ type: 'updateTent', tentId, patch: defaultTentOptions(type) })
    }
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      for (const stop of unwatch.splice(0)) stop()
      if (pending.length > 0) {
        void flush()
      }
      clearTimer()
    })
  }

  return {
    list,
    catalog,
    loading,
    saving,
    error,
    canWrite,
    stale,
    load,
    refresh,
    flush,
    setDate: (date) => push({ type: 'setDate', date }),
    setFinishOrder: (order) => push({ type: 'setFinishOrder', order }),
    addTent,
    updateTent: (tentId, patch) => push({ type: 'updateTent', tentId, patch }),
    resetTent,
    removeTent: (tentId) => push({ type: 'removeTent', tentId }),
    duplicateTent: (tentId) => push({ type: 'duplicateTent', tentId, newId: newId() }),
    moveTent: (tentId, direction) => push({ type: 'moveTent', tentId, direction }),
    moveTentTo: (tentId, index) => push({ type: 'moveTentTo', tentId, index }),
    toggleItem,
    toggleExtra,
    setMaterials: (materials) => push({ type: 'setMaterials', materials }),
    addExtra: (text, quantity) =>
      push({
        type: 'addExtra',
        extra: { id: newId(), text, quantity, checked: false }
      }),
    removeExtra: (extraId) => push({ type: 'removeExtra', extraId }),
    recalc: () => push({ type: 'recalc' })
  }
}
