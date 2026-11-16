import { flushPromises, type VueWrapper } from '@vue/test-utils'
import PacklistEditor from '../../../src/views/PacklistEditor.vue'
import type { PacklistFile, Stock, TentConfig } from '../../../src/domain/types'
import {
  bareTent,
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
    checked?: boolean
    close?: () => void
  } = {}
) {
  const list = listFor(tents, options.listStock ?? stock)
  if (options.unknownType) {
    list.tents = list.tents.map((t) => ({ ...t, typeId: 'gibt-es-nicht' }))
  }
  if (options.checked) {
    list.items = list.items.map((item, i) => ({ ...item, checked: i === 0 }))
  }
  const store = storeWith(stock, [list], options.writable ?? true)
  const mounted = await mountWithStore(PacklistEditor, store, {
    route: `/liste/p1.packliste${options.query ?? '?tab=zelte'}`,
    close: options.close
  })
  await flushPromises()
  return { ...mounted, store, list }
}

async function savedList(store: ReturnType<typeof storeWith>): Promise<PacklistFile> {
  return (await store.loadPacklist('p1')).data
}

/** Knopfleiste einer Zeltoption (Beschriftung beginnt mit `label`) */
function choiceGroup(wrapper: VueWrapper, label: string) {
  return wrapper.findAll('[role="radiogroup"]').find((g) => g.text().startsWith(label))
}

/** Wählt in der Knopfleiste `label` die Möglichkeit `option`. */
async function chooseOption(wrapper: VueWrapper, label: string, option: string) {
  const group = choiceGroup(wrapper, label)
  expect(group, label).toBeDefined()
  const button = group!.findAll('button[role="radio"]').find((b) => b.text() === option)
  expect(button, `${label}: ${option}`).toBeDefined()
  await button!.trigger('click')
  await flushPromises()
}

/** Fügt über die Kachel ein Zelt des Typs hinzu. */
async function addViaTile(wrapper: VueWrapper, name: string) {
  await wrapper.find(`button[aria-label="Eine ${name} mehr"]`).trigger('click')
  await flushPromises()
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
    expect(wrapper.find('.zk-banner').text()).toMatch(/\d+ Artikel fehlen/)
    expect(wrapper.find('.zk-banner-fehlt').exists()).toBe(true)
  })

  it('"anzeigen" in the missing banner switches to the Bedarf tab', async () => {
    const { wrapper, router } = await open([tentOf('jurte')], fullStock(0))
    await wrapper.find('.zk-banner-action').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.tab).toBe('bedarf')
    expect(wrapper.find('[role="tab"][aria-selected="true"]').text()).toBe('Bedarf')
  })

  it('the hint of an empty list switches to the Zelte tab', async () => {
    const { wrapper, router } = await open([], fullStock(100), { query: '?tab=packliste' })
    const hint = wrapper.find('.zk-banner-action')
    expect(hint.text()).toContain('Zelte')
    await hint.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.tab).toBe('zelte')
  })

  it('shows a neutral hint for an empty list', async () => {
    const { wrapper } = await open([], fullStock(100))
    expect(wrapper.find('.zk-banner-leer').exists()).toBe(true)
    expect(wrapper.find('.zk-banner').text()).toContain('Noch keine Zelte')
  })
})

describe('PacklistEditor stale notice', () => {
  const NOTICE = 'Die Materialliste (Bestand, Material oder Zelttypen) hat sich geändert'

  it('recalculates silently when nothing is checked', async () => {
    const { wrapper, store } = await open([tentOf('kohte')], fullStock(100), {
      listStock: fullStock(50)
    })
    expect(wrapper.text()).not.toContain(NOTICE)
    await wrapper.unmount()
    await flushPromises()
    const saved = await savedList(store)
    expect(saved.items.find((i) => i.articleId === 'kohtenblatt')?.missing).toBe(0)
  })

  it('offers recalculation when something is checked', async () => {
    const { wrapper, store } = await open([tentOf('kohte')], fullStock(100), {
      listStock: fullStock(50),
      checked: true
    })
    expect(wrapper.text()).toContain(NOTICE)
    expect(wrapper.text()).toContain('Haken bleiben erhalten')
    const button = wrapper.findAll('button').find((b) => b.text() === 'Neu berechnen')!
    await button.trigger('click')
    await flushPromises()
    expect(wrapper.text()).not.toContain(NOTICE)
    await wrapper.unmount()
    await flushPromises()
    expect((await savedList(store)).fingerprint).toBeTruthy()
  })

  it('does not recalculate automatically without write access', async () => {
    const { wrapper } = await open([tentOf('kohte')], fullStock(100), {
      listStock: fullStock(50),
      writable: false
    })
    expect(wrapper.text()).toContain(NOTICE)
    expect(wrapper.findAll('button').some((b) => b.text() === 'Neu berechnen')).toBe(false)
  })

  it('shows no notice for a current list', async () => {
    const { wrapper } = await open([tentOf('kohte')], fullStock(100))
    expect(wrapper.text()).not.toContain(NOTICE)
  })
})

