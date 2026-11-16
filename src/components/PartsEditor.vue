<template>
  <div class="zk-parts">
    <p v-if="parts.length === 0" class="zk-hint">{{ emptyText ?? $gettext('Keine Teile.') }}</p>
    <ul v-else class="zk-parts-list">
      <li v-for="(part, i) in parts" :key="`${part.articleId}-${i}`" class="zk-parts-row">
        <span class="zk-parts-name">{{ nameOf(part.articleId) }}</span>
        <oc-text-input
          :id="`${uid}-qty-${i}`"
          class="zk-parts-qty"
          type="number"
          min="1"
          :label="$gettext('Menge von %{name}', { name: nameOf(part.articleId) })"
          :model-value="String(part.quantity)"
          @change="(v: string) => setQuantity(i, v)"
        >
          <template #label>
            <label class="ext:sr-only" :for="`${uid}-qty-${i}`">{{
              $gettext('Menge von %{name}', { name: nameOf(part.articleId) })
            }}</label>
          </template>
        </oc-text-input>
        <oc-button
          size="small"
          :aria-label="$gettext('%{name} entfernen', { name: nameOf(part.articleId) })"
          @click="remove(i)"
        >
          <oc-icon name="delete-bin" size="small" />
        </oc-button>
      </li>
    </ul>
    <div class="zk-parts-add">
      <oc-select
        :id="`${uid}-article`"
        v-model="newArticle"
        class="zk-parts-picker"
        :label="$gettext('Material')"
        :options="options"
        :reduce="(o: Option) => o.id"
        option-label="label"
        :clearable="true"
        :searchable="true"
      />
      <oc-text-input
        :id="`${uid}-new-qty`"
        class="zk-parts-qty"
        type="number"
        min="1"
        :label="$gettext('Menge')"
        :model-value="String(newQuantity)"
        @update:model-value="(v: string) => (newQuantity = Number(v))"
      />
      <oc-button :disabled="!newArticle" @click="add">
        <oc-icon name="add" size="small" />
        <span>{{ $gettext('Hinzufügen') }}</span>
      </oc-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { Article, CategoryDef, Part } from '../domain/types'

interface Option {
  id: string
  label: string
}

/** Liste von Teilen (Material + Menge) bearbeiten. */
const props = defineProps<{
  parts: Part[]
  articles: Article[]
  categories: CategoryDef[]
  emptyText?: string
}>()
const emit = defineEmits<{ 'update:parts': [parts: Part[]] }>()
const { $gettext } = useGettext()

const uid = `zk-parts-${useId()}`
const newArticle = ref<string | null>(null)
const newQuantity = ref(1)

const categoryName = (id: string) => props.categories.find((c) => c.id === id)?.name ?? id
const options = computed<Option[]>(() =>
  props.articles
    .map((a) => ({ id: a.id, label: `${a.name} · ${categoryName(a.category)}` }))
    .sort((a, b) => a.label.localeCompare(b.label, 'de'))
)
const nameOf = (id: string) => props.articles.find((a) => a.id === id)?.name ?? id

const positive = (v: unknown) => {
  const n = Math.floor(Number(v))
  return Number.isFinite(n) && n > 0 ? n : 1
}

function setQuantity(index: number, value: string) {
  emit(
    'update:parts',
    props.parts.map((p, i) => (i === index ? { ...p, quantity: positive(value) } : p))
  )
}

function remove(index: number) {
  emit(
    'update:parts',
    props.parts.filter((_, i) => i !== index)
  )
}

function add() {
  if (!newArticle.value) return
  const quantity = positive(newQuantity.value)
  const existing = props.parts.findIndex((p) => p.articleId === newArticle.value)
  emit(
    'update:parts',
    existing >= 0
      ? props.parts.map((p, i) => (i === existing ? { ...p, quantity: p.quantity + quantity } : p))
      : [...props.parts, { articleId: newArticle.value, quantity }]
  )
  newArticle.value = null
  newQuantity.value = 1
}
</script>

<style>
.zk-parts-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.zk-parts-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.125rem 0;
}
.zk-parts-name {
  flex: 1 1 auto;
}
.zk-parts-qty {
  width: 6rem;
}
.zk-parts-qty input {
  width: 100%;
  box-sizing: border-box;
}
.zk-parts-add {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.zk-parts-picker {
  flex: 1 1 16rem;
}
</style>
