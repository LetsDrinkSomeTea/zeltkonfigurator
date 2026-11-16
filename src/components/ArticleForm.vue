<template>
  <form class="zk-article-form" :aria-label="title" @submit.prevent="submit">
    <h3 class="ext:font-bold ext:mb-2">{{ title }}</h3>
    <div class="zk-article-fields">
      <oc-text-input
        :id="`${uid}-name`"
        v-model="name"
        class="zk-field-wide"
        :label="$gettext('Name')"
        required-mark
        :error-message="nameError"
        :fix-message-line="true"
        :error-message-debounced-time="0"
      />
      <oc-select
        :id="`${uid}-category`"
        v-model="category"
        class="zk-field"
        :label="$gettext('Kategorie')"
        :options="categoryOptions"
        :reduce="(o: CategoryOption) => o.id"
        option-label="name"
        :clearable="false"
        :searchable="true"
      />
      <oc-text-input
        v-if="category === NEW"
        :id="`${uid}-new-category`"
        v-model="newCategory"
        class="zk-field"
        :label="$gettext('Name der neuen Kategorie')"
        required-mark
        :error-message="newCategoryError"
        :fix-message-line="true"
        :error-message-debounced-time="0"
      />
      <oc-text-input
        v-if="withQuantity"
        :id="`${uid}-quantity`"
        class="zk-field-small"
        type="number"
        min="0"
        :label="$gettext('Anzahl vorhanden')"
        :model-value="String(quantity)"
        @update:model-value="quantity = Number($event)"
      />
    </div>
    <div class="ext:flex ext:gap-2 ext:mt-2">
      <oc-button submit="submit" appearance="filled" color-role="primary">{{
        $gettext('Speichern')
      }}</oc-button>
      <oc-button type="button" @click="emit('cancel')">{{ $gettext('Abbrechen') }}</oc-button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { Article, CategoryDef } from '../domain/types'

export interface ArticleInput {
  name: string
  /** gewählte Kategorie; leer, wenn `newCategory` gesetzt ist */
  category: string
  /** Name einer neu anzulegenden Kategorie */
  newCategory?: string
  quantity: number
}

interface CategoryOption {
  id: string
  name: string
}

/** Formular für ein Material: Name, Kategorie (auch neu) und optional die vorhandene Anzahl. */
const props = defineProps<{
  title: string
  categories: CategoryDef[]
  article?: Article
  withQuantity?: boolean
}>()
const emit = defineEmits<{ save: [input: ArticleInput]; cancel: [] }>()
const { $gettext } = useGettext()

const NEW = '__neu__'
const uid = `zk-article-${useId()}`
// Seitenwand ist dem fest eingebauten Wandmaterial vorbehalten.
const choosable = computed(() => props.categories.filter((c) => c.id !== 'wand'))
const categoryOptions = computed<CategoryOption[]>(() => [
  ...choosable.value,
  { id: NEW, name: $gettext('Neue Kategorie …') }
])

const name = ref(props.article?.name ?? '')
const category = ref(props.article?.category ?? choosable.value[0]?.id ?? NEW)
const newCategory = ref('')
const quantity = ref(0)
const tried = ref(false)

const nameError = computed(() =>
  tried.value && name.value.trim() === '' ? $gettext('Bitte einen Namen eingeben') : ''
)
const newCategoryError = computed(() =>
  tried.value && category.value === NEW && newCategory.value.trim() === ''
    ? $gettext('Bitte einen Namen für die Kategorie eingeben')
    : ''
)

function submit() {
  tried.value = true
  if (nameError.value || newCategoryError.value) return
  const isNew = category.value === NEW
  emit('save', {
    name: name.value.trim(),
    category: isNew ? '' : category.value,
    ...(isNew && { newCategory: newCategory.value.trim() }),
    quantity: Number.isFinite(quantity.value) ? Math.max(0, Math.floor(quantity.value)) : 0
  })
}
</script>

<style>
.zk-article-form {
  padding: 0.75rem;
  border: 1px solid var(--oc-role-outline-variant, #ccc);
  border-radius: 0.5rem;
}
.zk-article-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  align-items: flex-start;
}
.zk-field-wide {
  flex: 2 1 16rem;
}
.zk-field {
  flex: 1 1 12rem;
}
.zk-field-small {
  flex: 0 1 8rem;
}
.zk-article-fields input {
  width: 100%;
  box-sizing: border-box;
}
</style>
