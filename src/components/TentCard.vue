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
        v-if="pl.canWrite.value && single"
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
      <div v-if="pl.canWrite.value" class="zk-no-print ext:flex ext:flex-wrap ext:gap-1">
        <template v-if="type && single">
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
        <oc-button v-if="!single" size="small" @click="emit('split')">
          {{ $gettext('Einzeln bearbeiten') }}
        </oc-button>
        <oc-button
          size="small"
          :aria-label="
            single
              ? $gettext('%{name} entfernen', { name: title })
              : $gettext('Alle %{name} entfernen', { name: title })
          "
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
      <p class="zk-tent-summary">
        {{ summary }}
        <span v-if="!isDefault" class="zk-tent-custom">· {{ $gettext('angepasst') }}</span>
        <oc-tag v-if="missingTotal > 0" class="zk-tent-missing ext:ml-2" size="small">{{
          $ngettext('fehlt: %{n} Teil', 'fehlt: %{n} Teile', missingTotal, {
            n: String(missingTotal)
          })
        }}</oc-tag>
      </p>

      <div v-if="pl.canWrite.value" :id="`${uid}-details`" class="zk-no-print ext:mt-2">
        <template v-for="r in roofRows" :key="r.index">
          <ChoiceGroup
            v-if="r.module.roofs.length > 1"
            :class="`${uid}-roof-${r.index}`"
            :label="r.roofLabel"
            :options="r.module.roofs"
            :model-value="r.roof?.id ?? ''"
            @update:model-value="(id: string) => setRoof(r.index, { roofId: id })"
          />
          <ChoiceGroup
            v-if="r.module.setups.length > 1"
            :class="`${uid}-setup-${r.index}`"
            :label="r.setupLabel"
            :options="r.module.setups"
            :model-value="r.setup?.id ?? ''"
            @update:model-value="(id: string) => setRoof(r.index, { setupId: id })"
          />
        </template>
        <ChoiceGroup
          v-if="type.walls.length > 1"
          :class="`${uid}-wall`"
          :label="$gettext('Seitenwand')"
          :options="type.walls"
          :model-value="tent.wallId"
          @update:model-value="(id: string) => update({ wallId: id })"
        />
        <ChoiceGroup
          v-if="wall && wall.builds.length > 1"
          :class="`${uid}-build`"
          :label="$gettext('Bauart')"
          :options="wall.builds"
          :model-value="build?.id ?? ''"
          @update:model-value="(id: string) => update({ buildId: id })"
        />
        <ChoiceGroup
          v-if="showFinish"
          :class="`${uid}-finish`"
          :label="$gettext('Ausführung')"
          :options="finishes"
          :model-value="tent.finish"
          @update:model-value="(id: string) => update({ finish: id as Finish })"
        />

        <div class="ext:flex ext:flex-wrap ext:items-end ext:gap-2 ext:mt-2">
          <oc-text-input
            v-if="single"
            :id="`${uid}-label`"
            class="zk-tent-label"
            :label="$gettext('Bezeichnung (optional)')"
            :model-value="tent.label ?? ''"
            @update:model-value="onLabel"
          />
          <oc-button size="small" :disabled="isDefault" @click="reset">{{
            $gettext('Zurücksetzen')
          }}</oc-button>
          <oc-button v-if="single" size="small" @click="pl.duplicateTent(tent.id)">
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
      :title="
        single
          ? $gettext('%{name} entfernen?', { name: title })
          : $gettext('Alle %{name} entfernen?', { name: title })
      "
      @confirm="onRemove"
      @cancel="confirmRemove = false"
    />
  </oc-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { UsePacklist } from '../composables/usePacklist'
import { defaultTentRoofs, hasDefaultOptions } from '../domain/packlist'
import type { Finish, TentConfig, TentRoof } from '../domain/types'
import { describeDeviation } from '../domain/view/deviations'
import { roofNames } from '../domain/view/roofNames'
import { hasFinishLayer } from '../domain/walls'
import ChoiceGroup from './ChoiceGroup.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import './forms.css'

/**
 * Karte für ein Zelt oder eine Gruppe gleich eingestellter Zelte („3 × Jurte“). Bei einer Gruppe
 * gelten Änderungen für alle; „Einzeln bearbeiten“ zeigt die Zelte als eigene Karten.
 */
const props = defineProps<{
  /** ein Zelt oder mehrere gleich eingestellte */
  tents: TentConfig[]
  /** Position des (ersten) Zeltes in der Liste */
  index: number
  count: number
  pl: UsePacklist
  /** Kurz hervorgehoben, z. B. direkt nach dem Hinzufügen. */
  highlighted?: boolean
  /** Wird gerade zum Sortieren gezogen. */
  dragging?: boolean
}>()
const emit = defineEmits<{
  dragstart: [event: DragEvent]
  dragend: [event: DragEvent]
  split: []
}>()
const { $gettext, $ngettext } = useGettext()

