import { flushPromises } from '@vue/test-utils'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { defineComponent, h } from 'vue'
import TentsTab from '../../../src/components/TentsTab.vue'
import { usePacklist } from '../../../src/composables/usePacklist'
import { storeKey } from '../../../src/composables/useStore'
import { choose, fullStock, listFor, ocSelect, storeWith, tentOf } from '../views/support'

type Pl = ReturnType<typeof usePacklist>

async function mountTab(
  tents = [
    tentOf('kohte', { id: 'a' }),
    tentOf('jurte', { id: 'b' }),
    tentOf('hochkohte', { id: 'c' })
  ],
  stock = fullStock(100),
  writable = true
) {
  const store = storeWith(stock, [listFor(tents, stock)], writable)
  let pl!: Pl
  const Host = defineComponent({
    setup() {
      pl = usePacklist(store.document('p1'))
      void pl.load()
      return () => h(TentsTab, { pl })
    }
  })
  const wrapper = mount(Host, {
    attachTo: document.body,
    global: {
      plugins: [...defaultPlugins()],
      stubs: { OcIcon: true },
      provide: { [storeKey as symbol]: store }
    }
  })
  await flushPromises()
  return { wrapper, pl }
}

type Wrapper = Awaited<ReturnType<typeof mountTab>>['wrapper']

const ids = (pl: Pl) => pl.list.value!.tents.map((t) => t.id)

const tile = (wrapper: Wrapper, name: string, sign: 'mehr' | 'weniger') =>
  wrapper.find(`button[aria-label="Eine ${name} ${sign}"]`)

describe('TentsTab Kacheln', () => {
  it('zeigt je Zelttyp eine Kachel mit Anzahl; + fügt hinzu, − entfernt', async () => {
    const { wrapper, pl } = await mountTab([tentOf('kohte', { id: 'a' })])
    const kohteTile = () => wrapper.findAll('.zk-tile').find((t) => t.text().startsWith('Kohte'))!
    expect(kohteTile().find('.zk-tile-count').text()).toBe('1')
    expect(tile(wrapper, 'Jurte', 'weniger').attributes('disabled')).toBeDefined()

    await tile(wrapper, 'Jurte', 'mehr').trigger('click')
    await tile(wrapper, 'Jurte', 'mehr').trigger('click')
    await flushPromises()
    expect(pl.list.value!.tents.map((t) => t.typeId)).toEqual(['kohte', 'jurte', 'jurte'])

    await tile(wrapper, 'Kohte', 'weniger').trigger('click')
    expect(pl.list.value!.tents.map((t) => t.typeId)).toEqual(['jurte', 'jurte'])
    wrapper.unmount()
  })

  it('− entfernt bevorzugt ein Zelt in Standardkonfiguration ohne Bezeichnung', async () => {
    const { wrapper, pl } = await mountTab([
      tentOf('jurte', { id: 'std' }),
      tentOf('jurte', { id: 'kueche', label: 'Küche' })
    ])
    await tile(wrapper, 'Jurte', 'weniger').trigger('click')
    expect(ids(pl)).toEqual(['kueche'])
    wrapper.unmount()
  })

  it('scrollt zum neuen Zelt und hebt es zwei Sekunden hervor', async () => {
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    const { wrapper, pl } = await mountTab([tentOf('kohte', { id: 'a' })])
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      await tile(wrapper, 'Jurte', 'mehr').trigger('click')
      await flushPromises()
      const added = ids(pl)[1]
      expect(scroll).toHaveBeenCalledTimes(1)
      expect(scroll.mock.contexts[0]).toBe(wrapper.find(`[data-tent-id="${added}"]`).element)
      expect(wrapper.find(`[data-tent-id="${added}"]`).classes()).toContain('zk-card-highlight')
      await vi.advanceTimersByTimeAsync(2100)
      expect(wrapper.find(`[data-tent-id="${added}"]`).classes()).not.toContain('zk-card-highlight')
    } finally {
      vi.useRealTimers()
      delete (Element.prototype as Partial<Element>).scrollIntoView
      wrapper.unmount()
    }
  })
})

