<template>
  <AppLayout :title="$gettext('Packlisten')" :loading="loading" :error="error">
    <form
      v-if="canWrite"
      class="zk-no-print ext:flex ext:flex-wrap ext:items-end ext:gap-2 ext:mb-4"
      @submit.prevent="onCreate"
    >
      <oc-text-input
        id="zk-new-list-name"
        v-model="newName"
        class="ext:grow"
        :label="$gettext('Name der neuen Packliste')"
        required-mark
      />
      <oc-button submit="submit" appearance="filled" color-role="primary">{{
        $gettext('Neue Packliste')
      }}</oc-button>
    </form>
    <p v-if="actionError" class="zk-error ext:mb-4" role="alert">{{ actionError }}</p>

    <p v-if="!loading && summaries.length === 0">
      {{ $gettext('Es gibt noch keine Packlisten. Lege die erste an.') }}
    </p>
    <ul v-else class="ext:flex ext:flex-col ext:gap-3 ext:list-none ext:p-0">
      <li v-for="s in summaries" :key="s.id">
        <oc-card class="zk-card" body-class="ext:p-3">
          <h2 class="ext:font-bold ext:text-lg ext:mb-1">
            <router-link
              class="ext:underline ext:font-bold"
              :to="{ name: 'zeltkonfigurator-liste', params: { id: s.id } }"
              >{{ s.name }}</router-link
            >
          </h2>
          <p v-if="s.date">{{ formatDate(s.date) }}</p>
          <p>{{ $gettext('%{n} Zelte', { n: s.tentCount }) }}</p>
          <div class="ext:flex ext:items-center ext:gap-2">
            <oc-progress
              class="ext:grow ext:w-full"
              :max="s.itemCount"
              :value="s.checkedCount"
              :aria-label="progressText(s)"
            />
            <span class="ext:whitespace-nowrap">{{ progressText(s) }}</span>
          </div>
          <div v-if="canWrite" class="zk-no-print ext:flex ext:gap-2 ext:mt-2">
            <template v-if="confirmId === s.id">
              <span>{{ $gettext('Packliste wirklich löschen?') }}</span>
              <oc-button size="small" @click="onRemove(s.id)">{{
                $gettext('Ja, löschen')
              }}</oc-button>
              <oc-button size="small" @click="confirmId = null">{{
                $gettext('Abbrechen')
              }}</oc-button>
            </template>
            <template v-else>
              <oc-button size="small" @click="onDuplicate(s.id)">{{
                $gettext('Duplizieren')
              }}</oc-button>
              <oc-button size="small" @click="confirmId = s.id">{{
                $gettext('Löschen')
              }}</oc-button>
            </template>
          </div>
        </oc-card>
      </li>
    </ul>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGettext } from 'vue3-gettext'
import AppLayout from '../components/AppLayout.vue'
import '../components/forms.css'
import { usePacklists } from '../composables/usePacklists'
import type { PacklistSummary } from '../domain/types'

const { $gettext } = useGettext()
const router = useRouter()
const { summaries, loading, error, canWrite, load, create, duplicate, remove } = usePacklists()

const newName = ref('')
const confirmId = ref<string | null>(null)
const actionError = ref('')

onMounted(() => {
  void load()
})

function formatDate(date: string): string {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) {
    return date
  }
  return parsed.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    // reine Datumsangaben (JJJJ-MM-TT) gelten als UTC und dürfen nicht verrutschen
    ...(/^\d{4}-\d{2}-\d{2}$/.test(date) ? { timeZone: 'UTC' } : {})
  })
}

function progressText(s: PacklistSummary): string {
  return $gettext('%{done} von %{total} abgehakt', { done: s.checkedCount, total: s.itemCount })
}

async function run(action: () => Promise<void>) {
  actionError.value = ''
  try {
    await action()
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : String(e)
  }
}

async function onCreate() {
  const name = newName.value.trim()
  if (!name) {
    return
  }
  await run(async () => {
    const id = await create(name)
    newName.value = ''
    await router.push({ name: 'zeltkonfigurator-liste', params: { id } })
  })
}

async function onDuplicate(id: string) {
  await run(async () => {
    await duplicate(id)
  })
}

async function onRemove(id: string) {
  confirmId.value = null
  await run(() => remove(id))
}
</script>
