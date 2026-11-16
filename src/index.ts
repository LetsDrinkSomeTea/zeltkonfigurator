import {
  defineWebApplication,
  Extension,
  AppMenuItemExtension,
  AppNavigationItem
} from '@opencloud-eu/web-pkg'
import { urlJoin } from '@opencloud-eu/web-client'
import '@opencloud-eu/extension-sdk/tailwind.css'
import { RouteRecordRaw } from 'vue-router'
import { computed } from 'vue'
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
      // Dateien der App lassen sich aus der Dateiansicht heraus öffnen.
      extensions: [
        {
          extension: 'packliste',
          routeName: 'zeltkonfigurator-datei',
          label: $gettext('Im Zeltkonfigurator öffnen'),
          icon: 'list-check'
        },
        {
          extension: 'zeltbestand',
          routeName: 'zeltkonfigurator-datei',
          label: $gettext('Im Zeltkonfigurator öffnen'),
          icon: 'archive'
        }
      ]
    }

    const routes: RouteRecordRaw[] = [
      {
        path: '/',
        redirect: `/${appInfo.id}/listen`
      },
      {
        path: '/listen',
        name: 'zeltkonfigurator-listen',
        component: () => import('./views/PacklistOverview.vue'),
        meta: { authContext: 'user', title: $gettext('Packlisten') }
      },
      {
        path: '/listen/:id',
        name: 'zeltkonfigurator-liste',
        component: () => import('./views/PacklistEditor.vue'),
        meta: { authContext: 'user', title: $gettext('Packliste') }
      },
      {
        // Einstieg aus der Dateiansicht: leitet zur passenden Ansicht weiter.
        path: '/datei/:driveAliasAndItem(.*)?',
        name: 'zeltkonfigurator-datei',
        component: () => import('./views/OpenFile.vue'),
        meta: { authContext: 'user', title: $gettext('Zeltkonfigurator'), patchCleanPath: true }
      },
      {
        path: '/bestand',
        name: 'zeltkonfigurator-bestand',
        component: () => import('./views/InventoryView.vue'),
        meta: { authContext: 'user', title: $gettext('Bestand') }
      }
    ]

    // Seitenleiste von OpenCloud; wird angezeigt, sobald es mehr als einen Eintrag gibt.
    const navItems: AppNavigationItem[] = [
      {
        name: () => $gettext('Packlisten'),
        icon: 'list-check',
        route: { path: `/${appInfo.id}/listen` },
        activeFor: [{ path: `/${appInfo.id}/listen` }]
      },
      {
        name: () => $gettext('Bestand'),
        icon: 'archive',
        route: { path: `/${appInfo.id}/bestand` }
      }
    ]

    const extensions = computed<Extension[]>(() => {
      const menuItems: AppMenuItemExtension[] = [
        {
          // registers a menu item for the app switcher
          id: `app.${appInfo.id}.menuItem`,
          type: 'appMenuItem',
          label: () => appInfo.name,
          color: appInfo.color,
          icon: appInfo.icon,
          path: urlJoin(appInfo.id)
        }
      ]
      return [...menuItems]
    })

    return {
      appInfo,
      navItems,
      routes,
      extensions
    }
  }
})
