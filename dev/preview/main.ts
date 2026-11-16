import '@opencloud-eu/design-system/dist/design-system.css'
import './host.css'
import './preview.css'
import DesignSystem from '@opencloud-eu/design-system'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createGettext } from 'vue3-gettext'
import { MemoryDataStore } from '../../src/storage/MemoryDataStore'
import Preview from './Preview.vue'
import { sampleStock } from './sampleData'

const params = new URLSearchParams(location.search)
const store = new MemoryDataStore({
  writable: params.get('readonly') === null,
  stock: sampleStock
})
if (params.get('dark') !== null) {
  document.documentElement.dataset.colorScheme = 'dark'
}

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/liste/Sommerlager.packliste' },
    {
      path: '/liste/:driveAliasAndItem(.*)?',
      name: 'zeltkonfigurator-liste',
      component: () => import('../../src/views/PacklistEditor.vue')
    },
    {
      path: '/bestand/:driveAliasAndItem(.*)?',
      name: 'zeltkonfigurator-bestand',
      component: () => import('../../src/views/InventoryView.vue')
    }
  ]
})

createApp(Preview, { store })
  .use(createPinia())
  .use(router)
  .use(createGettext({ translations: {}, silent: true }))
  .use(DesignSystem)
  .mount('#app')
