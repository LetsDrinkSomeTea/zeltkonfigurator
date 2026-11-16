import { ref, type Ref } from 'vue'
import { catalog } from '../domain/catalog'
import { createPacklist } from '../domain/packlist'
import type { PacklistFile, PacklistSummary } from '../domain/types'
import { newId } from './packlistOps'
import { toError, toStock } from './useStock'
import { useStore } from './useStore'

export interface UsePacklists {
  summaries: Ref<PacklistSummary[]>
  loading: Ref<boolean>
  error: Ref<Error | null>
  canWrite: Ref<boolean>
  load(): Promise<void>
  /** Legt eine neue Packliste an und liefert ihre ID. */
  create(name: string): Promise<string>
  /** Kopie mit Namen "<name> (Kopie)", neuer ID und gelöschten Haken. */
  duplicate(id: string): Promise<string>
  remove(id: string): Promise<void>
}

export function usePacklists(): UsePacklists {
  const store = useStore()
  const summaries = ref<PacklistSummary[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const canWrite = ref(false)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const [writable, list] = await Promise.all([store.canWrite(), store.listPacklists()])
      canWrite.value = writable
      summaries.value = list
    } catch (e) {
      error.value = toError(e)
    } finally {
      loading.value = false
    }
  }

  async function refresh() {
    summaries.value = await store.listPacklists()
  }

  async function create(name: string): Promise<string> {
    const stockFile = await store.loadStock()
    const created = createPacklist(name, catalog, toStock(stockFile.data.stock))
    const file: PacklistFile = { ...created, id: created.id || newId() }
    await store.savePacklist(file, null)
    await refresh()
    return file.id
  }

  async function duplicate(id: string): Promise<string> {
    const { data } = await store.loadPacklist(id)
    const file: PacklistFile = {
      ...data,
      id: newId(),
      name: `${data.name} (Kopie)`,
      items: data.items.map((item) => ({ ...item, checked: false })),
      extraItems: data.extraItems.map((extra) => ({ ...extra, checked: false })),
      updatedAt: new Date().toISOString()
    }
    await store.savePacklist(file, null)
    await refresh()
    return file.id
  }

  async function remove(id: string): Promise<void> {
    await store.deletePacklist(id)
    await refresh()
  }

  return { summaries, loading, error, canWrite, load, create, duplicate, remove }
}
