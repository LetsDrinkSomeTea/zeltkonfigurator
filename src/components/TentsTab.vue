<template>
  <div v-if="pl.list.value">
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
      <oc-button submit="submit" appearance="filled" color-role="primary">{{
        $gettext('Zelt hinzufügen')
      }}</oc-button>
    </form>

    <p v-if="pl.list.value.tents.length === 0" class="ext:mb-4">
      {{ $gettext('Noch keine Zelte in dieser Packliste.') }}
    </p>
    <TentCard
      v-for="(tent, index) in pl.list.value.tents"
      :key="tent.id"
      :tent="tent"
      :index="index"
      :count="pl.list.value.tents.length"
      :pl="pl"
    />

    <FinishOrderEditor
      :order="pl.list.value.finishOrder"
      :read-only="!pl.canWrite.value"
      @update:order="pl.setFinishOrder"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { UsePacklist } from '../composables/usePacklist'
import { catalog } from '../domain/catalog'
import FinishOrderEditor from './FinishOrderEditor.vue'
import TentCard from './TentCard.vue'

/** Reiter „Zelte“: Konfigurator. */
const props = defineProps<{ pl: UsePacklist }>()
const { $gettext } = useGettext()

const selectedType = ref(catalog.tentTypes[0])

function add() {
  if (selectedType.value) {
    props.pl.addTent(selectedType.value.id)
  }
}
</script>
