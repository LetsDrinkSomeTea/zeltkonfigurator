import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import StatusBanner from '../../../src/components/StatusBanner.vue'
import type { PacklistStatus } from '../../../src/domain/view/status'

function render(status: PacklistStatus, missingCount?: number) {
  return mount(StatusBanner, {
    props: { status, missingCount },
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

  it('has no action for ok and ausweichmaterial', () => {
    expect(render('ok').find('.zk-banner-action').exists()).toBe(false)
    expect(render('ausweichmaterial').find('.zk-banner-action').exists()).toBe(false)
  })
})