describe('PacklistEditor tabs', () => {
  it('uses accessible tabs and keeps the selection in the query', async () => {
    const { wrapper, router } = await open([tentOf('kohte')], fullStock(100), { query: '' })
    expect(wrapper.find('[role="tablist"]').exists()).toBe(true)
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs.map((t) => t.text())).toEqual(['Packliste', 'Zelte', 'Bedarf'])
    expect(tabs[0].attributes('aria-selected')).toBe('true')
    expect(wrapper.find('[role="tabpanel"]').exists()).toBe(true)

    await tabs[0].trigger('keydown', { key: 'ArrowRight' })
    await flushPromises()
    expect(router.currentRoute.value.query.tab).toBe('zelte')
    expect(wrapper.findAll('[role="tab"]')[1].attributes('aria-selected')).toBe('true')

    await wrapper.findAll('[role="tab"]')[2].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.tab).toBe('bedarf')
  })

  it('opens the tab from the query', async () => {
    const { wrapper } = await open([tentOf('kohte')], fullStock(100), { query: '?tab=bedarf' })
    expect(wrapper.findAll('[role="tab"]')[2].attributes('aria-selected')).toBe('true')
    expect(wrapper.find('table').text()).toContain('Benötigt')
    expect(wrapper.text()).not.toContain('Gesamt über alle Zelte')
  })

  it('starts on "Packliste" for a list with tents', async () => {
    const { wrapper } = await open([tentOf('kohte')], fullStock(100), { query: '' })
    expect(wrapper.find('[role="tab"][aria-selected="true"]').text()).toBe('Packliste')
  })

  it('starts on "Zelte" for a list without tents and stays there after adding one', async () => {
    const { wrapper } = await open([], fullStock(100), { query: '' })
    expect(wrapper.find('[role="tab"][aria-selected="true"]').text()).toBe('Zelte')
    await addViaTile(wrapper, 'Kohte')
    expect(wrapper.find('[role="tab"][aria-selected="true"]').text()).toBe('Zelte')
  })
})

describe('PacklistEditor header', () => {
  it('prints from every tab and always renders the print layout', async () => {
    const original = window.print
    const print = vi.fn()
    window.print = print
    const { wrapper } = await open([tentOf('kohte')], fullStock(100), { query: '' })
    for (const id of ['packliste', 'zelte', 'bedarf']) {
      await wrapper.find(`#zk-tab-${id}`).trigger('click')
      await flushPromises()
      expect(wrapper.find('.zk-print').exists()).toBe(true)
      const button = wrapper.findAll('button').find((b) => b.text() === 'Drucken')!
      expect(button.classes()).toContain('zk-no-print')
      await button.trigger('click')
    }
    expect(print).toHaveBeenCalledTimes(3)
    window.print = original
  })

  it('opens the stock in a new browser tab', async () => {
    const opener = vi.spyOn(window, 'open').mockImplementation(() => null)
    const { wrapper, router } = await open([tentOf('kohte')], fullStock(100))
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Materialliste')!
      .trigger('click')
    expect(opener).toHaveBeenCalledWith('/bestand', '_blank', 'noopener')
    expect(router.currentRoute.value.name).toBe('zeltkonfigurator-liste')
    opener.mockRestore()
  })

  it('shows the read-only badge only without write access', async () => {
    const ro = await open([tentOf('kohte')], fullStock(100), { writable: false })
    expect(ro.wrapper.find('.zk-readonly-badge').text()).toBe('Schreibgeschützt')
    expect(ro.wrapper.find('.zk-readonly-badge').classes()).toContain('zk-no-print')
    expect(ro.wrapper.text()).not.toContain('Nur Lesezugriff')
    const rw = await open([tentOf('kohte')], fullStock(100))
    expect(rw.wrapper.find('.zk-readonly-badge').exists()).toBe(false)
  })

  it('does not show a saving indicator but reports save errors', async () => {
    const close = vi.fn()
    const { wrapper, store } = await open([tentOf('kohte')], fullStock(100), { close })
    vi.spyOn(store, 'savePacklist').mockRejectedValue(new Error('Netz weg'))
    await wrapper.find('input#zk-list-date').setValue('2026-08-01')
    expect(wrapper.text()).not.toContain('Wird gespeichert')
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Schließen')!
      .trigger('click')
    await flushPromises()
    const alert = wrapper.find('[role="alert"]')
    expect(alert.text()).toContain('Nicht gespeichert:')
    expect(alert.text()).toContain('Netz weg')
  })
})

