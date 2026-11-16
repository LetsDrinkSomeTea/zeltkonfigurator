import {
  computed,
  getCurrentScope,
  onScopeDispose,
  ref,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref
} from 'vue'
import { catalog } from '../domain/catalog'
import { createTentConfig, fingerprint } from '../domain/packlist'
import type { Finish, PacklistFile, Stock, TentConfig } from '../domain/types'
import { ConflictError } from '../storage/DataStore'
import { applyOp, newId, type PacklistOp } from './packlistOps'
import { MAX_CONFLICT_RETRIES, toError, toStock } from './useStock'
import { useStore } from './useStore'

export const PACKLIST_SAVE_DELAY_MS = 800

export interface UsePacklist {
  list: Ref<PacklistFile | null>
  loading: Ref<boolean>
  saving: Ref<boolean>
  error: Ref<Error | null>
  canWrite: Ref<boolean>
  /** Bestand oder Katalog haben sich seit der Berechnung geändert (F-37). */
  stale: ComputedRef<boolean>
  load(): Promise<void>
  flush(): Promise<void>
  setName(name: string): void
  setDate(date: string | undefined): void
  setFinishOrder(order: Finish[]): void
  addTent(typeId: string): void
  updateTent(tentId: string, patch: Partial<Omit<TentConfig, 'id' | 'typeId'>>): void
  removeTent(tentId: string): void
  duplicateTent(tentId: string): void
  moveTent(tentId: string, direction: -1 | 1): void
  toggleItem(articleId: string): void
  toggleExtra(extraId: string): void
  addExtra(text: string, quantity: number): void
  removeExtra(extraId: string): void
  recalc(): void
}

function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function usePacklist(id: MaybeRefOrGetter<string>): UsePacklist {
  const store = useStore()
  const list = ref<PacklistFile | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<Error | null>(null)
  const canWrite = ref(false)
  const stock = ref<Stock>({})
  const stockLoaded = ref(false)

  const stale = computed(
    () =>
      list.value !== null &&
      stockLoaded.value &&
      list.value.fingerprint !== fingerprint(catalog, stock.value)
  )

  let etag: string | null = null
  let pending: PacklistOp[] = []
  let timer: ReturnType<typeof setTimeout> | undefined
  let chain: Promise<void> = Promise.resolve()

  const ctx = () => ({ catalog, stock: stock.value })

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
        store.canWrite(),
        store.loadStock(),
        store.loadPacklist(toValue(id))
      ])
      canWrite.value = writable
      stock.value = toStock(stockFile.data.stock)
      stockLoaded.value = true
      list.value = loaded.data
      etag = loaded.etag
      pending = []
    } catch (e) {
      list.value = null
      error.value = toError(e)
    } finally {
      loading.value = false
    }
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
          etag = await store.savePacklist(snapshot, etag)
          error.value = null
          return
        } catch (e) {
          if (!(e instanceof ConflictError) || attempt >= MAX_CONFLICT_RETRIES) {
            throw e
          }
          // F-38: neu laden, eigene Änderungen auf den frischen Stand anwenden, erneut speichern.
          const fresh = await store.loadPacklist(snapshot.id)
          ops = [...ops, ...pending]
          pending = []
          let next = fresh.data
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

  function addTent(typeId: string) {
    const type = catalog.tentTypes.find((t) => t.id === typeId)
    if (!type) {
      return
    }
    push({ type: 'addTent', tent: { ...createTentConfig(type), id: newId() } })
  }

  watch(
    () => toValue(id),
    async () => {
      await flush()
      await load()
    }
  )

  if (getCurrentScope()) {
    onScopeDispose(() => {
      if (pending.length > 0) {
        void flush()
      }
      clearTimer()
    })
  }

  return {
    list,
    loading,
    saving,
    error,
    canWrite,
    stale,
    load,
    flush,
    setName: (name) => push({ type: 'setName', name }),
    setDate: (date) => push({ type: 'setDate', date }),
    setFinishOrder: (order) => push({ type: 'setFinishOrder', order }),
    addTent,
    updateTent: (tentId, patch) => push({ type: 'updateTent', tentId, patch }),
    removeTent: (tentId) => push({ type: 'removeTent', tentId }),
    duplicateTent: (tentId) => push({ type: 'duplicateTent', tentId, newId: newId() }),
    moveTent: (tentId, direction) => push({ type: 'moveTent', tentId, direction }),
    toggleItem,
    toggleExtra,
    addExtra: (text, quantity) =>
      push({
        type: 'addExtra',
        extra: { id: newId(), text, quantity, checked: false }
      }),
    removeExtra: (extraId) => push({ type: 'removeExtra', extraId }),
    recalc: () => push({ type: 'recalc' })
  }
}
