<template>
  <details class="zk-categories ext:mt-6">
    <summary class="zk-categories-summary">{{ $gettext('Kategorien verwalten') }}</summary>
    <p class="zk-hint ext:my-2">
      {{
        $gettext(
          'Kategorien gliedern die Materialliste und die Packlisten. Umbenennen geht jederzeit; löschen nur, wenn kein Material mehr darin ist.'
        )
      }}
    </p>
    <ul class="zk-category-list">
      <li v-for="c in categories" :key="c.id" class="zk-category-row">
        <oc-text-input
          :id="`zk-category-${c.id}`"
          class="zk-category-name"
          :label="$gettext('Kategorie')"
          :model-value="c.name"
          :disabled="c.id === 'wand'"
          @change="(v: string) => rename(c, v)"
        />
        <span class="zk-hint">{{
          $ngettext('%{n} Material', '%{n} Materialien', countOf(c.id), {
            n: String(countOf(c.id))
          })
        }}</span>
        <oc-button
          size="small"
          :disabled="c.id === 'wand' || countOf(c.id) > 0"
          :aria-label="$gettext('Kategorie %{name} löschen', { name: c.name })"
          @click="emit('remove', c.id)"
        >
          <oc-icon name="delete-bin" size="small" />
        </oc-button>
      </li>
    </ul>
    <form class="ext:flex ext:flex-wrap ext:items-end ext:gap-2 ext:mt-2" @submit.prevent="add">
      <oc-text-input
        id="zk-category-new"
        v-model="newName"
        :label="$gettext('Neue Kategorie')"
        :error-message="error"
        :fix-message-line="true"
        :error-message-debounced-time="0"
      />
      <oc-button submit="submit">{{ $gettext('Kategorie anlegen') }}</oc-button>
    </form>
  </details>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { uniqueId } from '../domain/catalogEdit'
import type { Article, CategoryDef } from '../domain/types'

/** Kategorien anlegen, umbenennen und (leere) löschen. */
const props = defineProps<{ categories: CategoryDef[]; articles: Article[] }>()
const emit = defineEmits<{ save: [category: CategoryDef]; remove: [id: string] }>()
const { $gettext, $ngettext } = useGettext()

const newName = ref('')
const error = ref('')

const countOf = (id: string) => props.articles.filter((a) => a.category === id).length

function rename(c: CategoryDef, value: string) {
  const name = value.trim()
  if (name && name !== c.name) emit('save', { id: c.id, name })
}

function add() {
  const name = newName.value.trim()
  if (!name) {
    error.value = $gettext('Bitte einen Namen eingeben')
    return
  }
  if (props.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    error.value = $gettext('Diese Kategorie gibt es schon')
    return
  }
  emit('save', {
    id: uniqueId(
      name,
      props.categories.map((c) => c.id)
    ),
    name
  })
  newName.value = ''
  error.value = ''
}
</script>

<style>
.zk-categories-summary {
  cursor: pointer;
  font-weight: bold;
  min-height: 44px;
  display: flex;
  align-items: center;
}
.zk-category-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.zk-category-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.5rem 1rem;
  padding: 0.25rem 0;
}
.zk-category-name {
  flex: 1 1 14rem;
}
</style>
