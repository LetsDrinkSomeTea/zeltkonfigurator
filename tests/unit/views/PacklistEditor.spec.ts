import { flushPromises, type VueWrapper } from '@vue/test-utils'
import PacklistEditor from '../../../src/views/PacklistEditor.vue'
import type { PacklistFile, Stock, TentConfig } from '../../../src/domain/types'
import { choose, fullStock, listFor, mountWithStore, ocSelect, storeWith, tentOf } from './support'

async function open(
  tents: TentConfig[],
  stock: Stock,
  options: { writable?: boolean; listStock?: Stock; query?: string; unknownType?: boolean } = {}
) {
  const list = listFor(tents, options.listStock ?? stock)
  if (options.unknownType) {
    list.tents = list.tents.map((t) => ({ ...t, typeId: 'gibt-es-nicht' }))
  }
  const store = storeWith(stock, [list], options.writable ?? true)
  const mounted = await mountWithStore(PacklistEditor, store, {
    route: `/listen/p1${options.query ?? ''}`
  })
  await flushPromises()
  return { ...mounted, store, list }
}

function select(wrapper: VueWrapper, suffix: string) {
  return ocSelect(wrapper, suffix)
}

async function savedList(store: ReturnType<typeof storeWith>): Promise<PacklistFile> {
  return (await store.loadPacklist('p1')).data
}

describe('PacklistEditor status banner', () => {
  it('shows "Alles vorhanden" with enough stock', async () => {
    const { wrapper } = await open([tentOf('kohte')], fullStock(100))
    expect(wrapper.find('.zk-banner').text()).toContain('Alles vorhanden')
    expect(wrapper.find('.zk-banner-ok').exists()).toBe(true)
  })

  it('shows "Mit Ausweichmaterial machbar" when substituting', async () => {
    const stock = fullStock(100, {
      'superbahn-doppel-fenster': 0,
      'superbahn-einzel-fenster': 0
    })
    const { wrapper } = await open(
      [tentOf('jurte', { wallId: 'hoch', buildId: 'super', finish: 'fenster' })],
      stock
    )
    expect(wrapper.find('.zk-banner').text()).toContain('Mit Ausweichmaterial machbar')
    expect(wrapper.find('.zk-banner-ausweichmaterial').exists()).toBe(true)
  })

  it('shows "Es fehlt Material" when stock is missing', async () => {
    const { wrapper } = await open([tentOf('jurte')], fullStock(0))
    expect(wrapper.find('.zk-banner').text()).toContain('Es fehlt Material')
    expect(wrapper.find('.zk-banner-fehlt').exists()).toBe(true)
  })

  it('shows a neutral hint for an empty list', async () => {
    const { wrapper } = await open([], fullStock(100))
    expect(wrapper.find('.zk-banner-leer').exists()).toBe(true)
    expect(wrapper.find('.zk-banner').text()).toContain('Noch keine Zelte')
  })
})

describe('PacklistEditor stale notice', () => {
  it('offers recalculation when stock changed', async () => {
    const { wrapper, store } = await open([tentOf('kohte')], fullStock(100), {
      listStock: fullStock(50)
    })
    expect(wrapper.text()).toContain('Bestand oder App haben sich geändert')
    const button = wrapper.findAll('button').find((b) => b.text() === 'Neu berechnen')!
    await button.trigger('click')
    await flushPromises()
    expect(wrapper.text()).not.toContain('Bestand oder App haben sich geändert')
    await wrapper.unmount()
    await flushPromises()
    expect((await savedList(store)).fingerprint).toBeTruthy()
  })

  it('shows no notice for a current list', async () => {
    const { wrapper } = await open([tentOf('kohte')], fullStock(100))
    expect(wrapper.text()).not.toContain('Bestand oder App haben sich geändert')
  })
})

describe('PacklistEditor tabs', () => {
  it('uses accessible tabs and keeps the selection in the query', async () => {
    const { wrapper, router } = await open([tentOf('kohte')], fullStock(100))
    expect(wrapper.find('[role="tablist"]').exists()).toBe(true)
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs.map((t) => t.text())).toEqual(['Zelte', 'Material pro Zelt', 'Packliste'])
    expect(tabs[0].attributes('aria-selected')).toBe('true')
    expect(wrapper.find('[role="tabpanel"]').exists()).toBe(true)

    await tabs[0].trigger('keydown', { key: 'ArrowRight' })
    await flushPromises()
    expect(router.currentRoute.value.query.tab).toBe('material')
    expect(wrapper.findAll('[role="tab"]')[1].attributes('aria-selected')).toBe('true')

    await wrapper.findAll('[role="tab"]')[2].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.tab).toBe('packliste')
  })

  it('opens the tab from the query', async () => {
    const { wrapper } = await open([tentOf('kohte')], fullStock(100), { query: '?tab=material' })
    expect(wrapper.findAll('[role="tab"]')[1].attributes('aria-selected')).toBe('true')
    expect(wrapper.text()).toContain('Gesamt über alle Zelte')
  })
})

