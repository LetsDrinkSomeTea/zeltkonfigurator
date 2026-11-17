import { defineComponent, h } from 'vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { flushPromises } from '@vue/test-utils'
import InventoryView from '../../../src/views/InventoryView.vue'
import { storeKey } from '../../../src/composables/useStore'
import { MemoryDataStore } from '../../../src/storage/MemoryDataStore'
import type { DataStore } from '../../../src/storage/DataStore'
import { STOCK_SAVE_DELAY_MS } from '../../../src/composables/useStock'
import { catalog } from '../../../src/domain/catalog'
import type { StockFile } from '../../../src/domain/types'
import { createTestRouter } from './support'

async function mountView(store: DataStore, route = '/bestand') {
  const Host = defineComponent({ render: () => h(InventoryView) })
  const router = createTestRouter()
  await router.push(route)
  await router.isReady()
  const wrapper = mount(Host, {
    global: { plugins: [...defaultPlugins(), router], provide: { [storeKey as symbol]: store } }
  })
  await flushPromises()
  return wrapper
}

const first = catalog.articles[0]

describe('InventoryView', () => {
  it('renders all six groups with counts', async () => {
    const wrapper = await mountView(new MemoryDataStore())
    const headings = wrapper.findAll('h2').map((h) => h.text())
    expect(headings).toHaveLength(6)
    expect(headings[0]).toContain('Dächer und Planen')
    expect(headings[1]).toContain('Seitenwand')
    expect(headings[2]).toContain('Stangen und Gestänge')
    expect(headings[3]).toContain('Heringe und Abspannung')
    expect(headings[4]).toContain('Kleinteile')
    expect(headings[5]).toContain('Bodenplanen')
    const n = catalog.articles.filter((a) => a.category === 'dach').length
    expect(headings[0]).toContain(`(${n})`)
  })

  it('filters by search and shows no-match message', async () => {
    const wrapper = await mountView(new MemoryDataStore())
    await wrapper.find('#zk-inventory-search').setValue('kohtenblatt')
    expect(wrapper.findAll('h2')).toHaveLength(1)
    await wrapper.find('#zk-inventory-search').setValue('Bodenplanen')
    expect(wrapper.findAll('h2')).toHaveLength(1)
    await wrapper.find('#zk-inventory-search').setValue('xyzxyz')
    expect(wrapper.findAll('h2')).toHaveLength(0)
    expect(wrapper.text()).toContain('keine Treffer')
  })

  it('persists quantity changes', async () => {
    const store = new MemoryDataStore()
    const wrapper = await mountView(store)
    const input = wrapper.find<HTMLInputElement>(`#zk-qty-${first.id}`)
    await input.setValue('7')
    await input.trigger('change')
    wrapper.unmount()
    await flushPromises()
    expect((await store.loadStock()).data.stock[first.id].quantity).toBe(7)
  })

  it('increments and decrements with buttons', async () => {
    const store = new MemoryDataStore({
      stock: { schemaVersion: 1, stock: { [first.id]: { quantity: 2 } } }
    })
    const wrapper = await mountView(store)
    await wrapper.find(`button[aria-label^="${first.name}: eins mehr"]`).trigger('click')
    await wrapper.find(`button[aria-label^="${first.name}: eins mehr"]`).trigger('click')
    await wrapper.find(`button[aria-label^="${first.name}: eins weniger"]`).trigger('click')
    expect(wrapper.find<HTMLInputElement>(`#zk-qty-${first.id}`).element.value).toBe('3')
    wrapper.unmount()
    await flushPromises()
    expect((await store.loadStock()).data.stock[first.id].quantity).toBe(3)
  })

  it('labels quantity and note fields with the article name', async () => {
    const wrapper = await mountView(new MemoryDataStore())
    expect(wrapper.find(`label[for="zk-qty-${first.id}"]`).text()).toBe(`${first.name}: Stückzahl`)
    await wrapper.find(`button[aria-label="${first.name}: Notiz bearbeiten"]`).trigger('click')
    expect(wrapper.find(`label[for="zk-note-${first.id}"]`).text()).toBe(`${first.name}: Notiz`)
  })

  it('persists notes', async () => {
    const store = new MemoryDataStore()
    const wrapper = await mountView(store)
    await wrapper.find(`button[aria-label="${first.name}: Notiz bearbeiten"]`).trigger('click')
    const input = wrapper.find(`#zk-note-${first.id}`)
    await input.setValue('im Keller')
    await input.trigger('change')
    wrapper.unmount()
    await flushPromises()
    expect((await store.loadStock()).data.stock[first.id].note).toBe('im Keller')
  })

  it('is read-only without write access', async () => {
    const store = new MemoryDataStore({
      writable: false,
      stock: { schemaVersion: 1, stock: { [first.id]: { quantity: 4, note: 'oben' } } }
    })
    const wrapper = await mountView(store)
    expect(wrapper.find('input[type="number"]').exists()).toBe(false)
    expect(wrapper.find('li input').exists()).toBe(false)
    expect(wrapper.find('li button').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Entfernen')
    expect(wrapper.text()).toContain('oben')
  })

  it('shows unknown ids and keeps them on save', async () => {
    const store = new MemoryDataStore({
      stock: { schemaVersion: 1, stock: { 'alt-artikel': { quantity: 5, note: 'weg' } } }
    })
    const wrapper = await mountView(store)
    expect(wrapper.text()).toContain('Unbekannte Artikel')
    expect(wrapper.text()).toContain('alt-artikel')
    const input = wrapper.find(`#zk-qty-${first.id}`)
    await input.setValue('1')
    await input.trigger('change')
    wrapper.unmount()
    await flushPromises()
    const saved: StockFile = (await store.loadStock()).data
    expect(saved.stock['alt-artikel']).toEqual({ quantity: 5, note: 'weg' })
  })

  it('shows the note as a button with placeholder and opens the field on click', async () => {
    const store = new MemoryDataStore({
      stock: { schemaVersion: 1, stock: { [first.id]: { quantity: 1, note: 'oben' } } }
    })
    const wrapper = await mountView(store)
    expect(wrapper.find(`button[aria-label="${first.name}: Notiz bearbeiten"]`).text()).toBe('oben')
    expect(wrapper.text()).toContain('Notiz hinzufügen')
    expect(wrapper.find(`#zk-note-${first.id}`).exists()).toBe(false)
    await wrapper.find(`button[aria-label="${first.name}: Notiz bearbeiten"]`).trigger('click')
    expect(wrapper.find(`#zk-note-${first.id}`).exists()).toBe(true)
  })

  it('discards a note on Escape', async () => {
    const store = new MemoryDataStore()
    const wrapper = await mountView(store)
    await wrapper.find(`button[aria-label="${first.name}: Notiz bearbeiten"]`).trigger('click')
    const input = wrapper.find(`#zk-note-${first.id}`)
    // Nur tippen, kein change-Ereignis (das löst der Browser erst beim Verlassen aus).
    ;(input.element as HTMLInputElement).value = 'verworfen'
    await input.trigger('input')
    await input.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find(`#zk-note-${first.id}`).exists()).toBe(false)
    wrapper.unmount()
    await flushPromises()
    expect((await store.loadStock()).data.stock[first.id]).toBeUndefined()
  })

  it('saves a note on Enter and closes the field', async () => {
    const store = new MemoryDataStore()
    const wrapper = await mountView(store)
    await wrapper.find(`button[aria-label="${first.name}: Notiz bearbeiten"]`).trigger('click')
    const input = wrapper.find<HTMLInputElement>(`#zk-note-${first.id}`)
    await input.setValue('per Enter')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.find(`#zk-note-${first.id}`).exists()).toBe(false)
    wrapper.unmount()
    await flushPromises()
    expect((await store.loadStock()).data.stock[first.id].note).toBe('per Enter')
  })

  describe('Nur vorhandene', () => {
    afterEach(() => localStorage.clear())

    it('hides articles with quantity 0 and remembers the setting', async () => {
      localStorage.clear()
      const store = new MemoryDataStore({
        stock: { schemaVersion: 1, stock: { [first.id]: { quantity: 2 } } }
      })
      const wrapper = await mountView(store)
      expect(wrapper.findAll('h2')).toHaveLength(6)
      await wrapper.find('.zk-filter button[role="switch"]').trigger('click')
      expect(wrapper.findAll('li.zk-row')).toHaveLength(1)
      await wrapper.find('#zk-inventory-search').setValue('xyzxyz')
      expect(wrapper.text()).toContain('keine Treffer')
      wrapper.unmount()
      const again = await mountView(store)
      expect(again.find('.zk-filter button[role="switch"]').attributes('aria-checked')).toBe('true')
      expect(again.findAll('li.zk-row')).toHaveLength(1)
    })

    it('shows no-match message when nothing is available', async () => {
      const wrapper = await mountView(new MemoryDataStore())
      await wrapper.find('.zk-filter button[role="switch"]').trigger('click')
      expect(wrapper.findAll('h2')).toHaveLength(0)
      expect(wrapper.text()).toContain('keine Treffer')
    })
  })

  it('removes unknown entries after a second click', async () => {
    const store = new MemoryDataStore({
      stock: { schemaVersion: 1, stock: { 'alt-artikel': { quantity: 5 } } }
    })
    const wrapper = await mountView(store)
    await wrapper.find('button[aria-label="alt-artikel entfernen"]').trigger('click')
    expect(wrapper.text()).toContain('Wirklich entfernen?')
    expect((await store.loadStock()).data.stock['alt-artikel']).toBeDefined()
    await wrapper.find('button[aria-label="alt-artikel wirklich entfernen?"]').trigger('click')
    expect(wrapper.text()).not.toContain('alt-artikel')
    wrapper.unmount()
    await flushPromises()
    expect((await store.loadStock()).data.stock['alt-artikel']).toBeUndefined()
  })

  it('resets the removal confirmation on blur and Escape', async () => {
    const store = new MemoryDataStore({
      stock: { schemaVersion: 1, stock: { 'alt-artikel': { quantity: 5 } } }
    })
    const wrapper = await mountView(store)
    const btn = () => wrapper.find('button.zk-remove')
    await btn().trigger('click')
    await btn().trigger('blur')
    expect(wrapper.text()).not.toContain('Wirklich entfernen?')
    await btn().trigger('click')
    await btn().trigger('keydown', { key: 'Escape' })
    expect(wrapper.text()).not.toContain('Wirklich entfernen?')
  })

  it('shows save errors', async () => {
    const store = new MemoryDataStore()
    store.saveStock = () => Promise.reject(new Error('speichern kaputt'))
    const wrapper = await mountView(store)
    vi.useFakeTimers()
    try {
      const input = wrapper.find(`#zk-qty-${first.id}`)
      await input.setValue('2')
      await input.trigger('change')
      await vi.advanceTimersByTimeAsync(STOCK_SAVE_DELAY_MS)
    } finally {
      vi.useRealTimers()
    }
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toContain('speichern kaputt')
  })

  it('shows an error message', async () => {
    const store = new MemoryDataStore()
    store.loadStock = () => Promise.reject(new Error('kaputt'))
    const wrapper = await mountView(store)
    expect(wrapper.find('[role="alert"]').text()).toContain('kaputt')
  })
})
