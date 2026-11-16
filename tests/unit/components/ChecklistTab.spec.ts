import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import ChecklistTab from '../../../src/components/ChecklistTab.vue'
import type { UsePacklist } from '../../../src/composables/usePacklist'
import { createPacklist } from '../../../src/domain/packlist'
import { catalog } from '../../../src/domain/catalog'
import { buildList, setup } from './helpers'

function render(pl: UsePacklist) {
  return mount(ChecklistTab, {
    props: { pl },
    global: { plugins: [...defaultPlugins()] }
  })
}

type W = ReturnType<typeof render>
const ui = (w: W) => w.find('.zk-no-print')
const rowIn = (root: ReturnType<W['find']>, name: string) =>
  root.findAll('li.zk-row').find((r) => r.text().includes(name))!
const rowFor = (w: W, name: string) => rowIn(ui(w), name)

describe('ChecklistTab', () => {
  it('shows category headings and one row per item', async () => {
    const { pl, list } = await setup()
    const w = render(pl)
    const headings = ui(w)
      .findAll('h2')
      .map((h) => h.text())
    expect(headings).toContain('Dächer und Planen')
    expect(headings).toContain('Stangen und Gestänge')
    expect(headings).toContain('Zusätzliches')
    expect(ui(w).findAll('section:not(.zk-extras) li.zk-row')).toHaveLength(list.items.length)
  })

  it('toggles a row and persists after flush', async () => {
    const { pl, store } = await setup()
    const w = render(pl)
    const row = rowFor(w, 'Kohtenblatt')
    await row.find('input').setValue(true)
    expect(pl.list.value!.items.find((i) => i.articleId === 'kohtenblatt')!.checked).toBe(true)
    expect(rowFor(w, 'Kohtenblatt').classes()).toContain('zk-row-done')
    await pl.flush()
    const saved = await store.loadPacklist('p1')
    expect(saved.data.items.find((i) => i.articleId === 'kohtenblatt')!.checked).toBe(true)
  })

  it('shows progress', async () => {
    const { pl, list } = await setup()
    const w = render(pl)
    const total = list.items.filter((i) => i.quantity > 0).length
    expect(w.find('.zk-progress').text()).toBe(`0 von ${total} abgehakt`)
    await rowFor(w, 'Kohtenblatt').find('input').setValue(true)
    expect(w.find('.zk-progress').text()).toBe(`1 von ${total} abgehakt`)
  })

  it('filters to open rows only', async () => {
    const { pl } = await setup()
    const w = render(pl)
    await rowFor(w, 'Kohtenblatt').find('input').setValue(true)
    await w.find('.zk-filter input').setValue(true)
    expect(ui(w).text()).not.toContain('Kohtenblatt')
    await w.find('.zk-filter input').setValue(false)
    expect(ui(w).text()).toContain('Kohtenblatt')
  })

  it('shows missing and cut hints', async () => {
    const { pl, list } = await setup()
    const w = render(pl)
    const hering = list.items.find((i) => i.articleId === 'hering')!
    expect(hering.missing).toBeGreaterThan(0)
    expect(rowFor(w, hering.name).text()).toContain(`${hering.missing} fehlen`)
    const mast = list.items.find((i) => i.articleId === 'mast-375')!
    expect(mast.toCut).toBeGreaterThan(0)
    expect(rowFor(w, mast.name).text()).toContain(`${mast.toCut} vor Ort schlagen`)
  })

  it('renders items without stock without checkbox', async () => {
    const { pl, list } = await setup()
    const zero = list.items.find((i) => i.quantity === 0)
    expect(zero).toBeDefined()
    const w = render(pl)
    expect(rowFor(w, zero!.name).find('input').exists()).toBe(false)
  })

  it('per-tent mode shows tent quantities and shares check state', async () => {
    const { pl, list } = await setup()
    const w = render(pl)
    await w.find('input[value="zelt"]').setValue(true)
    const headings = ui(w)
      .findAll('h2')
      .map((h) => h.text())
    expect(headings).toContain('Kohte (1)')
    expect(headings).toContain('Kohte (2)')
    expect(ui(w).text()).toContain('Der Haken gilt für den Artikel insgesamt')
    const blatt = list.items.find((i) => i.articleId === 'kohtenblatt')!
    const sections = ui(w).findAll('section:not(.zk-extras)')
    expect(sections[0].text()).toContain(`${blatt.perTent.t1} × ${blatt.name}`)
    await rowIn(sections[0], 'Kohtenblatt').find('input').setValue(true)
    const second = rowIn(ui(w).findAll('section:not(.zk-extras)')[1], 'Kohtenblatt')
    expect((second.find('input').element as HTMLInputElement).checked).toBe(true)
  })

  it('adds, toggles and removes extras', async () => {
    const { pl } = await setup()
    const w = render(pl)
    const inputs = w.findAll('.zk-extras-form input')
    await inputs[0].setValue('Hammer')
    await inputs[1].setValue(3)
    await w.find('.zk-extras-form').trigger('submit')
    expect(pl.list.value!.extraItems).toMatchObject([{ text: 'Hammer', quantity: 3 }])
    expect(w.find('.zk-extras').text()).toContain('3 × Hammer')
    expect((inputs[0].element as HTMLInputElement).value).toBe('')
    await w.find('.zk-extras li input').setValue(true)
    expect(pl.list.value!.extraItems[0].checked).toBe(true)
    await w.find('.zk-extra-remove').trigger('click')
    expect(pl.list.value!.extraItems).toHaveLength(0)
  })

  it('rejects empty extra text', async () => {
    const { pl } = await setup()
    const w = render(pl)
    await w.findAll('.zk-extras-form input')[0].setValue('   ')
    await w.find('.zk-extras-form').trigger('submit')
    expect(pl.list.value!.extraItems).toHaveLength(0)
  })

  it('is read-only without write access', async () => {
    const { pl } = await setup({
      writable: false,
      list: buildList({ extraItems: [{ id: 'e1', text: 'Hammer', quantity: 1, checked: false }] })
    })
    const w = render(pl)
    const boxes = ui(w).findAll('li.zk-row input[type="checkbox"]')
    expect(boxes.length).toBeGreaterThan(0)
    for (const b of boxes) {
      expect(b.attributes('disabled')).toBeDefined()
    }
    expect(w.find('.zk-extras-form').exists()).toBe(false)
    expect(w.find('.zk-extra-remove').exists()).toBe(false)
  })

  it('hints at the tents tab for an empty list', async () => {
    const empty = createPacklist('Leer', catalog, {})
    const { pl } = await setup({ list: { ...empty, id: 'p1' } })
    const w = render(pl)
    expect(ui(w).text()).toContain('Noch keine Zelte')
    expect(ui(w).text()).toContain('Zelte')
  })

  it('print button calls window.print', async () => {
    const { pl } = await setup()
    const original = window.print
    const spy = vi.fn()
    window.print = spy
    const w = render(pl)
    const btn = w.findAll('button').find((b) => b.text() === 'Drucken')!
    await btn.trigger('click')
    expect(spy).toHaveBeenCalledOnce()
    window.print = original
  })

  it('contains the print layout', async () => {
    const { pl } = await setup()
    const w = render(pl)
    expect(w.find('.zk-print').exists()).toBe(true)
  })
})