describe('PacklistEditor configurator', () => {
  it('adds a Jurte with roof and wall selects', async () => {
    const { wrapper, store } = await open([], fullStock(100))
    await choose(ocSelect(wrapper, 'zk-add-tent-type'), 'jurte')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(select(wrapper, 'roof')).toBeDefined()
    expect(select(wrapper, 'wall')).toBeDefined()
    expect(select(wrapper, 'build')).toBeUndefined()
    expect(select(wrapper, 'finish')).toBeUndefined()
    await wrapper.unmount()
    await flushPromises()
    expect((await savedList(store)).tents.map((t) => t.typeId)).toEqual(['jurte'])
  })

  it('shows build and finish selects for a high wall', async () => {
    const { wrapper } = await open([tentOf('jurte')], fullStock(100))
    await choose(select(wrapper, 'wall'), 'hoch')
    await flushPromises()
    expect(select(wrapper, 'build')).toBeDefined()
    expect(select(wrapper, 'finish')).toBeDefined()
    // Bauart ohne Ausführungs-Lage: keine Ausführung
    await choose(select(wrapper, 'build'), 'normal+streifen')
    await flushPromises()
    expect(select(wrapper, 'finish')).toBeDefined()
    await choose(select(wrapper, 'wall'), 'normal')
    await flushPromises()
    expect(select(wrapper, 'build')).toBeUndefined()
    expect(select(wrapper, 'finish')).toBeUndefined()
  })

  it('shows no roof select for a Kohte', async () => {
    const { wrapper } = await open([tentOf('kohte')], fullStock(100))
    expect(select(wrapper, 'roof')).toBeUndefined()
    expect(select(wrapper, 'wall')).toBeDefined()
  })

  it('writes option changes to the list', async () => {
    const { wrapper, store } = await open([tentOf('jurte')], fullStock(100))
    await choose(select(wrapper, 'roof'), 'kohtenblaetter')
    await choose(select(wrapper, 'wall'), 'hoch')
    await choose(select(wrapper, 'finish'), 'gaze')
    await wrapper.find('input[id$="-label"]').setValue('Küche')
    await flushPromises()
    await wrapper.unmount()
    await flushPromises()
    const [tent] = (await savedList(store)).tents
    expect(tent).toMatchObject({
      roofId: 'kohtenblaetter',
      wallId: 'hoch',
      buildId: 'super',
      finish: 'gaze',
      label: 'Küche'
    })
  })

  it('moves, duplicates and removes tents', async () => {
    const { wrapper, store } = await open([tentOf('kohte'), tentOf('jurte')], fullStock(100))
    const buttons = () => wrapper.findAll('article')
    expect(buttons()[0].find('button[aria-label="Nach oben"]').attributes('disabled')).toBeDefined()
    expect(
      buttons()[1].find('button[aria-label="Nach unten"]').attributes('disabled')
    ).toBeDefined()

    await buttons()[1].find('button[aria-label="Nach oben"]').trigger('click')
    expect(wrapper.findAll('article h3').map((h) => h.text())).toEqual(['1. Jurte', '2. Kohte'])

    await buttons()[0]
      .findAll('button')
      .find((b) => b.text() === 'Duplizieren')!
      .trigger('click')
    expect(wrapper.findAll('article')).toHaveLength(3)

    await buttons()[2]
      .findAll('button')
      .find((b) => b.text() === 'Entfernen')!
      .trigger('click')
    expect(wrapper.findAll('article')).toHaveLength(2)
    await wrapper.unmount()
    await flushPromises()
    expect((await savedList(store)).tents.map((t) => t.typeId)).toEqual(['jurte', 'jurte'])
  })

  it('reorders the finish order', async () => {
    const { wrapper, store } = await open([tentOf('kohte')], fullStock(100))
    expect(wrapper.text()).toContain('Ausweichreihenfolge der Ausführungen')
    await wrapper.find('button[aria-label="Blanko nach oben"]').trigger('click')
    await wrapper.unmount()
    await flushPromises()
    expect((await savedList(store)).finishOrder).toEqual(['gaze', 'blanko', 'fenster'])
  })

  it('shows deviations at the tent', async () => {
    const stock = fullStock(100, {
      'superbahn-doppel-fenster': 0,
      'superbahn-einzel-fenster': 0
    })
    const { wrapper, list } = await open(
      [tentOf('jurte', { wallId: 'hoch', buildId: 'super', finish: 'fenster' })],
      stock
    )
    expect(list.deviations.length).toBeGreaterThan(0)
    const lines = wrapper.findAll('.zk-deviations li').map((li) => li.text())
    expect(lines.length).toBe(list.deviations.length)
    expect(lines.some((l) => /statt Superbahn Fenster/.test(l))).toBe(true)
  })

  it('shows a notice and only the remove button for unknown tent types', async () => {
    const { wrapper } = await open([tentOf('kohte')], fullStock(100), { unknownType: true })
    expect(wrapper.text()).toContain('Dieser Zelttyp ist nicht mehr im Katalog')
    const buttons = wrapper.findAll('article button')
    expect(buttons.map((b) => b.text())).toEqual(['Entfernen'])
    expect(wrapper.find('article .vs__dropdown-toggle').exists()).toBe(false)
  })

  it('hides all controls in read-only mode', async () => {
    const { wrapper } = await open([tentOf('jurte')], fullStock(100), { writable: false })
    expect(ocSelect(wrapper, 'zk-add-tent-type')).toBeUndefined()
    expect(wrapper.findAll('article button:not(.vs__clear)')).toHaveLength(0)
    expect(wrapper.find('button[aria-label="Blanko nach oben"]').exists()).toBe(false)
    expect(wrapper.find('input#zk-list-name').exists()).toBe(false)
    expect(wrapper.text()).toContain('Sommerlager')
    const selects = wrapper.findAllComponents({ name: 'OcSelect' })
    expect(selects.length).toBeGreaterThan(0)
    expect(selects.every((s) => s.props('disabled'))).toBe(true)
    expect(wrapper.find('input[id$="-label"]').attributes('disabled')).toBeDefined()
  })

  it('shows an error for an unknown list', async () => {
    const store = storeWith({}, [])
    const { wrapper } = await mountWithStore(PacklistEditor, store, { route: '/listen/p1' })
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  })
})
