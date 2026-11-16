<template>
  <main class="zk-app ext:p-4 ext:mx-auto ext:max-w-5xl">
    <nav class="zk-no-print ext:flex ext:gap-4 ext:mb-4" :aria-label="$gettext('Bereiche')">
      <router-link :to="{ name: 'zeltkonfigurator-listen' }">{{
        $gettext('Packlisten')
      }}</router-link>
      <router-link :to="{ name: 'zeltkonfigurator-bestand' }">{{
        $gettext('Bestand')
      }}</router-link>
    </nav>
    <header class="ext:flex ext:flex-wrap ext:items-center ext:gap-2 ext:mb-4">
      <h1 class="ext:text-xl ext:font-bold ext:grow">{{ title }}</h1>
      <slot name="actions" />
    </header>
    <p v-if="error" class="zk-error ext:mb-4" role="alert">{{ errorMessage(error) }}</p>
    <oc-spinner v-if="loading" :aria-label="$gettext('Wird geladen')" />
    <slot v-else />
  </main>
</template>

<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
import {
  ConflictError,
  ForbiddenError,
  InvalidFileError,
  NotConfiguredError,
  NotFoundError
} from '../storage/DataStore'

defineProps<{ title: string; loading?: boolean; error?: Error | null }>()

const { $gettext } = useGettext()

/** Übersetzt Speicherfehler in verständliche Meldungen (F-42, N-05). */
function errorMessage(e: Error): string {
  if (e instanceof NotConfiguredError) {
    return (
      $gettext('Der Ablageort ist nicht eingerichtet oder der Space wurde nicht gefunden.') +
      ' ' +
      e.message
    )
  }
  if (e instanceof ForbiddenError) {
    return $gettext('Du hast keinen Zugriff auf diese Daten.')
  }
  if (e instanceof NotFoundError) {
    return $gettext('Die Datei wurde nicht gefunden.')
  }
  if (e instanceof ConflictError) {
    return $gettext('Die Daten wurden gleichzeitig von jemand anderem geändert. Bitte neu laden.')
  }
  if (e instanceof InvalidFileError) {
    return $gettext('Die Datei ist beschädigt und wurde nicht geladen.') + ' ' + e.message
  }
  return $gettext('Es ist ein Fehler aufgetreten.') + ' ' + e.message
}
</script>

<style>
.zk-error {
  color: var(--oc-role-error, #b3261e);
}
@media print {
  .zk-no-print {
    display: none !important;
  }
}
</style>
