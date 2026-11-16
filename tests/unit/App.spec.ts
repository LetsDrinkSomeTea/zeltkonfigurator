import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import PacklistOverview from '../../src/views/PacklistOverview.vue'

describe('Zeltkonfigurator', () => {
  it('renders the packlist overview', () => {
    const wrapper = mount(PacklistOverview, { global: { plugins: [...defaultPlugins()] } })
    expect(wrapper.find('h1').text()).toBe('Packlisten')
  })
})