const tent = computed(() => props.tents[0])
const single = computed(() => props.tents.length === 1)
const ids = computed(() => props.tents.map((t) => t.id))
const confirmRemove = ref(false)

function onRemove() {
  confirmRemove.value = false
  for (const id of ids.value) props.pl.removeTent(id)
}

function update(patch: Partial<Omit<TentConfig, 'id' | 'typeId'>>) {
  for (const id of ids.value) props.pl.updateTent(id, patch)
}

function reset() {
  for (const id of ids.value) props.pl.resetTent(id)
}

const uid = computed(() => `zk-tent-${tent.value.id}`)
const type = computed(() =>
  props.pl.catalog.value.tentTypes.find((t) => t.id === tent.value.typeId)
)
const wall = computed(() => type.value?.walls.find((w) => w.id === tent.value.wallId))

/** Je Dach-Baustein: gewähltes Dach und Aufbau samt Beschriftung. */
const roofRows = computed(() => {
  const t = type.value
  if (!t) return []
  const names = roofNames(t.modules)
  const roofs =
    tent.value.roofs.length === t.modules.length ? tent.value.roofs : defaultTentRoofs(t)
  return t.modules.map((module, index) => {
    const pick = roofs[index]
    const prefix = names[index] ? `${names[index]}: ` : ''
    return {
      index,
      module,
      roof: module.roofs.find((r) => r.id === pick.roofId),
      setup: module.setups.find((s) => s.id === pick.setupId),
      roofLabel: prefix + $gettext('Dach'),
      setupLabel: prefix + $gettext('Aufbau')
    }
  })
})

function setRoof(index: number, patch: Partial<TentRoof>) {
  const t = type.value
  if (!t) return
  const current =
    tent.value.roofs.length === t.modules.length ? tent.value.roofs : defaultTentRoofs(t)
  update({ roofs: current.map((r, i) => (i === index ? { ...r, ...patch } : r)) })
}

const build = computed(
  () => wall.value?.builds.find((b) => b.id === tent.value.buildId) ?? wall.value?.builds[0]
)
const showFinish = computed(() => !!build.value && hasFinishLayer(build.value))
const isDefault = computed(() => !type.value || hasDefaultOptions(tent.value, type.value))

const title = computed(() => {
  const name = type.value?.name ?? tent.value.typeId
  if (!single.value) return `${props.tents.length} × ${name}`
  const label = tent.value.label?.trim()
  return `${props.index + 1}. ${name}${label ? ` – ${label}` : ''}`
})

const finishes = computed<{ id: Finish; label: string }[]>(() => [
  { id: 'blanko', label: $gettext('Blanko') },
  { id: 'fenster', label: $gettext('Fenster') },
  { id: 'gaze', label: $gettext('Gaze') }
])

/** Die Konfiguration in einer Zeile, z. B. „Jurtendach · Hoch · Superbahn · Gaze“. */
const summary = computed(() => {
  const roofParts = roofRows.value.map((r) => {
    const label = r.roof?.label ?? ''
    // Nicht-Standard-Aufbau (z. B. „Gehängt“) mit nennen
    return r.setup && r.setup.id !== r.module.setups[0].id ? `${label} (${r.setup.label})` : label
  })
  // Gleiche Dächer zusammenfassen: „3 × Jurtendach“
  const counted = new Map<string, number>()
  for (const p of roofParts) counted.set(p, (counted.get(p) ?? 0) + 1)
  const roofText = [...counted].map(([p, n]) => (n > 1 ? `${n} × ${p}` : p))
  const parts = [...roofText, wall.value?.label]
  if (wall.value && wall.value.builds.length > 1) {
    parts.push(build.value?.label)
  }
  if (showFinish.value) {
    parts.push(finishes.value.find((f) => f.id === tent.value.finish)?.label)
  }
  return parts.filter(Boolean).join(' · ')
})

const lines = computed(() =>
  (props.pl.list.value?.deviations ?? [])
    .filter((d) => ids.value.includes(d.tentId))
    .map((d) => describeDeviation(d, $gettext))
)

/** Fehlende Artikel dieser Zelte, z. B. „4 × T-Profil fehlen“. */
const missingItems = computed(() =>
  (props.pl.list.value?.items ?? [])
    .map((item) => ({
      name: item.name,
      n: ids.value.reduce((sum, id) => sum + (item.missingPerTent[id] ?? 0), 0)
    }))
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
  props.pl.updateTent(tent.value.id, { label: value })
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
.zk-tent-label {
  flex: 1 1 14rem;
}
.zk-tent-label input {
  width: 100%;
  box-sizing: border-box;
}
.zk-deviations {
  color: var(--oc-role-on-surface-variant, inherit);
  list-style: disc inside;
}
</style>
