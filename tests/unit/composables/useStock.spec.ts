import { STOCK_SAVE_DELAY_MS, useStock } from '../../../src/composables/useStock'
import { ConflictError } from '../../../src/storage/DataStore'
import { MemoryDataStore } from '../../../src/storage/MemoryDataStore'
import { withStore } from './fixtures'

async function setup(options: ConstructorParameters<typeof MemoryDataStore>[0] = {}) {
  const store = new MemoryDataStore(options)
  const s = withStore(store, () => useStock())
  await s.load()
  return { store, s }
}

describe('useStock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads an empty stock when the file is missing', async () => {
    const { s } = await setup()
    expect(s.entries.value).toEqual({})
    expect(s.stock.value).toEqual({})
    expect(s.canWrite.value).toBe(true)
  })

  it('applies changes optimistically and saves debounced as one write', async () => {
    const { store, s } = await setup()
    const spy = vi.spyOn(store, 'saveStock')
    s.setQuantity('a', 3)
    s.setQuantity('a', 5)
    s.setNote('a', 'Kiste 2')
    expect(s.stock.value).toEqual({ a: 5 })
    await vi.advanceTimersByTimeAsync(STOCK_SAVE_DELAY_MS - 1)
    expect(spy).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(spy).toHaveBeenCalledTimes(1)
    expect((await store.loadStock()).data.stock).toEqual({ a: { quantity: 5, note: 'Kiste 2' } })
  })

  it('clamps quantities to non-negative integers and removes empty notes', async () => {
    const { store, s } = await setup()
    s.setQuantity('a', -4)
    expect(s.stock.value.a).toBe(0)
    s.setQuantity('a', 2.9)
    expect(s.stock.value.a).toBe(2)
    s.setQuantity('a', Number.NaN)
    expect(s.stock.value.a).toBe(0)
    s.setQuantity('a', 1)
    s.setNote('a', 'x')
    s.setNote('a', '  ')
    await s.flush()
    expect((await store.loadStock()).data.stock).toEqual({ a: { quantity: 1 } })
  })

  it('preserves unknown article ids from the file (F-07)', async () => {
    const { store, s } = await setup({
      stock: { schemaVersion: 1, stock: { alt: { quantity: 7, note: 'weg' } } }
    })
    s.setQuantity('neu', 1)
    await s.flush()
    expect((await store.loadStock()).data.stock).toEqual({
      alt: { quantity: 7, note: 'weg' },
      neu: { quantity: 1 }
    })
  })

  it('reloads, reapplies pending ops and retries on conflict', async () => {
    const { store, s } = await setup({
      stock: { schemaVersion: 1, stock: { a: { quantity: 1 } } }
    })
    s.setQuantity('a', 10)
    // someone else writes in between
    const other = await store.loadStock()
    await store.saveStock(
      { schemaVersion: 1, stock: { a: { quantity: 1 }, b: { quantity: 4 } } },
      other.etag
    )
    await s.flush()
    expect(s.error.value).toBeNull()
    expect((await store.loadStock()).data.stock).toEqual({
      a: { quantity: 10 },
      b: { quantity: 4 }
    })
    expect(s.entries.value.b.quantity).toBe(4)
  })

  it('sets error after 3 failed retries', async () => {
    const { store, s } = await setup()
    const spy = vi.spyOn(store, 'saveStock').mockRejectedValue(new ConflictError('x'))
    s.setQuantity('a', 1)
    await s.flush()
    expect(spy).toHaveBeenCalledTimes(4)
    expect(s.error.value).toBeInstanceOf(ConflictError)
  })

  it('removes an entry and saves like other changes', async () => {
    const { store, s } = await setup({
      stock: { schemaVersion: 1, stock: { a: { quantity: 1 }, b: { quantity: 2, note: 'x' } } }
    })
    s.removeEntry('a')
    expect(s.entries.value).toEqual({ b: { quantity: 2, note: 'x' } })
    await vi.advanceTimersByTimeAsync(STOCK_SAVE_DELAY_MS)
    expect((await store.loadStock()).data.stock).toEqual({ b: { quantity: 2, note: 'x' } })
  })

  it('ignores removal when read-only', async () => {
    const { s } = await setup({
      writable: false,
      stock: { schemaVersion: 1, stock: { a: { quantity: 1 } } }
    })
    s.removeEntry('a')
    expect(s.entries.value).toEqual({ a: { quantity: 1 } })
  })

  it('ignores changes when read-only', async () => {
    const { store, s } = await setup({ writable: false })
    const spy = vi.spyOn(store, 'saveStock')
    s.setQuantity('a', 1)
    await vi.advanceTimersByTimeAsync(STOCK_SAVE_DELAY_MS * 2)
    expect(s.canWrite.value).toBe(false)
    expect(s.stock.value).toEqual({})
    expect(spy).not.toHaveBeenCalled()
  })

  describe('changes by others', () => {
    it('reloads silently when someone else saves the file', async () => {
      const { store, s } = await setup({
        stock: { schemaVersion: 1, stock: { a: { quantity: 1 } } }
      })
      store.externalSaveStock({ schemaVersion: 1, stock: { a: { quantity: 9 } } })
      await vi.advanceTimersByTimeAsync(0)
      expect(s.stock.value).toEqual({ a: 9 })
      expect(s.loading.value).toBe(false)
    })

    it('keeps own unsaved changes on top of the new state and saves them without conflict', async () => {
      const { store, s } = await setup({
        stock: { schemaVersion: 1, stock: { a: { quantity: 1 }, b: { quantity: 1 } } }
      })
      s.setQuantity('b', 4)
      store.externalSaveStock({
        schemaVersion: 1,
        stock: { a: { quantity: 9 }, b: { quantity: 1 } }
      })
      await vi.advanceTimersByTimeAsync(0)
      expect(s.stock.value).toEqual({ a: 9, b: 4 })
      const spy = vi.spyOn(store, 'saveStock')
      await vi.advanceTimersByTimeAsync(STOCK_SAVE_DELAY_MS)
      expect(spy).toHaveBeenCalledTimes(1)
      expect(s.error.value).toBeNull()
      expect((await store.loadStock()).data.stock).toEqual({
        a: { quantity: 9 },
        b: { quantity: 4 }
      })
    })

    it('reloads when the tab becomes visible again', async () => {
      const { store, s } = await setup({
        stock: { schemaVersion: 1, stock: { a: { quantity: 1 } } }
      })
      // Änderung, deren Ereignis verpasst wurde
      await store.saveStock(
        { schemaVersion: 1, stock: { a: { quantity: 5 } } },
        (await store.loadStock()).etag
      )
      expect(s.stock.value).toEqual({ a: 1 })
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(0)
      expect(s.stock.value).toEqual({ a: 5 })
    })
  })
})
