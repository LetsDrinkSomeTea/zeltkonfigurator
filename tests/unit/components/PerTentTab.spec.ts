import { flushPromises } from '@vue/test-utils'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import PerTentTab from '../../../src/components/PerTentTab.vue'
import { usePacklist } from '../../../src/composables/usePacklist'
import { storeKey } from '../../../src/composables/useStore'
import { fullStock, listFor, storeWith, tentOf } from '../views/support'
import { defineComponent, h } from 'vue'

async function mountTab(stock: Parameters<typeof fullStock>[1], quantity: number) {
  const full = fullStock(quantity, stock)
  const list = listFor([tentOf('kohte'), tentOf('jurte', { label: 'Küche' })], full)
  const store = storeWith(full, [list])
  const Host = defineComponent({
    setup() {
      const pl = usePacklist(store.document('p1'))
      void pl.load()
      return () => h(PerTentTab, { pl })
    }
  })
  const wrapper = mount(Host, {
    global: { plugins: [...defaultPlugins()], provide: { [storeKey as symbol]: store } }
  })
  await flushPromises()
  return { wrapper, list }
}

describe('PerTentTab', () => {
  it('lists the material per tent, grouped by category', async () => {
    const { wrapper, list } = await mountTab({}, 100)
    const headings = wrapper.findAll('h3').map((h) => h.text())
    expect(headings).toContain('1. Kohte')
    expect(headings).toContain('2. Jurte – Küche')
    const captions = wrapper.findAll('caption').map((c) => c.text())
    expect(captions).toContain('Dächer und Planen')
    expect(captions).toContain('Stangen und Gestänge')
    const tProfil = list.items.find((i) => i.articleId === 't-profil')!
    const sections = wrapper.findAll('section')
    const jurte = sections.find((s) => s.find('h3').text().startsWith('2.'))!
    const row = jurte.findAll('tr').find((r) => r.text().startsWith(tProfil.name))!
    expect(row.findAll('td')[1].text()).toBe(String(tProfil.perTent[list.tents[1].id]))
  })

  it('shows totals and highlights missing material', async () => {
    const { wrapper, list } = await mountTab({ 't-profil': 5 }, 100)
    const total = wrapper.findAll('section').at(-1)!
    const headers = total.findAll('th').map((t) => t.text())
    expect(headers).toEqual(['Artikel', 'Benötigt', 'Aus Bestand', 'Fehlt'])
    const item = list.items.find((i) => i.articleId === 't-profil')!
    expect(item.missing).toBeGreaterThan(0)
    const row = total.findAll('tr').find((r) => r.text().startsWith(item.name))!
    const cells = row.findAll('td').map((c) => c.text())
    expect(cells).toEqual([
      item.name,
      String(item.quantity + item.missing),
      String(item.quantity),
      String(item.missing)
    ])
    expect(row.findAll('td')[3].classes()).toContain('zk-missing')
  })

  it('counts missing poles as missing', async () => {
    const { wrapper } = await mountTab({ 'mast-375': 0, seitenstange: 0 }, 100)
    const total = wrapper.findAll('section').at(-1)!
    expect(total.findAll('th').map((t) => t.text())).not.toContain('Vor Ort schlagen')
  })
})
