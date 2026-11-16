<template>
  <oc-card tag="article" class="zk-card ext:mb-3" :aria-label="title" body-class="ext:p-3">
    <div class="ext:flex ext:flex-wrap ext:items-center ext:gap-2 ext:mb-3">
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
          <oc-button size="small" @click="pl.duplicateTent(tent.id)">
            <oc-icon name="file-copy" size="small" />
            <span>{{ $gettext('Duplizieren') }}</span>
          </oc-button>
        </template>
        <oc-button size="small" @click="pl.removeTent(tent.id)">
          <oc-icon name="delete-bin" size="small" />
          <span>{{ $gettext('Entfernen') }}</span>
        </oc-button>
      </div>
    </div>

    <p v-if="!type" class="zk-error" role="alert">
      {{
        $gettext(
          'Dieser Zelttyp ist nicht mehr im Katalog. Das Zelt kann nur noch entfernt werden.'
        )
      }}
    </p>

    <div v-else class="zk-tent-fields">
      <oc-text-input
        :id="`${uid}-label`"
        :label="$gettext('Bezeichnung')"
        :model-value="tent.label ?? ''"
        :read-only="!pl.canWrite.value"
        @update:model-value="onLabel"
      />

      <oc-select
        v-if="type.roofs.length > 1"
        :id="`${uid}-roof`"
        :label="$gettext('Dach')"
        :options="type.roofs"
        :model-value="type.roofs.find((r) => r.id === tent.roofId)"
        :disabled="!pl.canWrite.value"
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
        :disabled="!pl.canWrite.value"
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
        :disabled="!pl.canWrite.value"
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
        :disabled="!pl.canWrite.value"
        :clearable="false"
        :searchable="false"
        @update:model-value="(o: { id: Finish }) => pl.updateTent(tent.id, { finish: o.id })"
      />
    </div>

    <ul v-if="lines.length" class="zk-deviations ext:mt-2" :aria-label="$gettext('Abweichungen')">
      <li v-for="(line, i) in lines" :key="i">{{ line }}</li>
    </ul>
  </oc-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { UsePacklist } from '../composables/usePacklist'
import { catalog } from '../domain/catalog'
import type { Finish, TentConfig } from '../domain/types'
import { describeDeviation } from '../domain/view/deviations'
import { hasFinishLayer } from '../domain/walls'
import './forms.css'

const props = defineProps<{ tent: TentConfig; index: number; count: number; pl: UsePacklist }>()
const { $gettext } = useGettext()

const uid = computed(() => `zk-tent-${props.tent.id}`)
const type = computed(() => catalog.tentTypes.find((t) => t.id === props.tent.typeId))
const wall = computed(() => type.value?.walls.find((w) => w.id === props.tent.wallId))
const build = computed(() => wall.value?.builds.find((b) => b.id === props.tent.buildId))
const showFinish = computed(() => !!build.value && hasFinishLayer(build.value))

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

const lines = computed(() =>
  (props.pl.list.value?.deviations ?? [])
    .filter((d) => d.tentId === props.tent.id)
    .map((d) => describeDeviation(d, $gettext))
)

function onLabel(value: string) {
  props.pl.updateTent(props.tent.id, { label: value })
}
</script>

<style>
.zk-deviations {
  color: var(--oc-role-on-surface-variant, inherit);
  list-style: disc inside;
}
</style>
