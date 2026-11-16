import { defineComponent, h } from 'vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import InventoryView from '../../../src/views/InventoryView.vue'
import { storeKey } from '../../../src/composables/useStore'
import { MemoryDataStore } from '../../../src/storage/MemoryDataStore'
import { choose, createTestRouter, ocSelect } from './support'

async function mountView(store: MemoryDataStore, tab = 'material') {
  const Host = defineComponent({ render: () => h(InventoryView) })
  const router = createTestRouter()
  await router.push(`/bestand?tab=${tab}`)
  await router.isReady()
  const wrapper = mount(Host, {
    global: {
      plugins: [...defaultPlugins(), router],
      stubs: { OcIcon: true },
      provide: { [storeKey as symbol]: store }
    }
  })
  await flushPromises()
  return { wrapper, router }
}

/** Wählt in einem OcSelect die Option mit der Kennung `value` (wie im Browser: ganzes Objekt). */
async function pick(wrapper: VueWrapper, id: string, value: string) {
  await choose(ocSelect(wrapper, id), value)
  await flushPromises()
}

const button = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').find((b) => b.text() === text)!

async function saved(store: MemoryDataStore, wrapper: VueWrapper) {
  wrapper.unmount()
  await flushPromises()
  return (await store.loadStock()).data
}

describe('Materialliste: Material', () => {
  it('legt Material in einer neuen Kategorie mit Anzahl an', async () => {
    const store = new MemoryDataStore()
    const { wrapper } = await mountView(store)
    await button(wrapper, 'Material hinzufügen').trigger('click')
    const form = wrapper.find('form.zk-article-form')
    await form.find('input[id$="-name"]').setValue('Bräter')
    await pick(wrapper, 'category', '__neu__')
    await wrapper.find('input[id$="-new-category"]').setValue('Küche')
    await wrapper.find('input[id$="-quantity"]').setValue('2')
    await form.trigger('submit')
    await flushPromises()
    expect(wrapper.findAll('h2').map((h) => h.text())).toContainEqual(
      expect.stringContaining('Küche')
    )
    const file = await saved(store, wrapper)
    expect(file.catalog?.categories).toContainEqual({ id: 'kueche', name: 'Küche' })
    expect(file.catalog?.articles).toContainEqual({
      id: 'braeter',
      name: 'Bräter',
      category: 'kueche'
    })
    expect(file.stock.braeter).toEqual({ quantity: 2 })
  })

  it('verlangt einen Namen', async () => {
    const { wrapper } = await mountView(new MemoryDataStore())
    await button(wrapper, 'Material hinzufügen').trigger('click')
    await wrapper.find('form.zk-article-form').trigger('submit')
    // Die Fehlermeldung des Eingabefelds erscheint erst nach einem Zeitgeber.
    await vi.waitFor(() => expect(wrapper.text()).toContain('Bitte einen Namen eingeben'))
  })

  it('benennt Material um und lässt verwendetes Material nicht löschen', async () => {
    const store = new MemoryDataStore()
    const { wrapper } = await mountView(store)
    await wrapper.find('button[aria-label="Kohtenblatt bearbeiten"]').trigger('click')
    await wrapper.find('form.zk-article-form input[id$="-name"]').setValue('Kohtenblatt schwarz')
    await wrapper.find('form.zk-article-form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Kohtenblatt schwarz')
    await wrapper.find('button[aria-label="Kohtenblatt schwarz löschen"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alertdialog"]').text()).toContain('wird noch verwendet in')
    const file = await saved(store, wrapper)
    expect(file.catalog?.articles.find((a) => a.id === 'kohtenblatt')?.name).toBe(
      'Kohtenblatt schwarz'
    )
  })

  it('löscht unbenutztes Material nach Rückfrage; Wandmaterial ist nicht löschbar', async () => {
    const store = new MemoryDataStore()
    const { wrapper } = await mountView(store)
    expect(wrapper.find('button[aria-label^="Normalbahn"][aria-label$="löschen"]').exists()).toBe(
      false
    )
    await wrapper.find('button[aria-label="Theaterjurtenspinne löschen"]').trigger('click')
    await flushPromises()
    // Theaterjurtenspinne ist im Dach „Theaterjurte“ verwendet
    expect(wrapper.find('[role="alertdialog"]').text()).toContain('Theaterjurte')
    await wrapper.find('.zk-confirm-ok').trigger('click')
    await wrapper.find('button[aria-label="Bodenplane rund (Sudan) löschen"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alertdialog"]').text()).toContain('wird noch verwendet in')
    await wrapper.find('.zk-confirm-ok').trigger('click')
    // eigenes Material lässt sich löschen
    await button(wrapper, 'Material hinzufügen').trigger('click')
    await wrapper.find('form.zk-article-form input[id$="-name"]').setValue('Testteil')
    await wrapper.find('form.zk-article-form').trigger('submit')
    await flushPromises()
    await wrapper.find('button[aria-label="Testteil löschen"]').trigger('click')
    await flushPromises()
    await wrapper.find('.zk-confirm-ok').trigger('click')
    await flushPromises()
    expect(wrapper.text()).not.toContain('Testteil')
    const file = await saved(store, wrapper)
    expect(file.catalog?.articles.some((a) => a.id === 'testteil')).toBe(false)
  })

  it('verwaltet Kategorien', async () => {
    const store = new MemoryDataStore()
    const { wrapper } = await mountView(store)
    await wrapper.find('#zk-category-new').setValue('Werkzeug')
    await wrapper.find('details.zk-categories form').trigger('submit')
    await flushPromises()
    const rename = wrapper.find<HTMLInputElement>('#zk-category-kleinteil')
    await rename.setValue('Kleinkram')
    await rename.trigger('change')
    await flushPromises()
    const file = await saved(store, wrapper)
    expect(file.catalog?.categories).toContainEqual({ id: 'werkzeug', name: 'Werkzeug' })
    expect(file.catalog?.categories).toContainEqual({ id: 'kleinteil', name: 'Kleinkram' })
  })
})

