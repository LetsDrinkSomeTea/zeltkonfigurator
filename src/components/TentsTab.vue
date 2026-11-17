<template>
  <div v-if="pl.list.value">
    <section v-if="pl.canWrite.value" class="zk-no-print ext:mb-6" aria-labelledby="zk-add-h">
      <h2 id="zk-add-h" class="ext:text-lg ext:font-bold ext:mb-2">
        {{ $gettext('Zelte hinzufügen') }}
      </h2>
      <ul class="zk-tiles">
        <li v-for="t in pl.catalog.value.tentTypes" :key="t.id" class="zk-tile">
          <span :id="`zk-tile-${t.id}`" class="zk-tile-name">{{ t.name }}</span>
          <div class="zk-tile-counter">
            <oc-button
              size="small"
              :aria-label="$gettext('Eine %{name} weniger', { name: t.name })"
              :disabled="countOf(t.id) === 0"
              @click="removeOne(t.id)"
            >
              <oc-icon name="subtract" size="small" />
            </oc-button>
            <span class="zk-tile-count" aria-live="polite" :aria-describedby="`zk-tile-${t.id}`">{{
              countOf(t.id)
            }}</span>
            <oc-button
              size="small"
              :aria-label="$gettext('Eine %{name} mehr', { name: t.name })"
              @click="add(t.id)"
            >
              <oc-icon name="add" size="small" />
            </oc-button>
          </div>
        </li>
      </ul>
    </section>

    <h2 class="ext:text-lg ext:font-bold ext:mb-2">{{ $gettext('Zelte in dieser Packliste') }}</h2>
    <p v-if="pl.list.value.tents.length === 0" class="ext:mb-4">
      {{ $gettext('Noch keine Zelte in dieser Packliste.') }}
    </p>
    <div ref="listEl" class="zk-tent-list" @dragover="onDragOver" @drop="onDrop">
      <TentCard
        v-for="card in cards"
        :key="card.key"
        :tents="card.tents"
        :index="card.index"
        :count="pl.list.value.tents.length"
        :pl="pl"
        :highlighted="card.tents.some((t) => highlightIds.includes(t.id))"
        :dragging="card.tents.length === 1 && dragId === card.tents[0].id"
        @dragstart="onDragStart(card.tents[0].id, $event)"
        @dragend="dragId = null"
        @split="split(card.key)"
      />
    </div>

    <section class="ext:mt-6" aria-labelledby="zk-materials-h">
      <h2 id="zk-materials-h" class="ext:text-lg ext:font-bold ext:mb-1">
        {{ $gettext('Weiteres Material') }}
      </h2>
      <p class="zk-hint ext:mb-2">
        {{
          $gettext(
            'Material aus der Materialliste, das unabhängig von den Zelten mit soll, z. B. Küche, Werkzeug oder Planen. Es wird gegen den Bestand geprüft und erscheint in der Packliste.'
          )
        }}
      </p>
      <PartsEditor
        v-if="pl.canWrite.value"
        :parts="pl.list.value.materials"
        :articles="pl.catalog.value.articles"
        :categories="pl.catalog.value.categories"
        :empty-text="$gettext('Noch kein weiteres Material.')"
        @update:parts="pl.setMaterials"
      />
      <ul v-else-if="pl.list.value.materials.length > 0" class="zk-parts-list">
        <li v-for="m in pl.list.value.materials" :key="m.articleId">
          {{ m.quantity }} × {{ nameOf(m.articleId) }}
        </li>
      </ul>
    </section>

    <FinishOrderEditor
      class="ext:mt-6"
      :order="pl.list.value.finishOrder"
      :read-only="!pl.canWrite.value"
      @update:order="pl.setFinishOrder"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { UsePacklist } from '../composables/usePacklist'
import { hasDefaultOptions } from '../domain/packlist'
import type { TentConfig } from '../domain/types'
import FinishOrderEditor from './FinishOrderEditor.vue'
import PartsEditor from './PartsEditor.vue'
import TentCard from './TentCard.vue'

/** Reiter „Zelte“: Zelte hinzufügen und einstellen, weiteres Material. */
const props = defineProps<{ pl: UsePacklist }>()
const { $gettext } = useGettext()

const HIGHLIGHT_MS = 2000

const listEl = ref<HTMLElement>()
const highlightIds = ref<string[]>([])
const dragId = ref<string | null>(null)
/** Gruppen, die der Nutzer aufgeklappt hat („Einzeln bearbeiten“) */
const splitKeys = ref<string[]>([])
let highlightTimer: ReturnType<typeof setTimeout> | undefined

onBeforeUnmount(() => clearTimeout(highlightTimer))

const tents = computed(() => props.pl.list.value?.tents ?? [])
const countOf = (typeId: string) => tents.value.filter((t) => t.typeId === typeId).length
const nameOf = (id: string) => props.pl.catalog.value.articles.find((a) => a.id === id)?.name ?? id

/** Gleich eingestellte Zelte ohne Bezeichnung bilden eine Gruppe. */
function groupKey(t: TentConfig): string {
  if (t.label?.trim()) return `einzeln:${t.id}`
  return JSON.stringify([t.typeId, t.roofs, t.wallId, t.buildId, t.finish])
}

/** Karten in Listenreihenfolge: Gruppe an der Stelle ihres ersten Zeltes. */
const cards = computed(() => {
  const groups = new Map<string, { key: string; tents: TentConfig[]; index: number }>()
  tents.value.forEach((t, index) => {
    const key = groupKey(t)
    const g = groups.get(key)
    if (g) g.tents.push(t)
    else groups.set(key, { key, tents: [t], index })
  })
  return [...groups.values()].flatMap((g) =>
    g.tents.length > 1 && !splitKeys.value.includes(g.key)
      ? [g]
      : g.tents.map((t) => ({ key: t.id, tents: [t], index: tents.value.indexOf(t) }))
  )
})

function split(key: string) {
  splitKeys.value = [...splitKeys.value, key]
}

async function add(typeId: string) {
  const ids = props.pl.addTent(typeId, 1)
  if (ids.length === 0) return
  highlightIds.value = ids
  clearTimeout(highlightTimer)
  highlightTimer = setTimeout(() => (highlightIds.value = []), HIGHLIGHT_MS)
  await nextTick()
  const card = listEl.value?.querySelector(`[data-tent-id="${ids[0]}"]`)
  const reduceMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  card?.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' })
}

/** Entfernt ein Zelt des Typs: bevorzugt eines in Standardkonfiguration ohne Bezeichnung. */
function removeOne(typeId: string) {
  const ofType = tents.value.filter((t) => t.typeId === typeId)
  const type = props.pl.catalog.value.tentTypes.find((t) => t.id === typeId)
  const plain = [...ofType]
    .reverse()
    .find((t) => !t.label?.trim() && (!type || hasDefaultOptions(t, type)))
  const victim = plain ?? ofType.at(-1)
  if (victim) props.pl.removeTent(victim.id)
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
  const index = tents.value.findIndex((t) => t.id === targetId)
  if (index >= 0 && targetId !== id) {
    props.pl.moveTentTo(id, index)
  }
}
</script>

<style>
.zk-tiles {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  gap: 0.5rem;
}
.zk-tile {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid var(--oc-role-outline-variant, #ccc);
  border-radius: 0.5rem;
  background: var(--oc-role-surface-container-low, transparent);
}
.zk-tile-name {
  font-weight: bold;
}
.zk-tile-counter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.zk-tile-counter .oc-button {
  min-width: 44px;
  min-height: 44px;
}
.zk-tile-count {
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
  min-width: 2ch;
  text-align: center;
}
</style>
