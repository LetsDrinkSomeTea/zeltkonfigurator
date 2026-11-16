import { flushPromises, type VueWrapper } from '@vue/test-utils'
import PacklistEditor from '../../../src/views/PacklistEditor.vue'
import type { PacklistFile, Stock, TentConfig } from '../../../src/domain/types'
import {
  bareTent,
  choose,
  expandTents,
  fullStock,
  listFor,
  mountWithStore,
  ocSelect,
  storeWith,
  tentOf
} from './support'

async function open(
  tents: TentConfig[],
  stock: Stock,
  options: {
    writable?: boolean
    listStock?: Stock
    query?: string
    unknownType?: boolean
    close?: () => void
  } = {}
) {
  const list = listFor(tents, options.listStock ?? stock)
  if (options.unknownType) {
    list.tents = list.tents.map((t) => ({ ...t, typeId: 'gibt-es-nicht' }))
  }
  const store = storeWith(stock, [list], options.writable ?? true)
  const mounted = await mountWithStore(PacklistEditor, store, {
    route: `/liste/p1.packliste${options.query ?? ''}`,
    close: options.close
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
  it('adds a Jurte in its default configuration, collapsed', async () => {
    const { wrapper, store } = await open([], fullStock(100))
    await choose(ocSelect(wrapper, 'zk-add-tent-type'), 'jurte')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('.zk-tent-summary').text()).toBe('Jurtendach · Hoch · Superbahn · Gaze')
    expect(select(wrapper, 'wall')).toBeUndefined()
    await wrapper.unmount()
    await flushPromises()
    expect((await savedList(store)).tents[0]).toMatchObject({
      typeId: 'jurte',
      wallId: 'hoch',
      buildId: 'super',
      finish: 'gaze'
    })
  })

  it('uses the default configuration of Kohte and Hochkohte', async () => {
    const { wrapper } = await open([tentOf('kohte'), tentOf('hochkohte')], fullStock(100))
    expect(wrapper.findAll('.zk-tent-summary').map((p) => p.text())).toEqual([
      '4 Kohtenblätter · Mit Erdstreifen',
      '4 Kohtenblätter · Normal'
    ])
  })

  it('shows the selects only after "Anpassen" and hides them again with "Fertig"', async () => {
    const { wrapper } = await open([tentOf('jurte')], fullStock(100))
    const toggle = () => wrapper.find('article button[aria-expanded]')
    expect(toggle().text()).toBe('Anpassen')
    expect(toggle().attributes('aria-expanded')).toBe('false')
    await toggle().trigger('click')
    expect(toggle().text()).toBe('Fertig')
    expect(select(wrapper, 'roof')).toBeDefined()
    expect(select(wrapper, 'wall')).toBeDefined()
    expect(select(wrapper, 'build')).toBeDefined()
    expect(select(wrapper, 'finish')).toBeDefined()
    await toggle().trigger('click')
    expect(select(wrapper, 'wall')).toBeUndefined()
  })

  it('shows build and finish selects only where they apply', async () => {
    const { wrapper } = await open([bareTent('jurte')], fullStock(100))
    await expandTents(wrapper)
    expect(select(wrapper, 'build')).toBeUndefined()
    expect(select(wrapper, 'finish')).toBeUndefined()
    await choose(select(wrapper, 'wall'), 'hoch')
    await flushPromises()
    expect(select(wrapper, 'build')).toBeDefined()
    expect(select(wrapper, 'finish')).toBeDefined()
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
    await expandTents(wrapper)
    expect(select(wrapper, 'roof')).toBeUndefined()
    expect(select(wrapper, 'wall')).toBeDefined()
  })

  it('writes option changes to the list and marks the tent as customised', async () => {
    const { wrapper, store } = await open([tentOf('jurte')], fullStock(100))
    expect(wrapper.find('.zk-tent-custom').exists()).toBe(false)
    await expandTents(wrapper)
    await choose(select(wrapper, 'roof'), 'kohtenblaetter')
    await choose(select(wrapper, 'finish'), 'fenster')
    await wrapper.find('input[id$="-label"]').setValue('Küche')
    await flushPromises()
    expect(wrapper.find('.zk-tent-summary').text()).toContain('6 Kohtenblätter · Hoch')
    expect(wrapper.find('.zk-tent-custom').exists()).toBe(true)
    await wrapper.unmount()
    await flushPromises()
    const [tent] = (await savedList(store)).tents
    expect(tent).toMatchObject({
      roofId: 'kohtenblaetter',
      wallId: 'hoch',
      buildId: 'super',
      finish: 'fenster',
      label: 'Küche'
    })
  })

  it('resets a tent to its default configuration', async () => {
    const { wrapper, store } = await open([bareTent('jurte', { label: 'Küche' })], fullStock(100))
    await expandTents(wrapper)
    const reset = () => wrapper.findAll('article button').find((b) => b.text() === 'Standard')!
    await reset().trigger('click')
    await flushPromises()
    expect(wrapper.find('.zk-tent-custom').exists()).toBe(false)
    expect(reset().attributes('disabled')).toBeDefined()
    await wrapper.unmount()
    await flushPromises()
    expect((await savedList(store)).tents[0]).toMatchObject({
      wallId: 'hoch',
      buildId: 'super',
      finish: 'gaze',
      label: 'Küche'
    })
  })

  it('moves, duplicates and removes tents', async () => {
    const { wrapper, store } = await open([tentOf('kohte'), tentOf('jurte')], fullStock(100))
    await expandTents(wrapper)
    const cards = () => wrapper.findAll('article')
    expect(cards()[0].find('button[aria-label="Nach oben"]').attributes('disabled')).toBeDefined()
    expect(cards()[1].find('button[aria-label="Nach unten"]').attributes('disabled')).toBeDefined()

    await cards()[1].find('button[aria-label="Nach oben"]').trigger('click')
    expect(wrapper.findAll('article h3').map((h) => h.text())).toEqual(['1. Jurte', '2. Kohte'])

    await cards()[0]
      .findAll('button')
      .find((b) => b.text() === 'Duplizieren')!
      .trigger('click')
    expect(wrapper.findAll('article')).toHaveLength(3)

    await cards()[2].find('button[aria-label$="entfernen"]').trigger('click')
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
    expect(wrapper.findAll('article button')).toHaveLength(0)
    expect(wrapper.findAllComponents({ name: 'OcSelect' })).toHaveLength(0)
    expect(wrapper.find('button[aria-label="Blanko nach oben"]').exists()).toBe(false)
    expect(wrapper.find('input#zk-list-date').exists()).toBe(false)
    expect(wrapper.text()).toContain('Nur Lesezugriff')
    expect(wrapper.find('.zk-tent-summary').text()).toBe('Jurtendach · Hoch · Superbahn · Gaze')
  })

  it('shows an error for an unknown list', async () => {
    const store = storeWith({}, [])
    const { wrapper } = await mountWithStore(PacklistEditor, store)
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  })
})

