<template>
  <div class="zk-banner ext:p-3 ext:mb-4 ext:rounded" :class="`zk-banner-${status}`" role="status">
    <strong>{{ headline }}</strong>
    <oc-button
      v-if="target"
      class="zk-banner-action ext:ml-2"
      appearance="raw"
      @click="emit('show', target)"
      >{{ actionLabel }}</oc-button
    >
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { PacklistStatus } from '../domain/view/status'

const props = defineProps<{ status: PacklistStatus; missingCount?: number }>()
/** Wunsch, zu einem Reiter zu wechseln („anzeigen“ bei fehlendem Material, Hinweis bei leerer Liste). */
const emit = defineEmits<{ show: [tab: 'bedarf' | 'zelte'] }>()
const { $gettext, $ngettext } = useGettext()

const headline = computed(() => {
  switch (props.status) {
    case 'fehlt':
      return $ngettext('%{n} Artikel fehlt', '%{n} Artikel fehlen', props.missingCount ?? 0, {
        n: String(props.missingCount ?? 0)
      })
    case 'ausweichmaterial':
      return $gettext('Mit Ausweichmaterial machbar')
    case 'ok':
      return $gettext('Alles vorhanden')
    default:
      return $gettext('Noch keine Zelte')
  }
})

const target = computed<'bedarf' | 'zelte' | null>(() =>
  props.status === 'fehlt' ? 'bedarf' : props.status === 'leer' ? 'zelte' : null
)

const actionLabel = computed(() =>
  props.status === 'fehlt'
    ? $gettext('anzeigen')
    : $gettext('Füge im Reiter „Zelte“ das erste Zelt hinzu.')
)
</script>

<style>
.zk-banner {
  border: 1px solid var(--oc-role-outline, #888);
  background: var(--oc-role-surface-container, #f2f2f2);
  color: var(--oc-role-on-surface, #1a1a1a);
}
.zk-banner-action {
  min-height: 44px;
  text-decoration: underline;
}
.zk-banner-fehlt {
  border-color: var(--oc-role-error, #b3261e);
  background: var(--oc-role-error-container, #f9dedc);
  color: var(--oc-role-on-error-container, #410e0b);
}
.zk-banner-ausweichmaterial {
  border-color: #b26a00;
  background: color-mix(in srgb, #ffb300 22%, var(--oc-role-surface, #fff));
  color: var(--oc-role-on-surface, #1a1a1a);
}
.zk-banner-ok {
  border-color: #2e7d32;
  background: color-mix(in srgb, #4caf50 20%, var(--oc-role-surface, #fff));
  color: var(--oc-role-on-surface, #1a1a1a);
}
</style>
