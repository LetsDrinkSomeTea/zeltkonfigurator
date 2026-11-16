<template>
  <div class="preview">
    <nav class="preview-nav zk-no-print">
      <strong>Vorschau</strong>
      <router-link :to="{ name: 'zeltkonfigurator-listen' }">Packlisten</router-link>
      <router-link :to="{ name: 'zeltkonfigurator-bestand' }">Bestand</router-link>
    </nav>
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { provideStore } from '../../src/composables/useStore'
import type { DataStore } from '../../src/storage/DataStore'

const props = defineProps<{ store: DataStore }>()
provideStore(props.store)
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
