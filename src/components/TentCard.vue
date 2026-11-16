<template>
  <oc-card
    tag="article"
    class="zk-card ext:mb-3"
    :class="{ 'zk-card-highlight': highlighted, 'zk-card-dragging': dragging }"
    :data-tent-id="tent.id"
    :aria-label="title"
    body-class="ext:p-3"
  >
    <div class="ext:flex ext:flex-wrap ext:items-center ext:gap-2">
      <!-- Ziehen ist nur eine Mausabkürzung; per Tastatur und Touch dienen die Pfeil-Knöpfe. -->
      <span
        v-if="pl.canWrite.value"
        class="zk-drag-handle zk-no-print"
        draggable="true"
        aria-hidden="true"
        :title="$gettext('Zum Sortieren ziehen')"
        @dragstart="emit('dragstart', $event)"
        @dragend="emit('dragend', $event)"
      >
        <oc-icon name="draggable" size="small" />
      </span>
      <h3 class="ext:font-bold ext:text-lg ext:grow ext:text-left">{{ title }}</h3>
      <div v-if="pl.canWrite.value" class="zk-no-print ext:flex ext:gap-1">
        <template v-if="type">
          <oc-button
            size="small"
            :disabled="index === 0"
            :aria-label="$gettext('Nach oben')"
            @click="pl.moveTent(tent.id, -1)"
          >
            <oc-icon name="arrow-up" size="small" />
          </oc-button>
          <oc-button
            size="small"
            :disabled="index === count - 1"
            :aria-label="$gettext('Nach unten')"
            @click="pl.moveTent(tent.id, 1)"
          >
            <oc-icon name="arrow-down" size="small" />
          </oc-button>
        </template>
        <oc-button
          v-if="type"
          size="small"
          :aria-expanded="expanded"
          :aria-controls="`${uid}-details`"
          @click="expanded = !expanded"
        >
          {{ expanded ? $gettext('Fertig') : $gettext('Anpassen') }}
        </oc-button>
        <oc-button
          size="small"
          :aria-label="$gettext('%{name} entfernen', { name: title })"
          @click="confirmRemove = true"
        >
          <oc-icon name="delete-bin" size="small" />
          <span v-if="!type">{{ $gettext('Entfernen') }}</span>
        </oc-button>
      </div>
    </div>

    <p v-if="!type" class="zk-error ext:mt-2" role="alert">
      {{
        $gettext(
          'Dieser Zelttyp ist nicht mehr im Katalog. Das Zelt kann nur noch entfernt werden.'
        )
      }}
    </p>

    <template v-else>
      <!-- Eine Zeile statt vieler Felder: Die Auswahl steckt hinter „Anpassen“. -->
      <p class="zk-tent-summary">
        {{ summary }}
        <span v-if="!isDefault" class="zk-tent-custom">· {{ $gettext('angepasst') }}</span>
        <oc-tag v-if="missingTotal > 0" class="zk-tent-missing ext:ml-2" size="small">{{
          $ngettext('fehlt: %{n} Teil', 'fehlt: %{n} Teile', missingTotal, {
            n: String(missingTotal)
          })
        }}</oc-tag>
      </p>

      <div v-if="expanded && pl.canWrite.value" :id="`${uid}-details`" class="zk-no-print ext:mt-3">
        <div class="zk-tent-fields">
          <oc-text-input
            :id="`${uid}-label`"
            :label="$gettext('Bezeichnung')"
            :model-value="tent.label ?? ''"
            @update:model-value="onLabel"
          />

          <oc-select
            v-if="type.roofs.length > 1"
            :id="`${uid}-roof`"
            :label="$gettext('Dach')"
            :options="type.roofs"
            :model-value="roof"
            :clearable="false"
            :searchable="false"
            @update:model-value="(o: { id: string }) => pl.updateTent(tent.id, { roofId: o.id })"
          />

          <oc-select
            v-if="type.walls.length > 1"
            :id="`${uid}-wall`"
            :label="$gettext('Seitenwand')"
            :options="type.walls"
            :model-value="wall"
            :clearable="false"
            :searchable="false"
            @update:model-value="(o: { id: string }) => pl.updateTent(tent.id, { wallId: o.id })"
          />

          <oc-select
            v-if="wall && wall.builds.length > 1"
            :id="`${uid}-build`"
            :label="$gettext('Bauart')"
            :options="wall.builds"
            :model-value="build"
            :clearable="false"
            :searchable="false"
            @update:model-value="(o: { id: string }) => pl.updateTent(tent.id, { buildId: o.id })"
          />

          <oc-select
            v-if="showFinish"
            :id="`${uid}-finish`"
            :label="$gettext('Ausführung')"
            :options="finishes"
            :model-value="finishes.find((f) => f.id === tent.finish)"
            :clearable="false"
            :searchable="false"
            @update:model-value="(o: { id: Finish }) => pl.updateTent(tent.id, { finish: o.id })"
          />
        </div>

        <div class="ext:flex ext:flex-wrap ext:gap-1 ext:mt-3">
          <oc-button size="small" :disabled="isDefault" @click="pl.resetTent(tent.id)">{{
            $gettext('Zurücksetzen')
          }}</oc-button>
          <oc-button size="small" @click="pl.duplicateTent(tent.id)">
            <oc-icon name="file-copy" size="small" />
            <span>{{ $gettext('Duplizieren') }}</span>
          </oc-button>
        </div>
      </div>
    </template>

    <ul v-if="lines.length" class="zk-deviations ext:mt-2" :aria-label="$gettext('Abweichungen')">
      <li v-for="(line, i) in lines" :key="i">{{ line }}</li>
    </ul>
    <ul
      v-if="missingLines.length"
      class="zk-missing-list ext:mt-2"
      :aria-label="$gettext('Fehlendes Material')"
    >
      <li v-for="line in missingLines" :key="line">{{ line }}</li>
    </ul>

    <ConfirmDialog
      v-if="confirmRemove"
      :title="$gettext('%{name} entfernen?', { name: title })"
      @confirm="onRemove"
      @cancel="confirmRemove = false"
    />
  </oc-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { UsePacklist } from '../composables/usePacklist'
