<template>
  <FramedInventory v-if="hasFile" />
  <InventoryView v-else-if="unframed" />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { LocationQueryRaw } from 'vue-router'
import { AppWrapperRoute, useClientService } from '@opencloud-eu/web-pkg'
import { useAppRouter } from '../composables/useAppRouter'
import { APP_ID } from '../storage/createDocument'
import { useStockLocation } from '../storage/createStore'
import InventoryView from './InventoryView.vue'

// Mit Datei in der Adresse läuft der Bestand im App-Rahmen von OpenCloud.
const FramedInventory = AppWrapperRoute(InventoryView, { applicationId: APP_ID })

const { router, route } = useAppRouter()
const clientService = useClientService()
const stockLocation = useStockLocation()

const hasFile = computed(() => !!route.value.params.driveAliasAndItem || !!route.value.query.fileId)
// Ohne Rahmen nur, wenn es die Bestandsdatei noch nicht gibt oder sie nicht erreichbar ist;
// die Ansicht zeigt dann selbst den leeren Bestand bzw. die Fehlermeldung.
const unframed = ref(false)

onMounted(async () => {
  if (hasFile.value) return
  try {
    const { space, path } = await stockLocation()
    const resource = await clientService.webdav.getFileInfo(space, { path })
    const driveAliasAndItem = space.getDriveAliasAndItem(resource)
    await router.replace({
      name: route.value.name ?? undefined,
      params: { driveAliasAndItem },
      // „Schließen“ im Rahmen führt in den Ordner der Bestandsdatei. OpenClouds Router nimmt
      // (anders als die Typen von vue-router) verschachtelte Query-Werte an.
      query: {
        ...route.value.query,
        fileId: resource.fileId,
        contextRouteName: 'files-spaces-generic',
        contextRouteParams: {
          driveAliasAndItem: driveAliasAndItem.split('/').slice(0, -1).join('/')
        }
      } as unknown as LocationQueryRaw
    })
  } catch {
    unframed.value = true
  }
})
</script>
