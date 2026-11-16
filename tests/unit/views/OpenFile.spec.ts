import { mount } from '@vue/test-utils'
import { defaultPlugins } from '@opencloud-eu/web-test-helpers'
import OpenFile from '../../../src/views/OpenFile.vue'
import { setAppConfig } from '../../../src/storage/appConfig'
import { createTestRouter, settle } from './support'

async function open(path: string) {
  const router = createTestRouter()
  router.addRoute({
    path: '/datei/:driveAliasAndItem(.*)?',
    name: 'zeltkonfigurator-datei',
    component: OpenFile
  })
  await router.push('/datei/' + path)
  await router.isReady()
  const wrapper = mount(OpenFile, {
    global: { plugins: [...defaultPlugins(), router], stubs: { OcIcon: true } }
  })
  await settle()
  return { router, wrapper }
}

describe('OpenFile', () => {
  beforeEach(() => setAppConfig(undefined))

  it('leitet eine Packliste aus dem Space zur Liste weiter', async () => {
    const { router } = await open(
      'project/material-team/Zeltkonfigurator/packlisten/Sommerlager%202027.packliste'
    )
    expect(router.currentRoute.value.name).toBe('zeltkonfigurator-liste')
    expect(router.currentRoute.value.params.id).toBe('Sommerlager 2027')
  })

  it('leitet die Bestandsdatei zum Bestand weiter', async () => {
    const { router } = await open('project/material-team/Zeltkonfigurator/Zeltmaterial.bestand')
    expect(router.currentRoute.value.name).toBe('zeltkonfigurator-bestand')
  })

  it('zeigt eine Meldung für Dateien außerhalb des Ablageorts', async () => {
    const { router, wrapper } = await open('personal/admin/Kopie.packliste')
    expect(router.currentRoute.value.name).toBe('zeltkonfigurator-datei')
    expect(wrapper.find('[role="alert"]').text()).toContain('Zeltkonfigurator')
  })
})
