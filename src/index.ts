import { AppWrapperRoute, defineWebApplication } from '@opencloud-eu/web-pkg'
import '@opencloud-eu/extension-sdk/tailwind.css'
import { RouteRecordRaw } from 'vue-router'
import { useGettext } from 'vue3-gettext'
import { setAppConfig } from './storage/appConfig'
import PacklistEditor from './views/PacklistEditor.vue'

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
          // Datei-Icon in der Dateiliste und im „Neu“-Menü
          icon: { name: 'resource-type-form', fillType: 'fill' as const },
          newFileMenu: {
            menuTitle: () => $gettext('Packliste'),
            defaultName: () => $gettext('Neue Packliste')
          }
        },
        {
          extension: 'bestand',
          routeName: 'zeltkonfigurator-bestand',
          label: $gettext('Im Zeltkonfigurator öffnen'),
          icon: { name: 'resource-type-spreadsheet', fillType: 'fill' as const }
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
        // Im App-Rahmen von OpenCloud: Kopfleiste mit Dateiname, Schließen und Dateiaktionen.
        component: AppWrapperRoute(PacklistEditor, { applicationId: appInfo.id }),
        meta: { authContext: 'user', title: $gettext('Packliste'), patchCleanPath: true }
      },
      {
        // Der Bestand liegt immer am festen Ablageort. Mit Datei in der Adresse läuft er im
        // App-Rahmen, ohne Datei sucht StockRoute die Bestandsdatei und wechselt dorthin.
        path: '/bestand/:driveAliasAndItem(.*)?',
        name: 'zeltkonfigurator-bestand',
        component: () => import('./views/StockRoute.vue'),
        meta: { authContext: 'user', title: $gettext('Bestand'), patchCleanPath: true }
      }
    ]

    return { appInfo, routes }
  }
})
