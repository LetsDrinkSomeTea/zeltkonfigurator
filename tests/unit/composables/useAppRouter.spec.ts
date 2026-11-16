import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useAppRouter } from '../../../src/composables/useAppRouter'

describe('useAppRouter', () => {
  it('nutzt den global installierten Router, ohne vue-router-Injection', () => {
    // So sieht es in OpenCloud aus: $router/$route stammen vom Router der Umgebung,
    // die Injection-Keys der eigenen vue-router-Kopie sind nicht belegt.
    const $router = { push: vi.fn(), replace: vi.fn() }
    const $route = { params: { id: 'abc' }, query: { tab: 'material' } }
    let seen: ReturnType<typeof useAppRouter> | undefined
    const Probe = defineComponent({
      setup() {
        seen = useAppRouter()
        return () => h('div')
      }
    })
    mount(Probe, { global: { config: { globalProperties: { $router, $route } as never } } })
    expect(seen!.route.value.params.id).toBe('abc')
    void seen!.router.push({ name: 'x' })
    expect($router.push).toHaveBeenCalledWith({ name: 'x' })
  })

  it('wirft außerhalb von setup()', () => {
    expect(() => useAppRouter()).toThrow()
  })
})