describe('TentsTab gleiche Zelte', () => {
  it('fasst gleich eingestellte Zelte zu einer Karte zusammen und ändert alle gemeinsam', async () => {
    const { wrapper, pl } = await mountTab([
      tentOf('jurte', { id: 'a' }),
      tentOf('jurte', { id: 'b' }),
      tentOf('jurte', { id: 'c', label: 'Küche' })
    ])
    const titles = wrapper.findAll('article h3').map((h) => h.text())
    expect(titles).toEqual(['2 × Jurte', '3. Jurte – Küche'])
    const group = wrapper.find('article')
    const fenster = group.findAll('button[role="radio"]').find((b) => b.text() === 'Fenster')!
    await fenster.trigger('click')
    await flushPromises()
    expect(pl.list.value!.tents.map((t) => t.finish)).toEqual(['fenster', 'fenster', 'gaze'])
    wrapper.unmount()
  })

  it('„Einzeln bearbeiten“ zeigt die Zelte als eigene Karten', async () => {
    const { wrapper } = await mountTab([tentOf('jurte', { id: 'a' }), tentOf('jurte', { id: 'b' })])
    const split = wrapper.findAll('button').find((b) => b.text() === 'Einzeln bearbeiten')!
    await split.trigger('click')
    expect(wrapper.findAll('article h3').map((h) => h.text())).toEqual(['1. Jurte', '2. Jurte'])
    wrapper.unmount()
  })

  it('entfernt eine Gruppe nach Rückfrage komplett', async () => {
    const { wrapper, pl } = await mountTab([
      tentOf('jurte', { id: 'a' }),
      tentOf('jurte', { id: 'b' }),
      tentOf('kohte', { id: 'c' })
    ])
    await wrapper.find('button[aria-label="Alle 2 × Jurte entfernen"]').trigger('click')
    expect(wrapper.find('[role="alertdialog"]').text()).toContain('Alle 2 × Jurte entfernen?')
    await wrapper.find('.zk-confirm-ok').trigger('click')
    expect(ids(pl)).toEqual(['c'])
    wrapper.unmount()
  })
})

describe('TentsTab Zeltkarte', () => {
  it('zeigt Pfeile in der Kopfzeile und die Optionen als Knopfleisten', async () => {
    const { wrapper } = await mountTab()
    const first = wrapper.find('article')
    expect(first.find('button[aria-label="Nach oben"]').attributes('disabled')).toBeDefined()
    expect(first.findAll('button').map((b) => b.text())).toContain('Zurücksetzen')
    const jurte = wrapper.findAll('article')[1]
    const groups = jurte.findAll('[role="radiogroup"]').map((g) => g.text())
    expect(groups.some((t) => t.startsWith('Dach') && t.includes('6 Kohtenblätter'))).toBe(true)
    expect(groups.some((t) => t.startsWith('Aufbau') && t.includes('Gehängt'))).toBe(true)
    expect(groups.some((t) => t.startsWith('Seitenwand'))).toBe(true)
    wrapper.unmount()
  })

  it('fragt vor dem Entfernen und behält das Zelt bei Abbrechen oder Escape', async () => {
    const { wrapper, pl } = await mountTab()
    const remove = () => wrapper.find('article button[aria-label$="entfernen"]')
    await remove().trigger('click')
    const dialog = wrapper.find('[role="alertdialog"]')
    expect(dialog.text()).toContain('1. Kohte entfernen?')
    expect(document.activeElement?.textContent?.trim()).toBe('Abbrechen')
    await dialog.find('.zk-confirm-cancel').trigger('click')
    expect(ids(pl)).toHaveLength(3)
    await remove().trigger('click')
    await wrapper.find('[role="alertdialog"]').trigger('keydown', { key: 'Escape' })
    expect(ids(pl)).toHaveLength(3)
    await remove().trigger('click')
    await wrapper.find('.zk-confirm-ok').trigger('click')
    expect(ids(pl)).toEqual(['b', 'c'])
    wrapper.unmount()
  })

  it('zeigt, was pro Zelt fehlt', async () => {
    const stock = fullStock(100, { kohtenblatt: 5 })
    const { wrapper, pl } = await mountTab(
      [tentOf('kohte', { id: 'a' }), tentOf('kohte', { id: 'b', label: 'zwei' })],
      stock
    )
    const item = pl.list.value!.items.find((i) => i.articleId === 'kohtenblatt')!
    expect(item.missingPerTent).toEqual({ b: 3 })
    const [a, b] = wrapper.findAll('article')
    expect(a.find('.zk-tent-missing').exists()).toBe(false)
    expect(b.find('.zk-tent-missing').text()).toBe('fehlt: 3 Teile')
    expect(b.find('.zk-missing-list').text()).toBe(`3 × ${item.name} fehlen`)
    wrapper.unmount()
  })
})

