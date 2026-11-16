<template>
  <AppLayout :title="doc.name" :framed="framed" :loading="pl.loading.value" :error="pl.error.value">
    <template #actions>
      <span v-if="pl.saving.value" class="zk-no-print" role="status">{{
        $gettext('Wird gespeichert …')
      }}</span>
      <router-link class="zk-no-print ext:underline" :to="{ name: 'zeltkonfigurator-bestand' }">{{
        $gettext('Bestand')
      }}</router-link>
      <oc-button v-if="doc.close" class="zk-no-print" size="small" @click="close">{{
        $gettext('Schließen')
      }}</oc-button>
    </template>

    <template v-if="pl.list.value">
      <section class="ext:flex ext:flex-wrap ext:gap-3 ext:mb-4">
        <oc-text-input
          v-if="pl.canWrite.value"
          id="zk-list-date"
          type="date"
          :label="$gettext('Datum')"
          :model-value="pl.list.value.date ?? ''"
          @update:model-value="(v: string) => pl.setDate(v || undefined)"
        />
        <p v-else-if="pl.list.value.date">{{ pl.list.value.date }}</p>
        <p v-if="!pl.canWrite.value" class="zk-hint">{{ $gettext('Nur Lesezugriff') }}</p>
      </section>

      <StatusBanner :status="status" />

      <div v-if="pl.stale.value" class="zk-no-print zk-stale ext:p-3 ext:mb-4 ext:rounded">
        <span>{{ $gettext('Bestand oder App haben sich geändert') }}</span>
        <oc-button v-if="pl.canWrite.value" class="ext:ml-2" size="small" @click="pl.recalc()">{{
          $gettext('Neu berechnen')
        }}</oc-button>
      </div>

      <div
        class="zk-no-print zk-tabs ext:flex ext:mb-4"
        role="tablist"
        :aria-label="$gettext('Bereiche der Packliste')"
      >
        <oc-button
          v-for="t in tabs"
          :id="`zk-tab-${t.id}`"
          :key="t.id"
          appearance="raw"
          role="tab"
          class="zk-tab"
          :aria-selected="t.id === activeTab"
          :aria-controls="`zk-panel-${t.id}`"
          :tabindex="t.id === activeTab ? 0 : -1"
          @click="select(t.id)"
          @keydown="onKey($event, t.id)"
        >
          {{ t.label }}
        </oc-button>
      </div>
      <div
        :id="`zk-panel-${activeTab}`"
        role="tabpanel"
        :aria-labelledby="`zk-tab-${activeTab}`"
        tabindex="0"
      >
        <TentsTab v-if="activeTab === 'zelte'" :pl="pl" />
        <PerTentTab v-else-if="activeTab === 'material'" :pl="pl" />
        <ChecklistTab v-else :pl="pl" />
      </div>
    </template>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { Resource, SpaceResource } from '@opencloud-eu/web-client'
import AppLayout from '../components/AppLayout.vue'
import ChecklistTab from '../components/ChecklistTab.vue'
import PerTentTab from '../components/PerTentTab.vue'
import StatusBanner from '../components/StatusBanner.vue'
import TentsTab from '../components/TentsTab.vue'
import { useAppRouter } from '../composables/useAppRouter'
import { usePacklist } from '../composables/usePacklist'
import { usePacklistDocument } from '../composables/useStore'
import { derivePacklistStatus } from '../domain/view/status'

type TabId = 'zelte' | 'material' | 'packliste'

const { $gettext } = useGettext()
const { router, route } = useAppRouter()
// Space, Datei und Schreibrecht kommen von OpenClouds App-Rahmen (AppWrapper). Er liest die
// deklarierten Props aus, um zu entscheiden, was er lädt – den Inhalt lädt und speichert die
// App selbst (sofortiges Speichern mit Konflikterkennung).
const props = defineProps<{ space?: SpaceResource; resource?: Resource; isReadOnly?: boolean }>()
const framed = computed(() => !!props.resource)

// Die Datei bestimmt Ort und Namen der Liste; umbenannt wird sie in der Dateiansicht.
const doc = usePacklistDocument({
  space: () => props.space,
  resource: () => props.resource,
  isReadOnly: () => !!props.isReadOnly
})
const pl = usePacklist(doc)

const tabs = computed<{ id: TabId; label: string }[]>(() => [
  { id: 'zelte', label: $gettext('Zelte') },
  { id: 'material', label: $gettext('Material pro Zelt') },
  { id: 'packliste', label: $gettext('Packliste') }
])

const activeTab = computed<TabId>(() => {
  const q = route.value.query.tab
  return q === 'material' || q === 'packliste' ? q : 'zelte'
})

const status = computed(() =>
  pl.list.value ? derivePacklistStatus(pl.list.value) : ('leer' as const)
)

function select(id: TabId) {
  void router.replace({ query: { ...route.value.query, tab: id } })
}

async function onKey(event: KeyboardEvent, id: TabId) {
  const ids = tabs.value.map((t) => t.id)
  const index = ids.indexOf(id)
  let target: number
  switch (event.key) {
    case 'ArrowRight':
      target = (index + 1) % ids.length
      break
    case 'ArrowLeft':
      target = (index - 1 + ids.length) % ids.length
      break
    case 'Home':
      target = 0
      break
    case 'End':
      target = ids.length - 1
      break
    default:
      return
  }
  event.preventDefault()
  select(ids[target])
  await nextTick()
  document.getElementById(`zk-tab-${ids[target]}`)?.focus()
}

async function close() {
  await pl.flush()
  doc.close?.()
}

onMounted(() => {
  void pl.load()
})
onBeforeUnmount(() => {
  void pl.flush()
})
</script>

<style>
.zk-tabs {
  border-bottom: 1px solid var(--oc-role-outline-variant, #ccc);
  overflow-x: auto;
}
.zk-tab {
  min-height: 2.75rem;
  padding: 0 1rem;
  white-space: nowrap;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
  border-bottom: 3px solid transparent;
}
.zk-tab[aria-selected='true'] {
  border-bottom-color: var(--oc-role-primary, #1f3a2d);
  font-weight: bold;
}
.zk-stale {
  border: 1px solid var(--oc-role-outline, #888);
  background: var(--oc-role-surface-container-high, #eee);
  color: var(--oc-role-on-surface, inherit);
}
</style>
