<template>
  <div v-if="pl.list.value">
    <p v-if="pl.list.value.items.length === 0">
      {{ $gettext('Noch kein Bedarf: Füge im Reiter „Zelte“ Zelte hinzu.') }}
    </p>

    <section v-if="pl.list.value.items.length > 0" class="ext:mb-6">
      <div class="zk-table-wrap">
        <oc-table-simple class="ext:w-full">
          <caption class="ext:sr-only">
            {{
              $gettext('Bedarf über alle Zelte')
            }}
          </caption>
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
import { useGettext } from 'vue3-gettext'
import type { UsePacklist } from '../composables/usePacklist'

/** Reiter „Bedarf“: Gesamtbedarf, Bestand und Fehlmengen (F-25, F-35). */
defineProps<{ pl: UsePacklist }>()
const { $gettext } = useGettext()
</script>

<style>
.zk-table-wrap {
  overflow-x: auto;
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
