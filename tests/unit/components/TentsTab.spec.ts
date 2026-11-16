import { flushPromises } from '@vue/test-utils'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { defineComponent, h } from 'vue'
import TentsTab from '../../../src/components/TentsTab.vue'
import { usePacklist } from '../../../src/composables/usePacklist'
import { storeKey } from '../../../src/composables/useStore'
import { fullStock, listFor, storeWith, tentOf } from '../views/support'

type Pl = ReturnType<typeof usePacklist>

async function mountTab(
  tents = [
    tentOf('kohte', { id: 'a' }),
    tentOf('jurte', { id: 'b' }),
    tentOf('kohte', { id: 'c' })
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

describe('TentsTab add form', () => {
  it('sits below the tent list and adds several tents of the chosen type', async () => {
    const { wrapper, pl } = await mountTab([tentOf('kohte', { id: 'a' })])
    const html = wrapper.html()
    expect(html.indexOf('<article')).toBeLessThan(html.indexOf('zk-add-tent-count'))
    expect(html.indexOf('zk-add-tent-count')).toBeLessThan(html.indexOf('Ausweichreihenfolge'))

    const input = wrapper.find('input#zk-add-tent-count')
    expect((input.element as HTMLInputElement).value).toBe('1')
    await input.setValue('3')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(pl.list.value!.tents).toHaveLength(4)
    expect(new Set(pl.list.value!.tents.slice(1).map((t) => t.typeId)).size).toBe(1)
    expect((wrapper.find('input#zk-add-tent-count').element as HTMLInputElement).value).toBe('1')
    wrapper.unmount()
  })

  it('clamps the count to 1..20', async () => {
    const { wrapper, pl } = await mountTab([])
    await wrapper.find('input#zk-add-tent-count').setValue('99')
    await wrapper.find('form').trigger('submit')
    expect(pl.list.value!.tents).toHaveLength(20)
    await wrapper.find('input#zk-add-tent-count').setValue('0')
    await wrapper.find('form').trigger('submit')
    expect(pl.list.value!.tents).toHaveLength(21)
    wrapper.unmount()
  })

  it('scrolls to the first new tent and highlights it for two seconds', async () => {
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    const { wrapper, pl } = await mountTab([tentOf('kohte', { id: 'a' })])
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      await wrapper.find('input#zk-add-tent-count').setValue('2')
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      const [first, second] = ids(pl).slice(1)
      expect(scroll).toHaveBeenCalledTimes(1)
      expect(scroll.mock.contexts[0]).toBe(wrapper.find(`[data-tent-id="${first}"]`).element)
      expect(wrapper.find(`[data-tent-id="${first}"]`).classes()).toContain('zk-card-highlight')
      expect(wrapper.find(`[data-tent-id="${second}"]`).classes()).toContain('zk-card-highlight')
      expect(wrapper.find('[data-tent-id="a"]').classes()).not.toContain('zk-card-highlight')
      await vi.advanceTimersByTimeAsync(2100)
      expect(wrapper.find(`[data-tent-id="${first}"]`).classes()).not.toContain('zk-card-highlight')
    } finally {
      vi.useRealTimers()
      delete (Element.prototype as Partial<Element>).scrollIntoView
      wrapper.unmount()
    }
  })
})

describe('TentsTab tent card', () => {
  it('always shows the arrows in the header and labels the reset button "Zurücksetzen"', async () => {
    const { wrapper } = await mountTab()
    const first = wrapper.find('article')
    expect(first.find('button[aria-label="Nach oben"]').attributes('disabled')).toBeDefined()
    expect(first.find('button[aria-expanded]').attributes('aria-expanded')).toBe('false')
    await first.find('button[aria-expanded]').trigger('click')
    expect(first.findAll('button').map((b) => b.text())).toContain('Zurücksetzen')
    expect(first.findAll('button').map((b) => b.text())).not.toContain('Standard')
    wrapper.unmount()
  })

  it('asks before removing a tent and keeps it on cancel or Escape', async () => {
    const { wrapper, pl } = await mountTab()
    const remove = () => wrapper.find('article button[aria-label$="entfernen"]')
    await remove().trigger('click')
    const dialog = wrapper.find('[role="alertdialog"]')
    expect(dialog.exists()).toBe(true)
    expect(dialog.text()).toContain('1. Kohte entfernen?')
    expect(document.activeElement?.textContent?.trim()).toBe('Abbrechen')
    expect(ids(pl)).toHaveLength(3)

    await dialog.find('.zk-confirm-cancel').trigger('click')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(ids(pl)).toHaveLength(3)

    await remove().trigger('click')
    await wrapper.find('[role="alertdialog"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(ids(pl)).toHaveLength(3)

    await remove().trigger('click')
    await wrapper.find('.zk-confirm-ok').trigger('click')
    expect(ids(pl)).toEqual(['b', 'c'])
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows what is missing per tent', async () => {
    const stock = fullStock(100, { kohtenblatt: 5 })
    const { wrapper, pl } = await mountTab(
      [tentOf('kohte', { id: 'a' }), tentOf('kohte', { id: 'b' })],
      stock
    )
    const item = pl.list.value!.items.find((i) => i.articleId === 'kohtenblatt')!
    expect(item.missingPerTent).toEqual({ b: 3 })
    const [a, b] = wrapper.findAll('article')
    expect(a.find('.zk-tent-missing').exists()).toBe(false)
    expect(a.find('.zk-missing-list').exists()).toBe(false)
    expect(b.find('.zk-tent-missing').text()).toBe('fehlt: 3 Teile')
    expect(b.find('.zk-missing-list').text()).toBe(`3 × ${item.name} fehlen`)
    wrapper.unmount()
  })
})

describe('TentsTab drag and drop', () => {
  async function drag(wrapper: Wrapper, from: number, to: number) {
    const cards = wrapper.findAll('article')
    await cards[from].find('.zk-drag-handle').trigger('dragstart')
    expect(cards[from].classes()).toContain('zk-card-dragging')
    await cards[to].find('h3').trigger('dragover')
    await cards[to].find('h3').trigger('drop')
    await cards[from].find('.zk-drag-handle').trigger('dragend')
  }

  it('moves a dragged tent to the position of the card it is dropped on', async () => {
    const { wrapper, pl } = await mountTab()
    await drag(wrapper, 0, 2)
    expect(ids(pl)).toEqual(['b', 'c', 'a'])
    await drag(wrapper, 2, 0)
    expect(ids(pl)).toEqual(['a', 'b', 'c'])
    expect(wrapper.find('.zk-card-dragging').exists()).toBe(false)
    wrapper.unmount()
  })

  it('ignores drops onto itself and drops without a drag', async () => {
    const { wrapper, pl } = await mountTab()
    await drag(wrapper, 1, 1)
    expect(ids(pl)).toEqual(['a', 'b', 'c'])
    await wrapper.findAll('article')[2].find('h3').trigger('drop')
    expect(ids(pl)).toEqual(['a', 'b', 'c'])
    wrapper.unmount()
  })

  it('offers no handle, arrows or add form when read-only', async () => {
    const { wrapper } = await mountTab(undefined, undefined, false)
    expect(wrapper.find('.zk-drag-handle').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="Nach oben"]').exists()).toBe(false)
    expect(wrapper.find('form').exists()).toBe(false)
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
