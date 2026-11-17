<template>
  <div class="preview">
    <nav class="preview-nav zk-no-print">
      <strong>Vorschau</strong>
      <router-link to="/liste/Sommerlager.packliste">Packliste</router-link>
      <router-link :to="{ name: 'zeltkonfigurator-bestand' }">Materialliste</router-link>
    </nav>
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue'
import { useRoute } from 'vue-router'
import { documentKey, provideStore } from '../../src/composables/useStore'
import { packlistName } from '../../src/domain/fileNames'
import type { MemoryDataStore } from '../../src/storage/MemoryDataStore'

const props = defineProps<{ store: MemoryDataStore }>()
provideStore(props.store)

// In der Vorschau ist jede Adresse unter /liste/ eine Packliste; fehlt sie, entsteht sie leer –
// so wie über „Neu“ in der Dateiansicht.
const route = useRoute()
provide(documentKey, () => {
  const id = packlistName(String(route.params.driveAliasAndItem ?? ''))
  props.store.createEmptyFile(id)
  return props.store.document(id)
})
</script>

<style>
body {
  margin: 0;
  background: var(--oc-role-surface);
  color: var(--oc-role-on-surface);
  font-family: var(--oc-font-family);
}
.preview-nav {
  display: flex;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background: var(--oc-role-surface-container);
}
</style>
