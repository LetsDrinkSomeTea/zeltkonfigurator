import { usePacklist } from '../../../src/composables/usePacklist'
import { usePacklists } from '../../../src/composables/usePacklists'
import { MemoryDataStore } from '../../../src/storage/MemoryDataStore'
import { withStore } from './fixtures'

describe('Dateiname folgt dem Namen der Packliste', () => {
  it('neue Listen heißen wie die Liste; doppelte Namen werden nummeriert', async () => {
    const store = new MemoryDataStore()
    const lists = withStore(store, () => usePacklists())
    expect(await lists.create('Sommerlager 2027')).toBe('Sommerlager 2027')
    expect(await lists.create('Sommerlager 2027')).toBe('Sommerlager 2027 (2)')
    expect(await lists.create('Pfingsten/Mai')).toBe('Pfingsten Mai')
    expect(await lists.duplicate('Pfingsten Mai')).toBe('Pfingsten Mai (Kopie)')
  })

  it('Umbenennen zieht die Datei nach und behält den Inhalt', async () => {
    const store = new MemoryDataStore()
    const lists = withStore(store, () => usePacklists())
    const id = await lists.create('Entwurf')
    const pl = withStore(store, () => usePacklist(id))
    await pl.load()
    pl.addExtra('Gaskocher', 2)

    const next = await pl.rename('Herbstlager')

    expect(next).toBe('Herbstlager')
    const ids = (await store.listPacklists()).map((s) => s.id)
    expect(ids).toEqual(['Herbstlager'])
    const { data } = await store.loadPacklist('Herbstlager')
    expect(data.name).toBe('Herbstlager')
    expect(data.extraItems.map((e) => e.text)).toEqual(['Gaskocher'])
  })

  it('lässt die Datei in Ruhe, wenn der Name zum Dateinamen passt oder nur gelesen wird', async () => {
    const store = new MemoryDataStore()
    const id = await withStore(store, () => usePacklists()).create('Sommerlager')
    const pl = withStore(store, () => usePacklist(id))
    await pl.load()
    expect(await pl.rename('sommerlager')).toBe('Sommerlager')

    const readonly = new MemoryDataStore({
      writable: false,
      packlists: [(await store.loadPacklist('Sommerlager')).data]
    })
    const ro = withStore(readonly, () => usePacklist('Sommerlager'))
    await ro.load()
    expect(await ro.rename('Anders')).toBe('Sommerlager')
    expect((await readonly.listPacklists()).map((s) => s.id)).toEqual(['Sommerlager'])
  })

  it('weicht aus, wenn der neue Name schon vergeben ist', async () => {
    const store = new MemoryDataStore()
    const lists = withStore(store, () => usePacklists())
    await lists.create('Herbstlager')
    const id = await lists.create('Entwurf')
    const pl = withStore(store, () => usePacklist(id))
    await pl.load()
    expect(await pl.rename('Herbstlager')).toBe('Herbstlager (2)')
  })
})
