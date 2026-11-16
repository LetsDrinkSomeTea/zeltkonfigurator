<template>
  <!-- OpenCloud schneidet den App-Bereich ab, statt ihn zu scrollen; die App scrollt selbst. -->
  <div ref="scroller" class="zk-scroll ext:overflow-y-auto" :style="{ height }">
    <main class="zk-app ext:p-4 ext:mx-auto ext:max-w-5xl">
      <header class="zk-no-print ext:flex ext:flex-wrap ext:items-center ext:gap-2 ext:mb-4">
        <!-- Im App-Rahmen steht der Dateiname schon in der Kopfleiste; die Druckansicht hat eigenen Titel. -->
        <h1 class="ext:text-xl ext:font-bold ext:grow" :class="{ 'zk-print-only': framed }">
          {{ title }}
        </h1>
        <span v-if="framed" class="zk-no-print ext:grow" />
        <oc-tag v-if="readOnly" class="zk-readonly-badge zk-no-print" size="small">{{
          $gettext('Schreibgeschützt')
        }}</oc-tag>
        <slot name="actions" />
      </header>
      <p v-if="error" class="zk-error zk-no-print ext:mb-4" role="alert">
        {{ errorPrefix ? `${errorPrefix} ` : '' }}{{ errorMessage(error) }}
      </p>
      <oc-spinner v-if="loading" :aria-label="$gettext('Wird geladen')" />
      <slot v-else />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  ConflictError,
  ForbiddenError,
  InvalidFileError,
  NotConfiguredError,
  NotFoundError
} from '../storage/DataStore'

defineProps<{
  title: string
  loading?: boolean
  error?: Error | null
  /** Text vor der Fehlermeldung, z. B. „Nicht gespeichert:“ */
  errorPrefix?: string
  /** zeigt das Badge „Schreibgeschützt“ in der Kopfleiste */
  readOnly?: boolean
  framed?: boolean
}>()

const { $gettext } = useGettext()

// Höhe = sichtbarer Rest des Fensters unterhalb der OpenCloud-Leiste. Bewusst gemessen statt
// „100 %“, damit es nicht davon abhängt, wie der umgebende Container seine Höhe festlegt.
const scroller = ref<HTMLElement | null>(null)
const height = ref('100%')
function measure() {
  const top = scroller.value?.getBoundingClientRect().top ?? 0
  height.value = `calc(100dvh - ${Math.max(0, Math.round(top))}px)`
}
onMounted(() => {
  measure()
  window.addEventListener('resize', measure)
})
onBeforeUnmount(() => window.removeEventListener('resize', measure))

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
.zk-print-only {
  display: none;
}
@media print {
  .zk-print-only {
    display: block;
  }
  .zk-scroll {
    height: auto !important;
    overflow: visible !important;
  }
  .zk-no-print {
    display: none !important;
  }
}
</style>
