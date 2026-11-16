<template>
  <article class="zk-tent-card ext:p-3 ext:mb-3 ext:rounded" :aria-label="title">
    <header class="ext:flex ext:flex-wrap ext:items-center ext:gap-2 ext:mb-2">
      <h3 class="ext:font-bold ext:grow">{{ title }}</h3>
      <div v-if="pl.canWrite.value" class="zk-no-print ext:flex ext:gap-1">
        <template v-if="type">
          <oc-button
            size="small"
            :disabled="index === 0"
            :aria-label="$gettext('Nach oben')"
            @click="pl.moveTent(tent.id, -1)"
            >↑</oc-button
          >
          <oc-button
            size="small"
            :disabled="index === count - 1"
            :aria-label="$gettext('Nach unten')"
            @click="pl.moveTent(tent.id, 1)"
            >↓</oc-button
          >
          <oc-button size="small" @click="pl.duplicateTent(tent.id)">{{
            $gettext('Duplizieren')
          }}</oc-button>
        </template>
        <oc-button size="small" @click="pl.removeTent(tent.id)">{{
          $gettext('Entfernen')
        }}</oc-button>
      </div>
    </header>

    <p v-if="!type" class="zk-error" role="alert">
      {{
        $gettext(
          'Dieser Zelttyp ist nicht mehr im Katalog. Das Zelt kann nur noch entfernt werden.'
        )
      }}
    </p>

    <div v-else class="ext:flex ext:flex-col ext:gap-3">
      <div class="zk-field">
        <label :for="`${uid}-label`">{{ $gettext('Bezeichnung') }}</label>
        <input
          :id="`${uid}-label`"
          type="text"
          :value="tent.label ?? ''"
          :readonly="!pl.canWrite.value"
          @input="onLabel"
        />
      </div>

      <div v-if="type.roofs.length > 1" class="zk-field">
        <label :for="`${uid}-roof`">{{ $gettext('Dach') }}</label>
        <select
          :id="`${uid}-roof`"
          :value="tent.roofId"
          :disabled="!pl.canWrite.value"
          @change="pl.updateTent(tent.id, { roofId: valueOf($event) })"
        >
          <option v-for="roof in type.roofs" :key="roof.id" :value="roof.id">
            {{ roof.label }}
          </option>
        </select>
      </div>

      <div v-if="type.walls.length > 1" class="zk-field">
        <label :for="`${uid}-wall`">{{ $gettext('Seitenwand') }}</label>
        <select
          :id="`${uid}-wall`"
          :value="tent.wallId"
          :disabled="!pl.canWrite.value"
          @change="pl.updateTent(tent.id, { wallId: valueOf($event) })"
        >
          <option v-for="w in type.walls" :key="w.id" :value="w.id">
            {{ w.label }}
          </option>
        </select>
      </div>

      <div v-if="wall && wall.builds.length > 1" class="zk-field">
        <label :for="`${uid}-build`">{{ $gettext('Bauart') }}</label>
        <select
          :id="`${uid}-build`"
          :value="tent.buildId"
          :disabled="!pl.canWrite.value"
          @change="pl.updateTent(tent.id, { buildId: valueOf($event) })"
        >
          <option v-for="b in wall.builds" :key="b.id" :value="b.id">{{ b.label }}</option>
        </select>
      </div>

      <div v-if="showFinish" class="zk-field">
        <label :for="`${uid}-finish`">{{ $gettext('Ausführung') }}</label>
        <select
          :id="`${uid}-finish`"
          :value="tent.finish"
          :disabled="!pl.canWrite.value"
          @change="pl.updateTent(tent.id, { finish: valueOf($event) as Finish })"
        >
          <option v-for="f in finishes" :key="f.id" :value="f.id">{{ f.label }}</option>
        </select>
      </div>
    </div>

    <ul v-if="lines.length" class="zk-deviations ext:mt-2" :aria-label="$gettext('Abweichungen')">
      <li v-for="(line, i) in lines" :key="i">{{ line }}</li>
    </ul>
  </article>
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

function valueOf(event: Event): string {
  return (event.target as HTMLSelectElement).value
}

function onLabel(event: Event) {
  const value = (event.target as HTMLInputElement).value
  props.pl.updateTent(props.tent.id, { label: value })
}
</script>

<style>
.zk-tent-card {
  border: 1px solid var(--oc-role-outline-variant, #bbb);
  background: var(--oc-role-surface-container-low, transparent);
}
.zk-deviations {
  color: var(--oc-role-on-surface-variant, inherit);
  list-style: disc inside;
}
</style>