describe('PacklistEditor configurator', () => {
  it('adds a Jurte in its default configuration', async () => {
    const { wrapper, store } = await open([], fullStock(100))
    await addViaTile(wrapper, 'Jurte')
    expect(wrapper.find('.zk-tent-summary').text()).toBe('Jurtendach · Hoch · Superbahn · Gaze')
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

  it('shows the options of a tent directly as button rows', async () => {
    const { wrapper } = await open([tentOf('jurte')], fullStock(100))
    expect(wrapper.find('article button[aria-expanded]').exists()).toBe(false)
    for (const label of ['Dach', 'Aufbau', 'Seitenwand', 'Bauart', 'Ausführung']) {
      expect(choiceGroup(wrapper, label), label).toBeDefined()
    }
    const selected = choiceGroup(wrapper, 'Ausführung')!.find('[aria-checked="true"]')
    expect(selected.text()).toBe('Gaze')
  })

  it('shows build and finish only where they apply', async () => {
    const { wrapper } = await open([bareTent('jurte')], fullStock(100))
    expect(choiceGroup(wrapper, 'Bauart')).toBeUndefined()
    expect(choiceGroup(wrapper, 'Ausführung')).toBeUndefined()
    await chooseOption(wrapper, 'Seitenwand', 'Hoch')
    expect(choiceGroup(wrapper, 'Bauart')).toBeDefined()
    expect(choiceGroup(wrapper, 'Ausführung')).toBeDefined()
    await chooseOption(wrapper, 'Bauart', 'Normalbahn + Erweiterungsstreifen')
    expect(choiceGroup(wrapper, 'Ausführung')).toBeDefined()
    await chooseOption(wrapper, 'Seitenwand', 'Normal')
    expect(choiceGroup(wrapper, 'Bauart')).toBeUndefined()
    expect(choiceGroup(wrapper, 'Ausführung')).toBeUndefined()
  })

  it('shows no roof choice for a Kohte', async () => {
    const { wrapper } = await open([tentOf('kohte')], fullStock(100))
    expect(choiceGroup(wrapper, 'Dach')).toBeUndefined()
    expect(choiceGroup(wrapper, 'Seitenwand')).toBeDefined()
  })

  it('writes option changes to the list and marks the tent as customised', async () => {
    const { wrapper, store } = await open([tentOf('jurte')], fullStock(100))
    expect(wrapper.find('.zk-tent-custom').exists()).toBe(false)
    await chooseOption(wrapper, 'Dach', '6 Kohtenblätter')
    await chooseOption(wrapper, 'Aufbau', 'Gehängt')
    await chooseOption(wrapper, 'Ausführung', 'Fenster')
    await wrapper.find('input[id$="-label"]').setValue('Küche')
    await flushPromises()
    expect(wrapper.find('.zk-tent-summary').text()).toContain('6 Kohtenblätter (Gehängt) · Hoch')
    expect(wrapper.find('.zk-tent-custom').exists()).toBe(true)
    await wrapper.unmount()
    await flushPromises()
    const [tent] = (await savedList(store)).tents
    expect(tent).toMatchObject({
      roofs: [{ roofId: 'kohtenblaetter', setupId: 'gehaengt' }],
      wallId: 'hoch',
      buildId: 'super',
      finish: 'fenster',
      label: 'Küche'
    })
  })

  it('resets a tent to its default configuration', async () => {
    const { wrapper, store } = await open([bareTent('jurte', { label: 'Küche' })], fullStock(100))
    const reset = () => wrapper.findAll('article button').find((b) => b.text() === 'Zurücksetzen')!
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
    const cards = () => wrapper.findAll('article')
    expect(cards()[0].find('button[aria-label="Nach oben"]').attributes('disabled')).toBeDefined()
    expect(cards()[1].find('button[aria-label="Nach unten"]').attributes('disabled')).toBeDefined()

    await cards()[1].find('button[aria-label="Nach oben"]').trigger('click')
    expect(wrapper.findAll('article h3').map((h) => h.text())).toEqual(['1. Jurte', '2. Kohte'])

    await cards()[0]
      .findAll('button')
      .find((b) => b.text() === 'Duplizieren')!
      .trigger('click')
    // die Kopie ist gleich eingestellt: eine gemeinsame Karte
    expect(wrapper.findAll('article h3').map((h) => h.text())).toEqual(['2 × Jurte', '3. Kohte'])

    await cards()[1].find('button[aria-label$="entfernen"]').trigger('click')
    await wrapper.find('.zk-confirm-ok').trigger('click')
    expect(wrapper.findAll('article')).toHaveLength(1)
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
    expect(wrapper.find('.zk-readonly-badge').exists()).toBe(true)
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
  it('uses the file name as title', async () => {
    const { wrapper } = await open([tentOf('kohte')], fullStock(100))
    expect(wrapper.find('h1').text()).toBe('p1')
    expect(wrapper.find('input#zk-list-name').exists()).toBe(false)
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
