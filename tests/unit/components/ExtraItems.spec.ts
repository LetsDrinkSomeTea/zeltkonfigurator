import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import ExtraItems from '../../../src/components/ExtraItems.vue'

const extras = [{ id: 'e1', text: 'Seil', quantity: 2, checked: false }]

function mountExtras() {
  return mount(ExtraItems, {
    props: { extras, canWrite: true },
    global: { plugins: [...defaultPlugins()], stubs: { OcIcon: true } }
  })
}

const inputs = (wrapper: ReturnType<typeof mountExtras>) =>
  wrapper.findAllComponents({ name: 'OcTextInput' })

describe('ExtraItems', () => {
  it('shows errors for empty text and invalid quantities and clears them again', async () => {
    const wrapper = mountExtras()
    const [text, qty] = inputs(wrapper)
    expect(text.props('errorMessage')).toBeFalsy()

    await wrapper.find('form').trigger('submit')
    expect(text.props('errorMessage')).toBe('Bitte Text eingeben')
    expect(qty.props('errorMessage')).toBeFalsy()
    expect(wrapper.emitted('add')).toBeUndefined()

    for (const bad of ['', '0', '-3']) {
      qty.vm.$emit('update:modelValue', bad)
      await wrapper.find('form').trigger('submit')
      expect(qty.props('errorMessage'), bad).toBe('Mindestens 1')
    }
    qty.vm.$emit('update:modelValue', '1.5')
    await wrapper.find('form').trigger('submit')
    expect(qty.props('errorMessage')).toBe('Bitte eine ganze Zahl eingeben')

    text.vm.$emit('update:modelValue', 'Hammer')
    qty.vm.$emit('update:modelValue', '4')
    await wrapper.vm.$nextTick()
    expect(text.props('errorMessage')).toBeFalsy()
    expect(qty.props('errorMessage')).toBeFalsy()

    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('add')).toEqual([['Hammer', 4]])
    expect(text.props('errorMessage')).toBeFalsy()
  })

  it('confirms before removing an extra line', async () => {
    const wrapper = mountExtras()
    await wrapper.find('.zk-extra-remove').trigger('click')
    expect(wrapper.find('[role="alertdialog"]').text()).toContain('Seil entfernen?')
    expect(wrapper.emitted('remove')).toBeUndefined()

    await wrapper.find('.zk-confirm-cancel').trigger('click')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(wrapper.emitted('remove')).toBeUndefined()

    await wrapper.find('.zk-extra-remove').trigger('click')
    await wrapper.find('.zk-confirm-ok').trigger('click')
    expect(wrapper.emitted('remove')).toEqual([['e1']])
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
  })
})