describe('Materialliste: Zelttypen', () => {
  it('legt einen Zelttyp aus zwei Dächern an', async () => {
    const store = new MemoryDataStore()
    const { wrapper } = await mountView(store, 'zelttypen')
    await button(wrapper, 'Neuer Zelttyp').trigger('click')
    const form = wrapper.find('form.zk-editor')
    await form.find('input[id$="-name"]').setValue('Doppeljurte')
    await pick(wrapper, ocSelect(wrapper, 'module-0')!.props('id') as string, 'jurte')
    await button(wrapper, 'Dach hinzufügen').trigger('click')
    await form.find('input[id$="-segments"]').setValue('20')
    const hoch = wrapper
      .findAllComponents({ name: 'OcCheckbox' })
      .find((c) => String(c.props('label')).startsWith('Hoch'))!
    hoch.vm.$emit('update:modelValue', true)
    await flushPromises()
    await form.trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Doppeljurte')
    expect(wrapper.text()).toContain('2 × Jurte · 20 Wandsegmente')
    const file = await saved(store, wrapper)
    expect(file.catalog?.tentTypes.find((t) => t.id === 'doppeljurte')).toMatchObject({
      name: 'Doppeljurte',
      modules: [{ moduleId: 'jurte' }, { moduleId: 'jurte' }],
      wall: { segments: 20, options: ['keine', 'hoch'] }
    })
  })

  it('kopiert und löscht Zelttypen', async () => {
    const store = new MemoryDataStore()
    const { wrapper } = await mountView(store, 'zelttypen')
    await wrapper.find('button[aria-label="Jurte kopieren"]').trigger('click')
    await wrapper.find('form.zk-editor').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Jurte (Kopie)')
    await wrapper.find('button[aria-label="Jurte (Kopie) löschen"]').trigger('click')
    await wrapper.find('.zk-confirm-ok').trigger('click')
    await flushPromises()
    const file = await saved(store, wrapper)
    expect(file.catalog?.tentTypes.some((t) => t.name === 'Jurte (Kopie)')).toBe(false)
  })
})

describe('Materialliste: Dächer', () => {
  it('legt ein Dach mit Variante und Aufbau an; verwendete Dächer bleiben', async () => {
    const store = new MemoryDataStore()
    const { wrapper } = await mountView(store, 'daecher')
    await wrapper.find('button[aria-label="Jurte löschen"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alertdialog"]').text()).toContain('Zelttyp „Jurte“')
    await wrapper.find('.zk-confirm-ok').trigger('click')

    await button(wrapper, 'Neues Dach').trigger('click')
    const form = wrapper.find('form.zk-editor')
    await form.find('input[id$="-name"]').setValue('Pavillon')
    await form.find('input[id$="-roofs-0"]').setValue('Plane')
    await form.trigger('submit')
    await flushPromises()
    const file = await saved(store, wrapper)
    expect(file.catalog?.modules.find((m) => m.id === 'pavillon')).toMatchObject({
      name: 'Pavillon',
      roofs: [{ id: 'plane', label: 'Plane', parts: [] }],
      setups: [{ id: 'gestellt', label: 'Gestellt', parts: [] }]
    })
  })
})
