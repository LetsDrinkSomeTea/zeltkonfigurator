<template>
  <div v-if="pl.list.value">
    <p v-if="pl.list.value.tents.length === 0">
      {{ $gettext('Noch keine Zelte in dieser Packliste.') }}
    </p>

    <section v-for="entry in perTent" :key="entry.tent.id" class="ext:mb-6">
      <h3 class="ext:font-bold ext:mb-2">{{ entry.title }}</h3>
      <p v-if="entry.groups.length === 0">{{ $gettext('Kein Material.') }}</p>
      <template v-for="group in entry.groups" :key="group.category">
        <oc-table-simple class="ext:mb-3 ext:w-full">
          <caption class="zk-caption">
            {{
              $gettext(CATEGORY_LABELS[group.category])
            }}
          </caption>
          <oc-table-head>
            <oc-table-tr>
              <oc-table-th scope="col" align-h="left" width="expand">{{
                $gettext('Artikel')
              }}</oc-table-th>
              <oc-table-th scope="col" align-h="right" width="shrink">{{
                $gettext('Menge')
              }}</oc-table-th>
            </oc-table-tr>
          </oc-table-head>
          <oc-table-body>
            <oc-table-tr v-for="row in group.rows" :key="row.item.articleId">
              <oc-table-td>{{ row.item.name }}</oc-table-td>
              <oc-table-td align-h="right" class="zk-num">{{ row.quantity }}</oc-table-td>
            </oc-table-tr>
          </oc-table-body>
        </oc-table-simple>
      </template>
    </section>

    <section v-if="pl.list.value.items.length > 0" class="ext:mb-6">
      <h3 class="ext:font-bold ext:mb-2">{{ $gettext('Gesamt über alle Zelte') }}</h3>
      <div class="zk-table-wrap">
        <oc-table-simple class="ext:w-full">
          <oc-table-head>
            <oc-table-tr>
              <oc-table-th scope="col" align-h="left" width="expand">{{
                $gettext('Artikel')
              }}</oc-table-th>
              <oc-table-th scope="col" align-h="right" width="shrink">{{
                $gettext('Benötigt')
              }}</oc-table-th>
              <oc-table-th scope="col" align-h="right" width="shrink">{{
                $gettext('Aus Bestand')
              }}</oc-table-th>
              <oc-table-th scope="col" align-h="right" width="shrink">{{
                $gettext('Fehlt')
              }}</oc-table-th>
            </oc-table-tr>
          </oc-table-head>
          <oc-table-body>
            <oc-table-tr v-for="item in pl.list.value.items" :key="item.articleId">
              <oc-table-td>{{ item.name }}</oc-table-td>
              <oc-table-td align-h="right" class="zk-num">{{
                item.quantity + item.missing
              }}</oc-table-td>
              <oc-table-td align-h="right" class="zk-num">{{ item.quantity }}</oc-table-td>
              <oc-table-td
                align-h="right"
                class="zk-num"
                :class="{ 'zk-missing': item.missing > 0 }"
                >{{ item.missing }}</oc-table-td
              >
            </oc-table-tr>
          </oc-table-body>
        </oc-table-simple>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { UsePacklist } from '../composables/usePacklist'
import { catalog } from '../domain/catalog'
import { CATEGORIES, type Category, type PackItem, type TentConfig } from '../domain/types'
import { CATEGORY_LABELS } from './categoryLabels'

/** Reiter „Material pro Zelt“ (F-25, F-35). */
const props = defineProps<{ pl: UsePacklist }>()
const { $gettext } = useGettext()

interface Group {
  category: Category
  rows: { item: PackItem; quantity: number }[]
}

const perTent = computed(() => {
  const list = props.pl.list.value
  if (!list) {
    return []
  }
  return list.tents.map((tent: TentConfig, index) => {
    const typeName = catalog.tentTypes.find((t) => t.id === tent.typeId)?.name ?? tent.typeId
    const label = tent.label?.trim()
    const groups: Group[] = CATEGORIES.map((category) => ({
      category,
      rows: list.items
        .filter((item) => item.category === category && (item.perTent[tent.id] ?? 0) > 0)
        .map((item) => ({ item, quantity: item.perTent[tent.id] }))
    })).filter((g) => g.rows.length > 0)
    return {
      tent,
      title: `${index + 1}. ${typeName}${label ? ` – ${label}` : ''}`,
      groups
    }
  })
})
</script>

<style>
.zk-table-wrap {
  overflow-x: auto;
}
.zk-caption {
  text-align: left;
  font-weight: bold;
  padding: 0.25rem 0;
}
.zk-num {
  font-variant-numeric: tabular-nums;
}
.zk-missing {
  color: var(--oc-role-on-error-container, #410e0b);
  background: var(--oc-role-error-container, #f9dedc);
  font-weight: bold;
}
</style>
