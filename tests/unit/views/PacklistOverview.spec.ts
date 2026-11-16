import { flushPromises } from '@vue/test-utils'
import PacklistOverview from '../../../src/views/PacklistOverview.vue'
import { fullStock, listFor, mountWithStore, storeWith, tentOf } from './support'

function setup(writable = true) {
  const stock = fullStock(100)
  const list = listFor([tentOf('kohte'), tentOf('jurte')], stock, {
    date: '2026-07-04'
  })
  list.items[0].checked = true
  const store = storeWith(stock, [list], writable)
  return { store, list }
}

describe('PacklistOverview', () => {
  it('lists packlists with date, tent count and progress', async () => {
    const { store, list } = setup()
    const { wrapper } = await mountWithStore(PacklistOverview, store)
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('Sommerlager')
    expect(text).toContain('04.07.2026')
    expect(text).toContain('2 Zelte')
    expect(text).toContain(`1 von ${list.items.length} abgehakt`)
    const progress = wrapper.findComponent({ name: 'OcProgress' })
    expect(progress.props('max')).toBe(list.items.length)
    expect(progress.props('value')).toBe(1)
  })

  it('shows an empty state', async () => {
    const { wrapper } = await mountWithStore(PacklistOverview, storeWith({}, []))
    await flushPromises()
    expect(wrapper.text()).toContain('Es gibt noch keine Packlisten')
  })

  it('creates a packlist and navigates to the editor', async () => {
    const store = storeWith(fullStock(1), [])
    const { wrapper, router } = await mountWithStore(PacklistOverview, store)
    await flushPromises()
    await wrapper.find('input#zk-new-list-name').setValue('Pfingstlager')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    const summaries = await store.listPacklists()
    expect(summaries.map((s) => s.name)).toEqual(['Pfingstlager'])
    expect(router.currentRoute.value.name).toBe('zeltkonfigurator-liste')
    expect(router.currentRoute.value.params.id).toBe(summaries[0].id)
  })

  it('does not create a packlist without a name', async () => {
    const store = storeWith({}, [])
    const { wrapper } = await mountWithStore(PacklistOverview, store)
    await flushPromises()
    await wrapper.find('input#zk-new-list-name').setValue('   ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(await store.listPacklists()).toHaveLength(0)
  })

  it('duplicates a packlist', async () => {
    const { store } = setup()
    const { wrapper } = await mountWithStore(PacklistOverview, store)
    await flushPromises()
    const button = wrapper.findAll('button').find((b) => b.text() === 'Duplizieren')!
    await button.trigger('click')
    await flushPromises()
    const names = (await store.listPacklists()).map((s) => s.name).sort()
    expect(names).toEqual(['Sommerlager', 'Sommerlager (Kopie)'])
  })

  it('deletes a packlist only after confirmation', async () => {
    const { store } = setup()
    const { wrapper } = await mountWithStore(PacklistOverview, store)
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Löschen')!
      .trigger('click')
    expect(await store.listPacklists()).toHaveLength(1)
    expect(wrapper.text()).toContain('Packliste wirklich löschen?')
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Ja, löschen')!
      .trigger('click')
    await flushPromises()
    expect(await store.listPacklists()).toHaveLength(0)
    expect(wrapper.text()).toContain('Es gibt noch keine Packlisten')
  })

  it('hides write actions when read-only', async () => {
    const { store } = setup(false)
    const { wrapper } = await mountWithStore(PacklistOverview, store)
    await flushPromises()
    expect(wrapper.text()).toContain('Sommerlager')
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.findAll('button')).toHaveLength(0)
  })
})
