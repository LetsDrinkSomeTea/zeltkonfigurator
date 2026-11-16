import { catalog } from '../../../src/domain/catalog'
import { createPacklist, createTentConfig, recalculate } from '../../../src/domain/packlist'
import type { PacklistFile, Stock } from '../../../src/domain/types'
import { usePacklist } from '../../../src/composables/usePacklist'
import { MemoryDataStore } from '../../../src/storage/MemoryDataStore'
import { withStore } from '../composables/fixtures'

export const STOCK: Stock = { kohtenblatt: 8, 't-profil': 8, 'mast-375': 2 }

export function buildList(extra: Partial<PacklistFile> = {}): PacklistFile {
  const kohte = catalog.tentTypes.find((t) => t.id === 'kohte')!
  const base = createPacklist('Sommerlager', catalog, STOCK)
  const tents = [
    { ...createTentConfig(kohte), id: 't1' },
    { ...createTentConfig(kohte), id: 't2' }
  ]
  const list = recalculate({ ...base, id: 'p1', tents }, catalog, STOCK)
  return { ...list, ...extra }
}

export async function setup(options: { list?: PacklistFile; writable?: boolean } = {}) {
  const list = options.list ?? buildList()
  const store = new MemoryDataStore({
    writable: options.writable ?? true,
    stock: {
      schemaVersion: 1,
      stock: Object.fromEntries(Object.entries(STOCK).map(([k, q]) => [k, { quantity: q }]))
    },
    packlists: [list]
  })
  const pl = withStore(store, () => usePacklist(store.document('p1')))
  await pl.load()
  return { store, pl, list }
}
