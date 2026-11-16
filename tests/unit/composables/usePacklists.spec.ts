import { usePacklists } from '../../../src/composables/usePacklists'
import { MemoryDataStore } from '../../../src/storage/MemoryDataStore'
import { makeList, withStore } from './fixtures'

vi.mock('../../../src/domain/catalog', async () => {
  const f = await import('./fixtures')
  return { catalog: f.fakeCatalog }
})
vi.mock('../../../src/domain/packlist', async () => {
  const f = await import('./fixtures')
  return {
    recalculate: f.fakeRecalculate,
    fingerprint: f.fakeFingerprint,
    createTentConfig: f.fakeCreateTentConfig,
    createPacklist: f.fakeCreatePacklist
  }
})

describe('usePacklists', () => {
  it('loads summaries and canWrite', async () => {
    const store = new MemoryDataStore({ packlists: [makeList()] })
    const pls = withStore(store, () => usePacklists())
    await pls.load()
    expect(pls.summaries.value.map((s) => s.id)).toEqual(['p1'])
    expect(pls.canWrite.value).toBe(true)
  })

  it('creates a packlist with the current stock and returns the new id', async () => {
    const store = new MemoryDataStore({
      stock: { schemaVersion: 1, stock: { a: { quantity: 2 } } }
    })
    const pls = withStore(store, () => usePacklists())
    const id = await pls.create('Pfingstlager')
    const { data } = await store.loadPacklist(id)
    expect(data.name).toBe('Pfingstlager')
    expect(data.fingerprint).toBe('fp:{"a":2}')
    expect(pls.summaries.value.map((s) => s.id)).toEqual([id])
  })

  it('duplicates with new id, "(Kopie)" name and cleared checks', async () => {
    const list = makeList()
    list.items[0].checked = true
    list.extraItems = [{ id: 'e', text: 'x', quantity: 1, checked: true }]
    const store = new MemoryDataStore({ packlists: [list] })
    const pls = withStore(store, () => usePacklists())
    const id = await pls.duplicate('p1')
    expect(id).not.toBe('p1')
    const { data } = await store.loadPacklist(id)
    expect(data.name).toBe('Sommerlager (Kopie)')
    expect(data.id).toBe(id)
    expect(data.items.every((i) => !i.checked)).toBe(true)
    expect(data.extraItems.every((e) => !e.checked)).toBe(true)
    expect(data.tents).toEqual(list.tents)
    expect((await store.loadPacklist('p1')).data.items[0].checked).toBe(true)
    expect(pls.summaries.value).toHaveLength(2)
  })

  it('removes a packlist', async () => {
    const store = new MemoryDataStore({ packlists: [makeList()] })
    const pls = withStore(store, () => usePacklists())
    await pls.load()
    await pls.remove('p1')
    expect(pls.summaries.value).toEqual([])
  })

  it('reports load errors in error', async () => {
    const store = new MemoryDataStore()
    vi.spyOn(store, 'listPacklists').mockRejectedValue(new Error('boom'))
    const pls = withStore(store, () => usePacklists())
    await pls.load()
    expect(pls.error.value?.message).toBe('boom')
  })
})
