import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import StatusBanner from '../../../src/components/StatusBanner.vue'
import type { PacklistStatus } from '../../../src/domain/view/status'

function render(
  status: PacklistStatus,
  missingCount?: number,
  activeTab?: 'packliste' | 'zelte' | 'bedarf'
) {
  return mount(StatusBanner, {
    props: { status, missingCount, activeTab },
    global: { plugins: [...defaultPlugins()] }
  })
}

describe('StatusBanner', () => {
  it('counts missing articles with singular and plural', () => {
    expect(render('fehlt', 1).text()).toContain('1 Artikel fehlt')
    expect(render('fehlt', 3).text()).toContain('3 Artikel fehlen')
  })

  it('emits "show" with bedarf from the missing banner', async () => {
    const w = render('fehlt', 2)
    const button = w.find('.zk-banner-action')
    expect(button.text()).toBe('anzeigen')
    await button.trigger('click')
    expect(w.emitted('show')).toEqual([['bedarf']])
  })

  it('emits "show" with zelte from the empty hint', async () => {
    const w = render('leer')
    await w.find('.zk-banner-action').trigger('click')
    expect(w.emitted('show')).toEqual([['zelte']])
  })

  it('shows only the headline for an empty list on the Zelte tab', () => {
    const w = render('leer', undefined, 'zelte')
    expect(w.text()).toContain('Noch keine Zelte')
    expect(w.find('.zk-banner-action').exists()).toBe(false)
  })

  it('keeps the empty hint action on other tabs', () => {
    expect(render('leer', undefined, 'bedarf').find('.zk-banner-action').exists()).toBe(true)
  })

  it('has no action for ok and ausweichmaterial', () => {
    expect(render('ok').find('.zk-banner-action').exists()).toBe(false)
    expect(render('ausweichmaterial').find('.zk-banner-action').exists()).toBe(false)
  })
})