describe('PacklistEditor as a file', () => {
  it('uses the file name as title and links to the stock', async () => {
    const { wrapper } = await open([tentOf('kohte')], fullStock(100))
    expect(wrapper.find('h1').text()).toBe('p1')
    expect(wrapper.find('input#zk-list-name').exists()).toBe(false)
    expect(wrapper.find('a[href="/bestand"]').text()).toBe('Bestand')
  })

  it('saves pending changes before closing', async () => {
    const close = vi.fn()
    const { wrapper, store } = await open([tentOf('kohte')], fullStock(100), { close })
    await wrapper.find('input#zk-list-date').setValue('2026-08-01')
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Schließen')!
      .trigger('click')
    await flushPromises()
    expect(close).toHaveBeenCalledTimes(1)
    expect((await savedList(store)).date).toBe('2026-08-01')
  })

  it('offers no close button when the environment has none', async () => {
    const { wrapper } = await open([tentOf('kohte')], fullStock(100))
    expect(wrapper.findAll('button').some((b) => b.text() === 'Schließen')).toBe(false)
  })

  it('turns an empty file into an empty list', async () => {
    const store = storeWith(fullStock(100), [])
    store.createEmptyFile('p1')
    const { wrapper } = await mountWithStore(PacklistEditor, store)
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.find('.zk-banner').text()).toContain('Noch keine Zelte')
    expect((await savedList(store)).tents).toEqual([])
  })
})