import { catalog } from '../domain/catalog'
import { hasDefaultOptions } from '../domain/packlist'
import type { Finish, TentConfig } from '../domain/types'
import { describeDeviation } from '../domain/view/deviations'
import { hasFinishLayer } from '../domain/walls'
import ConfirmDialog from './ConfirmDialog.vue'
import './forms.css'

const props = defineProps<{
  tent: TentConfig
  index: number
  count: number
  pl: UsePacklist
  /** Kurz hervorgehoben, z. B. direkt nach dem Hinzufügen. */
  highlighted?: boolean
  /** Wird gerade zum Sortieren gezogen. */
  dragging?: boolean
}>()
const emit = defineEmits<{ dragstart: [event: DragEvent]; dragend: [event: DragEvent] }>()
const { $gettext, $ngettext } = useGettext()

const confirmRemove = ref(false)

function onRemove() {
  confirmRemove.value = false
  props.pl.removeTent(props.tent.id)
}

const uid = computed(() => `zk-tent-${props.tent.id}`)
const type = computed(() => catalog.tentTypes.find((t) => t.id === props.tent.typeId))
const wall = computed(() => type.value?.walls.find((w) => w.id === props.tent.wallId))
const roof = computed(() => type.value?.roofs.find((r) => r.id === props.tent.roofId))
const build = computed(() => wall.value?.builds.find((b) => b.id === props.tent.buildId))
const showFinish = computed(() => !!build.value && hasFinishLayer(build.value))
const isDefault = computed(() => !type.value || hasDefaultOptions(props.tent, type.value))

/** Aufgeklappt wird nur auf Wunsch; ein neues Zelt steht in seiner Standardkonfiguration. */
const expanded = ref(false)

const title = computed(() => {
  const name = type.value?.name ?? props.tent.typeId
  const label = props.tent.label?.trim()
  return `${props.index + 1}. ${name}${label ? ` – ${label}` : ''}`
})

const finishes = computed<{ id: Finish; label: string }[]>(() => [
  { id: 'blanko', label: $gettext('Blanko') },
  { id: 'fenster', label: $gettext('Fenster') },
  { id: 'gaze', label: $gettext('Gaze') }
])

/** Die Konfiguration in einer Zeile, z. B. „Jurtendach · Hoch · Superbahn · Gaze“. */
const summary = computed(() => {
  const parts = [roof.value?.label, wall.value?.label]
  if (wall.value && wall.value.builds.length > 1) {
    parts.push(build.value?.label)
  }
  if (showFinish.value) {
    parts.push(finishes.value.find((f) => f.id === props.tent.finish)?.label)
  }
  return parts.filter(Boolean).join(' · ')
})

const lines = computed(() =>
  (props.pl.list.value?.deviations ?? [])
    .filter((d) => d.tentId === props.tent.id)
    .map((d) => describeDeviation(d, $gettext))
)

/** Fehlende Artikel dieses Zeltes, z. B. „4 × T-Profil fehlen“. */
const missingItems = computed(() =>
  (props.pl.list.value?.items ?? [])
    .map((item) => ({ name: item.name, n: item.missingPerTent[props.tent.id] ?? 0 }))
    .filter((m) => m.n > 0)
)
const missingTotal = computed(() => missingItems.value.reduce((sum, m) => sum + m.n, 0))
const missingLines = computed(() =>
  missingItems.value.map((m) =>
    $ngettext('%{n} × %{name} fehlt', '%{n} × %{name} fehlen', m.n, {
      n: String(m.n),
      name: m.name
    })
  )
)

function onLabel(value: string) {
  props.pl.updateTent(props.tent.id, { label: value })
}
</script>

<style>
.zk-tent-summary,
.zk-tent-custom {
  color: var(--oc-role-on-surface-variant, inherit);
}
.zk-drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  cursor: grab;
  touch-action: none;
}
.zk-card-dragging {
  opacity: 0.5;
}
.zk-card-highlight {
  animation: zk-highlight 2s ease-out;
}
@keyframes zk-highlight {
  from {
    box-shadow: 0 0 0 3px var(--oc-role-primary, #0a5bd3);
  }
  to {
    box-shadow: 0 0 0 3px transparent;
  }
}
@media (prefers-reduced-motion: reduce) {
  .zk-card-highlight {
    animation: none;
    box-shadow: 0 0 0 3px var(--oc-role-primary, #0a5bd3);
  }
}
.zk-tent-missing {
  color: var(--oc-role-error, #b3261e);
}
.zk-missing-list {
  color: var(--oc-role-error, #b3261e);
  list-style: disc inside;
}
.zk-deviations {
  color: var(--oc-role-on-surface-variant, inherit);
  list-style: disc inside;
}
</style>
