import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import PrintLayout from '../../../src/components/PrintLayout.vue'
import { catalog } from '../../../src/domain/catalog'
import { buildList } from './helpers'

function render(list = buildList()) {
  return mount(PrintLayout, {
    props: { list, catalog },
    global: { plugins: [...defaultPlugins()] }
  })
}

describe('PrintLayout', () => {
  it('contains title, date and all sections', () => {
    const list = buildList({
      date: '2026-07-04',
      extraItems: [{ id: 'e1', text: 'Hammer', quantity: 2, checked: false }]
    })
    const text = render(list).text()
    expect(text).toContain('Sommerlager')
    expect(text).toContain('04.07.2026')
    expect(text).toContain('Gesamt')
    expect(text).toContain('Zusätzliches')
    expect(text).toContain('Hammer')
    expect(text).toContain('Pro Zelt')
    expect(text).toContain('Kohte (1)')
    expect(text).toContain('Dach')
    expect(text).toContain('4 Kohtenblätter')
    expect(text).toContain('Dächer und Planen')
  })

  it('shows ticked boxes for checked rows and hints', () => {
    const list = buildList()
    const rows = list.items.filter((i) => i.quantity > 0)
    rows[0].checked = true
    const wrapper = render(list)
    const boxes = wrapper.findAll('.zk-print-box').map((b) => b.text())
    expect(boxes).toContain('☑')
    expect(boxes).toContain('☐')
    expect(wrapper.text()).toMatch(/\d+ fehlen/)
  })

  it('lists deviations', () => {
    const list = buildList({
      deviations: [{ tentId: 't1', kind: 'wand', wanted: 'Superbahn Fenster', got: null }]
    })
    const text = render(list).text()
    expect(text).toContain('Abweichungen')
    expect(text).toContain('Superbahn Fenster')
    expect(text).toContain('fehlt')
  })
})