describe('TentsTab Ziehen', () => {
  async function drag(wrapper: Wrapper, from: number, to: number) {
    const cards = wrapper.findAll('article')
    await cards[from].find('.zk-drag-handle').trigger('dragstart')
    expect(cards[from].classes()).toContain('zk-card-dragging')
    await cards[to].find('h3').trigger('dragover')
    await cards[to].find('h3').trigger('drop')
    await cards[from].find('.zk-drag-handle').trigger('dragend')
  }

  it('verschiebt ein gezogenes Zelt an die Stelle der Zielkarte', async () => {
    const { wrapper, pl } = await mountTab()
    await drag(wrapper, 0, 2)
    expect(ids(pl)).toEqual(['b', 'c', 'a'])
    await drag(wrapper, 2, 0)
    expect(ids(pl)).toEqual(['a', 'b', 'c'])
    expect(wrapper.find('.zk-card-dragging').exists()).toBe(false)
    wrapper.unmount()
  })

  it('ignoriert Ablegen auf sich selbst und ohne Ziehen', async () => {
    const { wrapper, pl } = await mountTab()
    await drag(wrapper, 1, 1)
    expect(ids(pl)).toEqual(['a', 'b', 'c'])
    await wrapper.findAll('article')[2].find('h3').trigger('drop')
    expect(ids(pl)).toEqual(['a', 'b', 'c'])
    wrapper.unmount()
  })

  it('ohne Schreibrecht: keine Griffe, Pfeile, Kacheln oder Knopfleisten', async () => {
    const { wrapper } = await mountTab(undefined, undefined, false)
    expect(wrapper.find('.zk-drag-handle').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="Nach oben"]').exists()).toBe(false)
    expect(wrapper.find('.zk-tiles').exists()).toBe(false)
    expect(wrapper.find('[role="radiogroup"]').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('TentsTab weiteres Material', () => {
  it('nimmt Material aus der Materialliste auf und rechnet es mit', async () => {
    const { wrapper, pl } = await mountTab([tentOf('kohte', { id: 'a' })])
    await choose(ocSelect(wrapper, 'article'), 'blockseilrolle')
    await flushPromises()
    await wrapper.find('.zk-parts-add input[type="number"]').setValue('2')
    await wrapper.findAll('.zk-parts-add button').at(-1)!.trigger('click')
    await flushPromises()
    expect(pl.list.value!.materials).toEqual([{ articleId: 'blockseilrolle', quantity: 2 }])
    const item = pl.list.value!.items.find((i) => i.articleId === 'blockseilrolle')!
    expect(item.quantity).toBe(2)
    expect(wrapper.find('.zk-parts-list').text()).toContain('Blockseilrolle')
    wrapper.unmount()
  })
})

describe('FinishOrderEditor', () => {
  it('is collapsed by default and summarises the order', async () => {
    const { wrapper } = await mountTab()
    const details = wrapper.find('details')
    expect(details.attributes('open')).toBeUndefined()
    expect(details.find('summary').text()).toBe('Ausweichreihenfolge: Gaze → Fenster → Blanko')
    wrapper.unmount()
  })
})
