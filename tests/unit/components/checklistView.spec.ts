import { catalog } from '../../../src/domain/catalog'
import {
  describeTent,
  groupByCategory,
  itemsForTent,
  progress,
  tentTitle
} from '../../../src/components/checklistView'
import { buildList } from './helpers'

describe('checklistView', () => {
  it('puts unknown categories last under their id', () => {
    const [item] = buildList().items
    const groups = groupByCategory([{ ...item, category: 'kueche' }, item], catalog.categories)
    expect(groups.map((g) => g.title).at(-1)).toBe('kueche')
  })

  it('groups by category in catalog order with German titles', () => {
    const groups = groupByCategory(buildList().items, catalog.categories)
    expect(groups.map((g) => g.title)).toEqual(
      expect.arrayContaining(['Dächer und Planen', 'Stangen und Gestänge'])
    )
    const order = ['dach', 'wand', 'stange', 'abspannung', 'kleinteil', 'boden']
    const idx = groups.map((g) => order.indexOf(g.category))
    expect(idx).toEqual([...idx].sort((a, b) => a - b))
  })

  it('lists items per tent with that tent quantity', () => {
    const list = buildList()
    const rows = itemsForTent(list, 't1')
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) {
      expect(r.quantity).toBe(r.item.perTent.t1)
    }
  })

  it('counts progress over checkable items and extras', () => {
    const list = buildList()
    const checkable = list.items.filter((i) => i.quantity > 0).length
    expect(progress(list)).toEqual({ done: 0, total: checkable })
    const first = list.items.find((i) => i.quantity > 0)!
    first.checked = true
    list.extraItems = [{ id: 'e', text: 'x', quantity: 1, checked: true }]
    expect(progress(list)).toEqual({ done: 2, total: checkable + 1 })
  })

  it('numbers tents with repeated names', () => {
    const list = buildList()
    expect(tentTitle(list, list.tents[1], catalog)).toBe('Kohte (2)')
    list.tents[0].label = 'Küche'
    expect(tentTitle(list, list.tents[0], catalog)).toBe('Küche')
    expect(tentTitle(list, list.tents[1], catalog)).toBe('Kohte')
  })

  it('describes a tent and tolerates unknown ids', () => {
    const list = buildList()
    const lines = describeTent(list.tents[0], catalog)
    expect(lines[0]).toEqual({ label: 'Zelttyp', value: 'Kohte' })
    expect(lines.find((l) => l.label === 'Dach')?.value).toBe('4 Kohtenblätter')
    const unknown = describeTent(
      { ...list.tents[0], typeId: 'xyz', roofs: [{ roofId: 'r?', setupId: 's?' }] },
      catalog
    )
    expect(unknown[0].value).toBe('xyz')
    expect(unknown.find((l) => l.label === 'Dach')?.value).toBe('r?')
  })
})
