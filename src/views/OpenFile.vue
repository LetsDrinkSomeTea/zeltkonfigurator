<template>
  <AppLayout :title="$gettext('Zeltkonfigurator')">
    <p v-if="problem" class="zk-error" role="alert">{{ problem }}</p>
    <p v-if="problem" class="ext:mt-4">
      <router-link class="ext:underline" :to="{ name: 'zeltkonfigurator-listen' }">{{
        $gettext('Zu den Packlisten')
      }}</router-link>
    </p>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useGettext } from 'vue3-gettext'
import AppLayout from '../components/AppLayout.vue'
import { useAppRouter } from '../composables/useAppRouter'
import { matchAppFile } from '../domain/fileNames'
import { getAppConfig } from '../storage/appConfig'
import { readStorageConfig } from '../storage/location'

/**
 * Wird von OpenCloud aufgerufen, wenn in der Dateiansicht eine .packliste- oder
 * .zeltbestand-Datei geöffnet wird, und leitet zur passenden Ansicht der App weiter.
 */
const { $gettext } = useGettext()
const { router, route } = useAppRouter()
const problem = ref('')

onMounted(async () => {
  const raw = route.value.params.driveAliasAndItem
  const path = Array.isArray(raw) ? raw.join('/') : (raw ?? '')
  const { folder } = readStorageConfig(getAppConfig())
  const file = matchAppFile(path, folder)
  if (file?.kind === 'packliste') {
    await router.replace({ name: 'zeltkonfigurator-liste', params: { id: file.id } })
  } else if (file?.kind === 'bestand') {
    await router.replace({ name: 'zeltkonfigurator-bestand' })
  } else {
    problem.value = $gettext(
      'Diese Datei liegt nicht im Ablageort des Zeltkonfigurators (Ordner „%{folder}“) und kann hier nicht geöffnet werden.',
      { folder }
    )
  }
})
</script>
