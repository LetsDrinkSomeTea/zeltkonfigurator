<template>
  <div v-if="pl.list.value">
    <p v-if="pl.list.value.tents.length === 0" class="ext:mb-4">
      {{ $gettext('Noch keine Zelte in dieser Packliste.') }}
    </p>
    <div ref="listEl" class="zk-tent-list" @dragover="onDragOver" @drop="onDrop">
      <TentCard
        v-for="(tent, index) in pl.list.value.tents"
        :key="tent.id"
        :tent="tent"
        :index="index"
        :count="pl.list.value.tents.length"
        :pl="pl"
        :highlighted="highlightIds.includes(tent.id)"
        :dragging="dragId === tent.id"
        @dragstart="onDragStart(tent.id, $event)"
        @dragend="dragId = null"
      />
    </div>

    <form
      v-if="pl.canWrite.value"
      class="zk-no-print ext:flex ext:flex-wrap ext:items-end ext:gap-2 ext:mb-4"
      @submit.prevent="add"
    >
      <oc-select
        id="zk-add-tent-type"
        v-model="selectedType"
        class="ext:grow"
        :label="$gettext('Zelttyp')"
        :options="catalog.tentTypes"
        option-label="name"
        :clearable="false"
        :searchable="false"
      />
      <oc-text-input
        id="zk-add-tent-count"
        class="zk-add-count"
        type="number"
        min="1"
        :max="MAX_COUNT"
        step="1"
        :label="$gettext('Anzahl')"
        :model-value="String(count)"
        @update:model-value="count = Number($event)"
      />
      <oc-button submit="submit" appearance="filled" color-role="primary">{{
        $gettext('Zelt hinzufügen')
      }}</oc-button>
    </form>

    <FinishOrderEditor
      :order="pl.list.value.finishOrder"
      :read-only="!pl.canWrite.value"
      @update:order="pl.setFinishOrder"
    />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { UsePacklist } from '../composables/usePacklist'
import { catalog } from '../domain/catalog'
import FinishOrderEditor from './FinishOrderEditor.vue'
import TentCard from './TentCard.vue'

/** Reiter „Zelte“: Konfigurator. */
const props = defineProps<{ pl: UsePacklist }>()
const { $gettext } = useGettext()

const MAX_COUNT = 20
const HIGHLIGHT_MS = 2000

const selectedType = ref(catalog.tentTypes[0])
const count = ref(1)
const listEl = ref<HTMLElement>()
const highlightIds = ref<string[]>([])
const dragId = ref<string | null>(null)
let highlightTimer: ReturnType<typeof setTimeout> | undefined

onBeforeUnmount(() => clearTimeout(highlightTimer))

function clampCount(value: number): number {
  return Number.isFinite(value) ? Math.min(MAX_COUNT, Math.max(1, Math.trunc(value))) : 1
}

async function add() {
  if (!selectedType.value) {
    return
  }
  const n = clampCount(count.value)
  count.value = 1
  const ids = props.pl.addTent(selectedType.value.id, n)
  if (ids.length === 0) {
    return
  }
  highlightIds.value = ids
  clearTimeout(highlightTimer)
  highlightTimer = setTimeout(() => (highlightIds.value = []), HIGHLIGHT_MS)
  await nextTick()
  const card = listEl.value?.querySelector(`[data-tent-id="${ids[0]}"]`)
  const reduceMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  card?.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
}

function onDragStart(tentId: string, event: DragEvent) {
  dragId.value = tentId
  const transfer = event.dataTransfer
  if (transfer) {
    transfer.effectAllowed = 'move'
    transfer.setData('text/plain', tentId)
    const card = (event.target as Element | null)?.closest('[data-tent-id]')
    if (card && typeof transfer.setDragImage === 'function') {
      transfer.setDragImage(card, 16, 16)
    }
  }
}

function onDragOver(event: DragEvent) {
  if (dragId.value) {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }
}

/** Legt das gezogene Zelt an die Stelle der Karte, auf der losgelassen wird. */
function onDrop(event: DragEvent) {
  const id = dragId.value
  dragId.value = null
  if (!id) {
    return
  }
  event.preventDefault()
  const target = (event.target as Element | null)?.closest('[data-tent-id]')
  const targetId = target?.getAttribute('data-tent-id')
  const index = props.pl.list.value?.tents.findIndex((t) => t.id === targetId) ?? -1
  if (index >= 0 && targetId !== id) {
    props.pl.moveTentTo(id, index)
  }
}
</script>

<style>
.zk-add-count {
  width: 6rem;
}
.zk-add-count input {
  width: 100%;
  min-width: 0;
}
</style>
