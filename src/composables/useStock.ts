import { computed, getCurrentScope, onScopeDispose, ref, type ComputedRef, type Ref } from 'vue'
import type { Stock, StockFile } from '../domain/types'
import { ConflictError } from '../storage/DataStore'
import { useStore } from './useStore'

export const STOCK_SAVE_DELAY_MS = 800
export const MAX_CONFLICT_RETRIES = 3

export type StockEntries = StockFile['stock']

export type StockOp =
  | { type: 'setQuantity'; articleId: string; quantity: number }
  | { type: 'setNote'; articleId: string; note: string }

export function normalizeQuantity(quantity: number): number {
  return Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0
}

/** Rein: wendet eine Operation an und gibt neue Einträge zurück. Unbekannte Artikel bleiben erhalten. */
export function applyStockOp(entries: StockEntries, op: StockOp): StockEntries {
  const next: StockEntries = { ...entries }
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
  entries: Ref<StockEntries>
  stock: ComputedRef<Stock>
  loading: Ref<boolean>
  saving: Ref<boolean>
  error: Ref<Error | null>
  canWrite: Ref<boolean>
  load(): Promise<void>
  setQuantity(articleId: string, quantity: number): void
  setNote(articleId: string, note: string): void
  flush(): Promise<void>
}

export function useStock(): UseStock {
  const store = useStore()
  const entries = ref<StockEntries>({})
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<Error | null>(null)
  const canWrite = ref(false)
  const stock = computed(() => toStock(entries.value))

  let etag: string | null = null
  let pending: StockOp[] = []
  let timer: ReturnType<typeof setTimeout> | undefined
  let chain: Promise<void> = Promise.resolve()

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
      entries.value = loaded.data.stock
      etag = loaded.etag
      pending = []
    } catch (e) {
      error.value = toError(e)
    } finally {
      loading.value = false
    }
  }

  async function doSave() {
    if (pending.length === 0) {
      return
    }
    let ops = pending
    pending = []
    saving.value = true
    try {
      let snapshot: StockFile = { schemaVersion: 1, stock: plain(entries.value) }
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
          let next = fresh.data.stock
          for (const op of ops) {
            next = applyStockOp(next, op)
          }
          etag = fresh.etag
          entries.value = next
          snapshot = { schemaVersion: 1, stock: plain(next) }
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
    entries.value = applyStockOp(entries.value, op)
    pending.push(op)
    clearTimer()
    timer = setTimeout(() => void flush(), STOCK_SAVE_DELAY_MS)
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      if (pending.length > 0) {
        void flush()
      }
      clearTimer()
    })
  }

  return {
    entries,
    stock,
    loading,
    saving,
    error,
    canWrite,
    load,
    setQuantity: (articleId, quantity) => push({ type: 'setQuantity', articleId, quantity }),
    setNote: (articleId, note) => push({ type: 'setNote', articleId, note }),
    flush
  }
}
