import { defineWebApplication } from '@opencloud-eu/web-pkg'
import '@opencloud-eu/extension-sdk/tailwind.css'
import { RouteRecordRaw } from 'vue-router'
import { useGettext } from 'vue3-gettext'
import { setAppConfig } from './storage/appConfig'

export default defineWebApplication({
  setup({ applicationConfig }) {
    setAppConfig(applicationConfig)
    const { $gettext } = useGettext()

    const appInfo = {
      id: 'zeltkonfigurator',
      name: $gettext('Zeltkonfigurator'),
      icon: 'home-3',
      color: '#1f3a2d',
      // Kein Eintrag im App-Umschalter: Die App wird über ihre Dateien geöffnet.
      extensions: [
        {
          // Packlisten lassen sich über „Neu“ in jedem Ordner anlegen.
          extension: 'packliste',
          routeName: 'zeltkonfigurator-liste',
          label: $gettext('Im Zeltkonfigurator öffnen'),
          icon: 'list-check',
          newFileMenu: {
            menuTitle: () => $gettext('Packliste'),
            defaultName: () => $gettext('Neue Packliste')
          }
        },
        {
          extension: 'bestand',
          routeName: 'zeltkonfigurator-bestand',
          label: $gettext('Im Zeltkonfigurator öffnen'),
          icon: 'archive'
        }
      ]
    }

    const routes: RouteRecordRaw[] = [
      {
        path: '/',
        redirect: `/${appInfo.id}/bestand`
      },
      {
        // Die Packliste liegt dort, wo die Adresse hinzeigt (Space und Pfad).
        path: '/liste/:driveAliasAndItem(.*)?',
        name: 'zeltkonfigurator-liste',
        component: () => import('./views/PacklistEditor.vue'),
        meta: { authContext: 'user', title: $gettext('Packliste'), patchCleanPath: true }
      },
      {
        // Der Bestand liegt immer am festen Ablageort; der Pfad in der Adresse ist nur der
        // Einstieg aus der Dateiansicht.
        path: '/bestand/:driveAliasAndItem(.*)?',
        name: 'zeltkonfigurator-bestand',
        component: () => import('./views/InventoryView.vue'),
        meta: { authContext: 'user', title: $gettext('Bestand'), patchCleanPath: true }
      }
    ]

    return { appInfo, routes }
  }
})
