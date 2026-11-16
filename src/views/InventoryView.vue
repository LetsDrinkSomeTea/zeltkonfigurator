<template>
  <app-layout :title="$gettext('Bestand')" :loading="loading" :error="error">
    <template #actions>
      <span v-if="canWrite" class="zk-status ext:text-sm" role="status" aria-live="polite">
        <template v-if="saving">{{ $gettext('Wird gespeichert …') }}</template>
        <template v-else-if="saved">{{ $gettext('Gespeichert') }}</template>
      </span>
    </template>

    <p v-if="!canWrite" class="zk-hint ext:mb-4">{{ $gettext('Nur Lesezugriff') }}</p>

    <oc-text-input
      id="zk-inventory-search"
      v-model="query"
      class="zk-search ext:mb-4"
      :label="$gettext('Artikel suchen')"
      :default-value="$gettext('Name oder Kategorie')"
      :clear-button-enabled="true"
      :clear-button-accessible-label="$gettext('Suche zurücksetzen')"
    />

    <p v-if="noMatches" class="zk-hint" role="status">{{ $gettext('keine Treffer') }}</p>

    <section
      v-for="group in groups"
      :key="group.category"
      class="ext:mb-6"
      :aria-labelledby="`zk-group-${group.category}`"
    >
      <h2 :id="`zk-group-${group.category}`" class="ext:text-lg ext:font-bold ext:mb-2">
        {{ group.title }}
        <span class="zk-count">({{ group.articles.length }})</span>
      </h2>
      <ul class="zk-list">
        <li v-for="article in group.articles" :key="article.id" class="zk-row">
          <div class="zk-name">
            <span>{{ article.name }}</span>
            <small v-if="article.cuttable" class="zk-hint ext:block">{{
              $gettext('kann vor Ort geschlagen werden')
            }}</small>
          </div>
          <template v-if="canWrite">
            <div class="zk-qty">
              <oc-button
                size="large"
                :aria-label="$gettext('%{name}: eins weniger', { name: article.name })"
                :disabled="quantityOf(article.id) <= 0"
                @click="setQuantity(article.id, quantityOf(article.id) - 1)"
              >
                <oc-icon name="subtract" />
              </oc-button>
              <oc-text-input
                :id="`zk-qty-${article.id}`"
                class="zk-qty-input"
                type="number"
                min="0"
                step="1"
                inputmode="numeric"
                :label="$gettext('%{name}: Stückzahl', { name: article.name })"
                :model-value="String(quantityOf(article.id))"
                @change="onQuantity(article.id, $event)"
              >
                <template #label>
                  <label class="ext:sr-only" :for="`zk-qty-${article.id}`">{{
                    $gettext('%{name}: Stückzahl', { name: article.name })
                  }}</label>
                </template>
              </oc-text-input>
              <oc-button
                size="large"
                :aria-label="$gettext('%{name}: eins mehr', { name: article.name })"
                @click="setQuantity(article.id, quantityOf(article.id) + 1)"
              >
                <oc-icon name="add" />
              </oc-button>
            </div>
            <oc-text-input
              :id="`zk-note-${article.id}`"
              class="zk-note"
              :label="$gettext('%{name}: Notiz', { name: article.name })"
              :default-value="$gettext('Notiz')"
              :model-value="noteOf(article.id)"
              @change="onNote(article.id, $event)"
            >
              <template #label>
                <label class="ext:sr-only" :for="`zk-note-${article.id}`">{{
                  $gettext('%{name}: Notiz', { name: article.name })
                }}</label>
              </template>
            </oc-text-input>
          </template>
          <template v-else>
            <span class="zk-qty-text">{{ quantityOf(article.id) }}</span>
            <span class="zk-note-text">{{ noteOf(article.id) }}</span>
          </template>
        </li>
      </ul>
    </section>

    <section v-if="unknown.length > 0" class="ext:mb-6" aria-labelledby="zk-group-unknown">
      <h2 id="zk-group-unknown" class="ext:text-lg ext:font-bold ext:mb-2">
        {{ $gettext('Unbekannte Artikel') }}
        <span class="zk-count">({{ unknown.length }})</span>
      </h2>
      <p class="zk-hint ext:mb-2">
        {{
          $gettext(
            'Diese Einträge stehen in der Bestandsdatei, die App kennt die Artikel aber nicht. Sie bleiben beim Speichern erhalten.'
          )
        }}
      </p>
      <ul class="zk-list">
        <li v-for="item in unknown" :key="item.id" class="zk-row">
          <div class="zk-name">
            <code>{{ item.id }}</code>
          </div>
          <span class="zk-qty-text">{{ item.quantity }}</span>
          <span class="zk-note-text">{{ item.note }}</span>
        </li>
      </ul>
    </section>
  </app-layout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import AppLayout from '../components/AppLayout.vue'
