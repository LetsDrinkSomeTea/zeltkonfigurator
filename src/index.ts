import { defineWebApplication, Extension, AppMenuItemExtension } from '@opencloud-eu/web-pkg'
import { urlJoin } from '@opencloud-eu/web-client'
import '@opencloud-eu/extension-sdk/tailwind.css'
import { RouteRecordRaw } from 'vue-router'
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'

export default defineWebApplication({
  setup() {
    const { $gettext } = useGettext()

    const appInfo = {
      id: 'zeltkonfigurator',
      name: $gettext('Zeltkonfigurator'),
      icon: 'home-3',
      color: '#1f3a2d'
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
        path: '/bestand',
        name: 'zeltkonfigurator-bestand',
        component: () => import('./views/InventoryView.vue'),
        meta: { authContext: 'user', title: $gettext('Bestand') }
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
      routes,
      extensions
    }
  }
})
