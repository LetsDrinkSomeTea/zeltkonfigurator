<template>
  <app-layout
    :title="$gettext('Materialliste')"
    :framed="!!resource"
    :loading="st.loading.value"
    :error="st.error.value"
    :read-only="!st.canWrite.value"
  >
    <p v-if="problems.length > 0" class="zk-error ext:mb-4" role="alert">
      {{ problems.join(' · ') }}
    </p>
    <div
      class="zk-tabs ext:flex ext:mb-4"
      role="tablist"
      :aria-label="$gettext('Bereiche der Materialliste')"
    >
      <oc-button
        v-for="t in tabs"
        :id="`zk-mtab-${t.id}`"
        :key="t.id"
        appearance="raw"
        role="tab"
        class="zk-tab"
        :aria-selected="t.id === activeTab"
        :aria-controls="`zk-mpanel-${t.id}`"
        :tabindex="t.id === activeTab ? 0 : -1"
        @click="select(t.id)"
        @keydown="onKey($event, t.id)"
      >
        {{ t.label }}
      </oc-button>
    </div>
    <div
      :id="`zk-mpanel-${activeTab}`"
      role="tabpanel"
      :aria-labelledby="`zk-mtab-${activeTab}`"
      tabindex="-1"
    >
      <TentTypesTab v-if="activeTab === 'zelttypen'" :st="st" />
      <RoofModulesTab v-else-if="activeTab === 'daecher'" :st="st" />
      <MaterialTab v-else :st="st" />
    </div>
  </app-layout>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { Resource } from '@opencloud-eu/web-client'
import AppLayout from '../components/AppLayout.vue'
import '../components/tabs.css'
import MaterialTab from '../components/MaterialTab.vue'
import RoofModulesTab from '../components/RoofModulesTab.vue'
import TentTypesTab from '../components/TentTypesTab.vue'
import { useAppRouter } from '../composables/useAppRouter'
import { useStock } from '../composables/useStock'
import { resolveCatalog } from '../domain/catalog'

type TabId = 'material' | 'zelttypen' | 'daecher'

// Im App-Rahmen (AppWrapper) übergibt OpenCloud die geöffnete Datei; ohne Rahmen fehlt sie.
defineProps<{ resource?: Resource }>()

const { $gettext } = useGettext()
const { router, route } = useAppRouter()
const st = useStock()

const tabs = computed<{ id: TabId; label: string }[]>(() => [
  { id: 'material', label: $gettext('Material') },
  { id: 'zelttypen', label: $gettext('Zelttypen') },
  { id: 'daecher', label: $gettext('Dächer') }
])

const activeTab = computed<TabId>(() => {
  const q = route.value.query.tab
  return q === 'zelttypen' || q === 'daecher' ? q : 'material'
})

/** Zelttypen, die wegen fehlender Dächer nicht nutzbar sind */
const problems = computed(() => resolveCatalog(st.catalogData.value).problems)

function select(id: TabId) {
  void router.replace({ query: { ...route.value.query, tab: id } })
}

async function onKey(event: KeyboardEvent, id: TabId) {
  const ids = tabs.value.map((t) => t.id)
  const index = ids.indexOf(id)
  const target =
    event.key === 'ArrowRight'
      ? (index + 1) % ids.length
      : event.key === 'ArrowLeft'
        ? (index - 1 + ids.length) % ids.length
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? ids.length - 1
            : -1
  if (target < 0) return
  event.preventDefault()
  select(ids[target])
  await nextTick()
  document.getElementById(`zk-mtab-${ids[target]}`)?.focus()
}

onMounted(async () => {
  await st.load()
})
onBeforeUnmount(() => {
  void st.flush()
})
</script>
