<template>
  <div v-if="pl.list.value">
    <p v-if="pl.list.value.tents.length === 0">
      {{ $gettext('Noch keine Zelte in dieser Packliste.') }}
    </p>

    <section v-for="entry in perTent" :key="entry.tent.id" class="ext:mb-6">
      <h3 class="ext:font-bold ext:mb-2">{{ entry.title }}</h3>
      <p v-if="entry.groups.length === 0">{{ $gettext('Kein Material.') }}</p>
      <template v-for="group in entry.groups" :key="group.category">
        <table class="zk-table ext:mb-3">
          <caption>
            {{
              $gettext(CATEGORY_LABELS[group.category])
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ $gettext('Artikel') }}</th>
              <th scope="col" class="zk-num">{{ $gettext('Menge') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in group.rows" :key="row.item.articleId">
              <td>{{ row.item.name }}</td>
              <td class="zk-num">{{ row.quantity }}</td>
            </tr>
          </tbody>
        </table>
      </template>
    </section>

    <section v-if="pl.list.value.items.length > 0" class="ext:mb-6">
      <h3 class="ext:font-bold ext:mb-2">{{ $gettext('Gesamt über alle Zelte') }}</h3>
      <div class="zk-table-wrap">
        <table class="zk-table">
          <thead>
            <tr>
              <th scope="col">{{ $gettext('Artikel') }}</th>
              <th scope="col" class="zk-num">{{ $gettext('Benötigt') }}</th>
              <th scope="col" class="zk-num">{{ $gettext('Aus Bestand') }}</th>
              <th scope="col" class="zk-num">{{ $gettext('Fehlt') }}</th>
              <th v-if="anyToCut" scope="col" class="zk-num">{{ $gettext('Vor Ort schlagen') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in pl.list.value.items" :key="item.articleId">
              <td>{{ item.name }}</td>
              <td class="zk-num">{{ item.quantity + item.missing + item.toCut }}</td>
              <td class="zk-num">{{ item.quantity }}</td>
              <td class="zk-num" :class="{ 'zk-missing': item.missing > 0 }">{{ item.missing }}</td>
              <td v-if="anyToCut" class="zk-num">{{ item.toCut }}</td>
            </tr>
          </tbody>
        </table>
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

const anyToCut = computed(() => props.pl.list.value?.items.some((i) => i.toCut > 0) ?? false)

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
.zk-table {
  width: 100%;
  border-collapse: collapse;
}
.zk-table caption {
  text-align: left;
  font-weight: bold;
  padding: 0.25rem 0;
}
.zk-table th,
.zk-table td {
  padding: 0.25rem 0.5rem;
  text-align: left;
  border-bottom: 1px solid var(--oc-role-outline-variant, #ccc);
}
.zk-table .zk-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.zk-table .zk-missing {
  color: var(--oc-role-on-error-container, #410e0b);
  background: var(--oc-role-error-container, #f9dedc);
  font-weight: bold;
}
</style>
