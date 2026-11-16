import { defineComponent, h } from 'vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { flushPromises } from '@vue/test-utils'
import InventoryView from '../../../src/views/InventoryView.vue'
import { storeKey } from '../../../src/composables/useStore'
import { MemoryDataStore } from '../../../src/storage/MemoryDataStore'
import type { DataStore } from '../../../src/storage/DataStore'
import { catalog } from '../../../src/domain/catalog'
import type { StockFile } from '../../../src/domain/types'

async function mountView(store: DataStore) {
  const Host = defineComponent({ render: () => h(InventoryView) })
  const wrapper = mount(Host, {
    global: { plugins: [...defaultPlugins()], provide: { [storeKey as symbol]: store } }
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
    await wrapper.find('input[type="search"]').setValue('kohtenblatt')
    expect(wrapper.findAll('h2')).toHaveLength(1)
    await wrapper.find('input[type="search"]').setValue('Bodenplanen')
    expect(wrapper.findAll('h2')).toHaveLength(1)
    await wrapper.find('input[type="search"]').setValue('xyzxyz')
    expect(wrapper.findAll('h2')).toHaveLength(0)
    expect(wrapper.text()).toContain('keine Treffer')
  })

  it('persists quantity changes', async () => {
    const store = new MemoryDataStore()
    const wrapper = await mountView(store)
    const input = wrapper.find<HTMLInputElement>(`input[aria-label^="${first.name}: Stückzahl"]`)
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
    expect(
      wrapper.find<HTMLInputElement>(`input[aria-label^="${first.name}: Stückzahl"]`).element.value
    ).toBe('3')
    wrapper.unmount()
    await flushPromises()
    expect((await store.loadStock()).data.stock[first.id].quantity).toBe(3)
  })

  it('persists notes', async () => {
    const store = new MemoryDataStore()
    const wrapper = await mountView(store)
    const input = wrapper.find(`input[aria-label^="${first.name}: Notiz"]`)
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
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.text()).toContain('Nur Lesezugriff')
    expect(wrapper.text()).toContain('oben')
  })

  it('shows unknown ids and keeps them on save', async () => {
    const store = new MemoryDataStore({
      stock: { schemaVersion: 1, stock: { 'alt-artikel': { quantity: 5, note: 'weg' } } }
    })
    const wrapper = await mountView(store)
    expect(wrapper.text()).toContain('Unbekannte Artikel')
    expect(wrapper.text()).toContain('alt-artikel')
    const input = wrapper.find(`input[aria-label^="${first.name}: Stückzahl"]`)
    await input.setValue('1')
    await input.trigger('change')
    wrapper.unmount()
    await flushPromises()
    const saved: StockFile = (await store.loadStock()).data
    expect(saved.stock['alt-artikel']).toEqual({ quantity: 5, note: 'weg' })
  })

  it('shows an error message', async () => {
    const store = new MemoryDataStore()
    store.loadStock = () => Promise.reject(new Error('kaputt'))
    const wrapper = await mountView(store)
    expect(wrapper.find('[role="alert"]').text()).toContain('kaputt')
  })
})