import { useStock } from '../composables/useStock'
import { catalog } from '../domain/catalog'
import { CATEGORIES, type Category } from '../domain/types'

const { $gettext } = useGettext()
const { entries, loading, saving, error, canWrite, load, setQuantity, setNote, flush } = useStock()

const query = ref('')
const saved = ref(false)

const categoryTitle = (category: Category): string => {
  switch (category) {
    case 'dach':
      return $gettext('Dächer und Planen')
    case 'wand':
      return $gettext('Seitenwand')
    case 'stange':
      return $gettext('Stangen und Gestänge')
    case 'abspannung':
      return $gettext('Heringe und Abspannung')
    case 'kleinteil':
      return $gettext('Kleinteile')
    default:
      return $gettext('Bodenplanen')
  }
}

const groups = computed(() => {
  const q = query.value.trim().toLowerCase()
  return CATEGORIES.map((category) => {
    const title = categoryTitle(category)
    const categoryMatches = q !== '' && title.toLowerCase().includes(q)
    const articles = catalog.articles.filter(
      (a) =>
        a.category === category && (q === '' || categoryMatches || a.name.toLowerCase().includes(q))
    )
    return { category, title, articles }
  }).filter((g) => g.articles.length > 0)
})

const unknown = computed(() => {
  const known = new Set(catalog.articles.map((a) => a.id))
  const q = query.value.trim().toLowerCase()
  return Object.entries(entries.value)
    .filter(([id]) => !known.has(id))
    .filter(([id]) => q === '' || id.toLowerCase().includes(q))
    .map(([id, e]) => ({ id, quantity: e.quantity, note: e.note ?? '' }))
})

const noMatches = computed(
  () => !loading.value && groups.value.length === 0 && unknown.value.length === 0
)

const quantityOf = (id: string): number => entries.value[id]?.quantity ?? 0
const noteOf = (id: string): string => entries.value[id]?.note ?? ''

function onQuantity(id: string, value: string) {
  setQuantity(id, value.trim() === '' ? NaN : Number(value))
  // Ungültige Eingaben (leer, negativ, Dezimalzahl) im Feld auf den normalisierten Wert zurücksetzen.
  const input = document.getElementById(`zk-qty-${id}`) as HTMLInputElement | null
  if (input) {
    input.value = String(quantityOf(id))
  }
}

function onNote(id: string, value: string) {
  setNote(id, value)
}

watch(saving, (now, before) => {
  if (before && !now && !error.value) {
    saved.value = true
  }
})

onMounted(async () => {
  await load()
})
onBeforeUnmount(() => {
  void flush()
})
</script>

<style scoped>
.zk-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.zk-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--oc-role-outline-variant, #ccc);
}
.zk-qty {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.zk-hint,
.zk-count,
.zk-status {
  color: var(--oc-role-on-surface-variant, inherit);
}
.zk-qty-input {
  width: 5rem;
}
.zk-qty-input :deep(input),
.zk-note :deep(input),
.zk-search :deep(input) {
  width: 100%;
  box-sizing: border-box;
}
.zk-qty-input :deep(input) {
  text-align: center;
}
.zk-qty-text {
  font-weight: bold;
}
@media (min-width: 640px) {
  .zk-row {
    flex-direction: row;
    align-items: center;
  }
  .zk-name {
    flex: 1 1 40%;
  }
  .zk-note,
  .zk-note-text {
    flex: 1 1 30%;
  }
  .zk-qty-text {
    min-width: 5rem;
  }
}
</style>
