import { createApp, defineComponent, h } from 'vue'
import { usePacklist, PACKLIST_SAVE_DELAY_MS } from '../../../src/composables/usePacklist'
import { provideStore, resetStoreForTests, useStore } from '../../../src/composables/useStore'
import { ConflictError, NotFoundError } from '../../../src/storage/DataStore'
import { MemoryDataStore } from '../../../src/storage/MemoryDataStore'
import { fakeCatalog, makeList, withStore } from './fixtures'

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
    defaultTentOptions: f.fakeDefaultTentOptions,
    createPacklist: f.fakeCreatePacklist
  }
})

const stored = (store: MemoryDataStore) => store.loadPacklist('p1').then((r) => r.data)

async function setup(options: ConstructorParameters<typeof MemoryDataStore>[0] = {}) {
  const store = new MemoryDataStore({ packlists: [makeList()], ...options })
  const pl = withStore(store, () => usePacklist(store.document('p1')))
  await pl.load()
  return { store, pl }
}

describe('usePacklist', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads the list and reports canWrite', async () => {
    const { pl } = await setup()
    expect(pl.list.value?.name).toBe('Sommerlager')
    expect(pl.canWrite.value).toBe(true)
    expect(pl.error.value).toBeNull()
  })

  it('puts load errors into error instead of throwing', async () => {
    const store = new MemoryDataStore()
    const pl = withStore(store, () => usePacklist(store.document('missing')))
    await expect(pl.load()).resolves.toBeUndefined()
    expect(pl.error.value).toBeInstanceOf(NotFoundError)
    expect(pl.list.value).toBeNull()
  })

  it('batches several toggles into a single debounced save', async () => {
    const { store, pl } = await setup()
    const spy = vi.spyOn(store, 'savePacklist')
    pl.toggleItem('art-t1')
    await vi.advanceTimersByTimeAsync(PACKLIST_SAVE_DELAY_MS - 100)
    pl.toggleItem('art-t2')
    await vi.advanceTimersByTimeAsync(PACKLIST_SAVE_DELAY_MS - 100)
    expect(spy).not.toHaveBeenCalled()
    expect(pl.list.value?.items.map((i) => i.checked)).toEqual([true, true])
    await vi.advanceTimersByTimeAsync(200)
    expect(spy).toHaveBeenCalledTimes(1)
    expect((await stored(store)).items.map((i) => i.checked)).toEqual([true, true])
  })

  it('flush saves immediately', async () => {
    const { store, pl } = await setup()
    pl.setDate('2026-08-01')
    await pl.flush()
    expect((await stored(store)).date).toBe('2026-08-01')
  })

  it('does not lose a check set by someone else on conflict (F-38)', async () => {
    const store = new MemoryDataStore({ packlists: [makeList()] })
    const a = withStore(store, () => usePacklist(store.document('p1')))
    const b = withStore(store, () => usePacklist(store.document('p1')))
    await Promise.all([a.load(), b.load()])
    a.toggleItem('art-t1')
    b.toggleItem('art-t2')
    await a.flush()
    await b.flush()
    expect(b.error.value).toBeNull()
    const file = await stored(store)
    expect(file.items.map((i) => i.checked)).toEqual([true, true])
    expect(b.list.value?.items.map((i) => i.checked)).toEqual([true, true])
  })

  it('gives up after 3 conflict retries and sets error', async () => {
    const { store, pl } = await setup()
    const spy = vi.spyOn(store, 'savePacklist').mockRejectedValue(new ConflictError('x'))
    pl.setDate('2026-08-01')
    await pl.flush()
    expect(spy).toHaveBeenCalledTimes(4)
    expect(pl.error.value).toBeInstanceOf(ConflictError)
  })

  it('resets buildId to the first build when wallId changes', async () => {
    const { store, pl } = await setup()
    pl.updateTent('t1', { wallId: 'w2' })
    expect(pl.list.value?.tents[0]).toMatchObject({ wallId: 'w2', buildId: 'b1' })
    pl.updateTent('t1', { wallId: 'w0' })
    expect(pl.list.value?.tents[0]).toMatchObject({ wallId: 'w0', buildId: '' })
    pl.updateTent('t2', { wallId: 'w2', buildId: 'b1' })
    expect(pl.list.value?.tents[1].buildId).toBe('b1')
    pl.updateTent('t2', { buildId: 'x' })
    expect(pl.list.value?.tents[1].buildId).toBe('x')
    await pl.flush()
    expect((await stored(store)).tents[0].wallId).toBe('w0')
  })

  it('adds, duplicates, moves and removes tents and recalculates', async () => {
    const { store, pl } = await setup()
    pl.addTent('kohte')
    expect(pl.list.value?.tents).toHaveLength(3)
    const added = pl.list.value!.tents[2]
    expect(added.id).not.toBe('tent-fake')
    pl.addTent('unknown')
    expect(pl.list.value?.tents).toHaveLength(3)

    pl.duplicateTent('t1')
    const ids = pl.list.value!.tents.map((t) => t.id)
    expect(ids).toHaveLength(4)
    expect(ids[0]).toBe('t1')
    expect(ids[2]).toBe('t2')
    const copyId = ids[1]
    expect(copyId).not.toBe('t1')
    expect(pl.list.value?.items).toHaveLength(4)

    pl.moveTent(copyId, 1)
    expect(pl.list.value!.tents.map((t) => t.id).slice(0, 3)).toEqual(['t1', 't2', copyId])
    pl.moveTent('t1', -1)
    expect(pl.list.value!.tents[0].id).toBe('t1')

    pl.removeTent('t2')
    expect(pl.list.value!.tents.map((t) => t.id)).not.toContain('t2')
    expect(pl.list.value?.items.map((i) => i.articleId)).not.toContain('art-t2')

    await pl.flush()
    expect((await stored(store)).tents).toHaveLength(3)
  })

  it('manages finishOrder, date and extras', async () => {
    const { store, pl } = await setup()
    pl.setFinishOrder(['blanko', 'fenster', 'gaze'])
    pl.setDate('2026-07-01')
    pl.addExtra('Zeltbeil', 2)
    const extraId = pl.list.value!.extraItems[0].id
    pl.toggleExtra(extraId)
    await pl.flush()
    let file = await stored(store)
    expect(file.finishOrder).toEqual(['blanko', 'fenster', 'gaze'])
    expect(file.date).toBe('2026-07-01')
    expect(file.extraItems).toEqual([{ id: extraId, text: 'Zeltbeil', quantity: 2, checked: true }])
    pl.setDate(undefined)
    pl.removeExtra(extraId)
    await pl.flush()
    file = await stored(store)
    expect(file.date).toBeUndefined()
    expect(file.extraItems).toEqual([])
  })

  it('detects stale lists via fingerprint and clears it on recalc', async () => {
    const stock = { schemaVersion: 1 as const, stock: { a: { quantity: 3 } } }
    const { pl } = await setup({ stock })
    expect(pl.stale.value).toBe(true)
    pl.recalc()
    expect(pl.stale.value).toBe(false)
  })

  it('is not stale when fingerprint matches', async () => {
    const { pl } = await setup()
    expect(pl.stale.value).toBe(false)
  })

  it('makes mutations no-ops when read-only', async () => {
    const { store, pl } = await setup({ writable: false })
    const spy = vi.spyOn(store, 'savePacklist')
    expect(pl.canWrite.value).toBe(false)
    pl.toggleItem('art-t1')
    pl.setDate('2026-08-01')
    pl.addTent('kohte')
    await vi.advanceTimersByTimeAsync(PACKLIST_SAVE_DELAY_MS * 2)
    expect(pl.list.value?.date).toBeUndefined()
    expect(pl.list.value?.tents).toHaveLength(2)
    expect(spy).not.toHaveBeenCalled()
  })

  it('does not mutate stored state through the loaded list', async () => {
    const { store, pl } = await setup()
    pl.setDate('2026-08-01')
    expect((await stored(store)).date).toBeUndefined()
  })

  it('fills an empty file with a new list named after the file', async () => {
    const store = new MemoryDataStore()
    store.createEmptyFile('Pfila')
    const pl = withStore(store, () => usePacklist(store.document('Pfila')))
    await pl.load()
    expect(pl.error.value).toBeNull()
    expect(pl.list.value).toMatchObject({ name: 'Pfila', tents: [] })
    expect((await store.loadPacklist('Pfila')).data.name).toBe('Pfila')
    pl.addTent('kohte')
    await pl.flush()
    expect(pl.error.value).toBeNull()
    expect((await store.loadPacklist('Pfila')).data.tents).toHaveLength(1)
  })

  it('shows an empty file as an empty list without saving when read-only', async () => {
    const store = new MemoryDataStore({ writable: false })
    store.createEmptyFile('Pfila')
    const pl = withStore(store, () => usePacklist(store.document('Pfila')))
    await pl.load()
    expect(pl.error.value).toBeNull()
    expect(pl.list.value?.tents).toEqual([])
    await expect(store.loadPacklist('Pfila')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('resets a tent to the default configuration of its type', async () => {
    const { pl } = await setup()
    pl.updateTent('t1', { wallId: 'w2', finish: 'gaze', label: 'Küche' })
    pl.resetTent('t1')
    expect(pl.list.value?.tents[0]).toMatchObject({
      wallId: 'w0',
      buildId: '',
      finish: 'blanko',
      label: 'Küche'
    })
  })

  it('uses the catalog for wall options', () => {
    expect(fakeCatalog.tentTypes[0].walls).toHaveLength(3)
  })
})

describe('useStore', () => {
  afterEach(() => resetStoreForTests())

  it('injects the provided store', () => {
    const store = new MemoryDataStore()
    let injected: unknown
    const Child = defineComponent({
      setup() {
        injected = useStore()
        return (): null => null
      }
    })
    const Parent = defineComponent({
      setup() {
        provideStore(store)
        return () => h(Child)
      }
    })
    const el = document.createElement('div')
    createApp(Parent).mount(el)
    expect(injected).toBe(store)
  })
})
