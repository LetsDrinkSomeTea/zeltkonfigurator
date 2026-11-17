import type { PacklistFile, StockFile } from '../../../src/domain/types'
import { ConflictError, ForbiddenError, NotFoundError } from '../../../src/storage/DataStore'
import { MemoryDataStore } from '../../../src/storage/MemoryDataStore'

function list(id: string, overrides: Partial<PacklistFile> = {}): PacklistFile {
  return {
    schemaVersion: 1,
    id,
    name: id,
    tents: [],
    materials: [],
    finishOrder: ['gaze', 'fenster', 'blanko'],
    items: [],
    deviations: [],
    extraItems: [],
    fingerprint: 'x',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

const stockFile: StockFile = { schemaVersion: 1, stock: { a: { quantity: 2 } } }

describe('MemoryDataStore', () => {
  it('returns an empty stock with etag null when the file is missing', async () => {
    const store = new MemoryDataStore()
    expect(await store.loadStock()).toEqual({
      data: { schemaVersion: 1, stock: {} },
      etag: null
    })
  })

  it('creates the stock with etag null and produces a new etag on every save', async () => {
    const store = new MemoryDataStore()
    const e1 = await store.saveStock(stockFile, null)
    const e2 = await store.saveStock(stockFile, e1)
    expect(e1).not.toBe(e2)
    expect((await store.loadStock()).etag).toBe(e2)
  })

  it('rejects a stale or missing etag with ConflictError', async () => {
    const store = new MemoryDataStore({ stock: stockFile })
    await expect(store.saveStock(stockFile, null)).rejects.toBeInstanceOf(ConflictError)
    const { etag } = await store.loadStock()
    await store.saveStock(stockFile, etag)
    await expect(store.saveStock(stockFile, etag)).rejects.toBeInstanceOf(ConflictError)
  })

  it('rejects a non-null etag for a file that does not exist', async () => {
    const store = new MemoryDataStore()
    await expect(store.savePacklist(list('p'), '"x"')).rejects.toBeInstanceOf(ConflictError)
  })

  it('throws NotFoundError for a missing packlist', async () => {
    const store = new MemoryDataStore()
    await expect(store.loadPacklist('nope')).rejects.toBeInstanceOf(NotFoundError)
    await expect(store.document('nope').load()).rejects.toBeInstanceOf(NotFoundError)
  })

  it('applies etag semantics to packlists', async () => {
    const store = new MemoryDataStore()
    const e1 = await store.savePacklist(list('p'), null)
    await expect(store.savePacklist(list('p'), null)).rejects.toBeInstanceOf(ConflictError)
    const e2 = await store.savePacklist(list('p', { name: 'neu' }), e1)
    await expect(store.savePacklist(list('p'), e1)).rejects.toBeInstanceOf(ConflictError)
    const loaded = await store.loadPacklist('p')
    expect(loaded.etag).toBe(e2)
    expect(loaded.data.name).toBe('neu')
  })

  it('refuses all writes when not writable', async () => {
    const store = new MemoryDataStore({ writable: false, packlists: [list('p')] })
    expect(await store.canWrite()).toBe(false)
    await expect(store.saveStock(stockFile, null)).rejects.toBeInstanceOf(ForbiddenError)
    await expect(store.savePacklist(list('q'), null)).rejects.toBeInstanceOf(ForbiddenError)
    await expect(store.document('p').save(list('p'), null)).rejects.toBeInstanceOf(ForbiddenError)
    expect((await store.loadPacklist('p')).data.id).toBe('p')
  })

  it('clones data on the way in and out', async () => {
    const input = list('p', { name: 'orig' })
    const store = new MemoryDataStore({ packlists: [input] })
    input.name = 'mutated'
    const out = await store.loadPacklist('p')
    expect(out.data.name).toBe('orig')
    out.data.name = 'mutated'
    expect((await store.loadPacklist('p')).data.name).toBe('orig')

    const file = list('q')
    await store.savePacklist(file, null)
    file.name = 'mutated'
    expect((await store.loadPacklist('q')).data.name).toBe('q')
  })

  it('opens a packlist as a document named after its id', async () => {
    const store = new MemoryDataStore({ packlists: [list('Sommerlager')] })
    const doc = store.document('Sommerlager')
    expect(doc.name).toBe('Sommerlager')
    const loaded = await doc.load()
    const etag = await doc.save({ ...loaded.data!, date: '2026-08-01' }, loaded.etag)
    expect((await store.loadPacklist('Sommerlager')).data.date).toBe('2026-08-01')
    await expect(doc.save(loaded.data!, loaded.etag)).rejects.toBeInstanceOf(ConflictError)
    expect((await doc.load()).etag).toBe(etag)
  })

  it('treats a freshly created file as empty', async () => {
    const store = new MemoryDataStore()
    store.createEmptyFile('Neu')
    const loaded = await store.document('Neu').load()
    expect(loaded.data).toBeNull()
    expect(loaded.etag).not.toBeNull()
    await expect(store.loadPacklist('Neu')).rejects.toBeInstanceOf(NotFoundError)
    await store.document('Neu').save(list('x'), loaded.etag)
    expect((await store.loadPacklist('Neu')).data.id).toBe('Neu')
  })
})
