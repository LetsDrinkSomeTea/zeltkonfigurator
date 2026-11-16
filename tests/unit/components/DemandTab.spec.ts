import { flushPromises } from '@vue/test-utils'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import DemandTab from '../../../src/components/DemandTab.vue'
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
      return () => h(DemandTab, { pl })
    }
  })
  const wrapper = mount(Host, {
    global: { plugins: [...defaultPlugins()], provide: { [storeKey as symbol]: store } }
  })
  await flushPromises()
  return { wrapper, list }
}

describe('DemandTab', () => {
  it('shows only the total table, without per-tent sections', async () => {
    const { wrapper } = await mountTab({}, 100)
    expect(wrapper.findAll('h3')).toHaveLength(0)
    expect(wrapper.findAll('table')).toHaveLength(1)
    expect(wrapper.text()).not.toContain('1. Kohte')
  })

  it('shows totals and highlights missing material', async () => {
    const { wrapper, list } = await mountTab({ 't-profil-30': 5 }, 100)
    const total = wrapper
    const headers = total.findAll('th').map((t) => t.text())
    expect(headers).toEqual(['Artikel', 'Benötigt', 'Aus Bestand', 'Fehlt'])
    const item = list.items.find((i) => i.articleId === 't-profil-30')!
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
})
