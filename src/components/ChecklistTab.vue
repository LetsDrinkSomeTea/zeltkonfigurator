<template>
  <div v-if="list">
    <div class="zk-no-print">
      <p v-if="empty" class="ext:my-4">
        {{ $gettext('Noch keine Zelte. Füge im Reiter „Zelte“ Zelte hinzu.') }}
      </p>
      <template v-else>
        <div class="ext:flex ext:flex-wrap ext:items-center ext:gap-4 ext:mb-2">
          <div class="zk-mode oc-button-group" role="group" :aria-label="$gettext('Ansicht')">
            <oc-button
              v-for="option in modes"
              :key="option.value"
              class="zk-mode-option"
              :data-mode="option.value"
              :aria-pressed="mode === option.value"
              :appearance="mode === option.value ? 'filled' : 'outline'"
              color-role="secondary"
              @click="mode = option.value"
            >
              {{ option.label }}
            </oc-button>
          </div>
          <oc-switch
            v-model:checked="onlyOpen"
            class="zk-filter"
            :label="$gettext('Nur offene anzeigen')"
          />
          <oc-button class="ext:ml-auto" @click="print">{{ $gettext('Drucken') }}</oc-button>
        </div>
        <p class="zk-progress ext:font-bold" role="status">
          {{
            $gettext('%{done} von %{total} abgehakt', {
              done: String(p.done),
              total: String(p.total)
            })
          }}
        </p>
        <p v-if="!pl.canWrite.value" class="ext:my-2">
          {{ $gettext('Nur Lesezugriff: Abhaken ist nicht möglich.') }}
        </p>

        <template v-if="mode === 'gesamt'">
          <section v-for="group in groups" :key="group.category" class="ext:mt-4">
            <h2 class="ext:text-lg ext:font-bold">{{ group.title }}</h2>
            <oc-list raw>
              <ChecklistRow
                v-for="item in group.items"
                :key="item.articleId"
                :name="item.name"
                :quantity="item.quantity"
                :checked="item.checked"
                :checkable="isCheckable(item)"
                :missing="item.missing"
                :to-cut="item.toCut"
                :disabled="!pl.canWrite.value"
                @toggle="pl.toggleItem(item.articleId)"
              />
            </oc-list>
          </section>
        </template>

        <template v-else>
          <p class="ext:mt-2">
            {{
              $gettext(
                'Der Haken gilt für den Artikel insgesamt: Abhaken in einem Zelt hakt ihn überall ab.'
              )
            }}
          </p>
          <section v-for="t in tentSections" :key="t.tent.id" class="ext:mt-4">
            <h2 class="ext:text-lg ext:font-bold">{{ t.title }}</h2>
            <oc-list raw>
              <ChecklistRow
                v-for="entry in t.entries"
                :key="entry.item.articleId"
                :name="entry.item.name"
                :quantity="entry.quantity"
                :checked="entry.item.checked"
                :checkable="isCheckable(entry.item)"
                :disabled="!pl.canWrite.value"
                @toggle="pl.toggleItem(entry.item.articleId)"
              />
            </oc-list>
          </section>
        </template>
      </template>

      <ExtraItems
        :extras="list.extraItems"
        :can-write="pl.canWrite.value"
        :only-open="onlyOpen"
        @toggle="pl.toggleExtra"
        @remove="pl.removeExtra"
        @add="pl.addExtra"
      />
    </div>
    <PrintLayout :list="list" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { UsePacklist } from '../composables/usePacklist'
import { catalog } from '../domain/catalog'
import type { PackItem } from '../domain/types'
import ChecklistRow from './ChecklistRow.vue'
import ExtraItems from './ExtraItems.vue'
import PrintLayout from './PrintLayout.vue'
import {
  groupByCategory,
  isCheckable,
  itemsForTent,
  progress,
  tentTitle,
  type TentItem
} from './checklistView'

/** Reiter „Packliste“: abhaken, freie Zeilen, Druck. */
const props = defineProps<{ pl: UsePacklist }>()
const { $gettext } = useGettext()

const mode = ref<'gesamt' | 'zelt'>('gesamt')
const modes = [
  { value: 'gesamt', label: $gettext('Gesamt') },
  { value: 'zelt', label: $gettext('Pro Zelt') }
] as const
const onlyOpen = ref(false)

const list = computed(() => props.pl.list.value)
const empty = computed(
  () => !!list.value && list.value.tents.length === 0 && list.value.extraItems.length === 0
)
const p = computed(() => (list.value ? progress(list.value) : { done: 0, total: 0 }))

const visible = (item: PackItem) => !onlyOpen.value || !isCheckable(item) || !item.checked

const groups = computed(() => groupByCategory((list.value?.items ?? []).filter(visible)))

const tentSections = computed(() => {
  const l = list.value
  if (!l) {
    return []
  }
  return l.tents
    .map((tent) => ({
      tent,
      title: tentTitle(l, tent, catalog),
      entries: itemsForTent(l, tent.id).filter((e: TentItem) => visible(e.item))
    }))
    .filter((s) => s.entries.length > 0)
})

function print() {
  window.print()
}
</script>

<style>
.zk-mode-option,
.zk-filter {
  min-height: 44px;
}
</style>
