<template>
  <div>
    <div class="zk-toolbar ext:mb-4">
      <oc-text-input
        id="zk-inventory-search"
        v-model="query"
        class="zk-search"
        :label="$gettext('Artikel suchen')"
        :default-value="$gettext('Name oder Kategorie')"
        :clear-button-enabled="true"
        :clear-button-accessible-label="$gettext('Suche zurücksetzen')"
      />
      <oc-switch
        v-model:checked="onlyAvailable"
        class="zk-filter"
        :label="$gettext('Nur vorhandene')"
      />
      <oc-button
        v-if="canWrite"
        appearance="filled"
        color-role="primary"
        :aria-expanded="adding"
        @click="startAdd"
      >
        <oc-icon name="add" size="small" />
        <span>{{ $gettext('Material hinzufügen') }}</span>
      </oc-button>
    </div>

    <ArticleForm
      v-if="adding"
      class="ext:mb-6"
      :title="$gettext('Neues Material')"
      :categories="catalog.categories"
      :with-quantity="true"
      @save="onAdd"
      @cancel="adding = false"
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
          <ArticleForm
            v-if="editing === article.id"
            class="zk-grow"
            :title="$gettext('%{name} bearbeiten', { name: article.name })"
            :categories="catalog.categories"
            :article="article"
            @save="(a) => onEdit(article.id, a)"
            @cancel="editing = null"
          />
          <div v-else class="zk-name">
            <span>{{ article.name }}</span>
            <span v-if="canWrite && !article.wall" class="zk-article-actions">
              <oc-button
                appearance="raw"
                size="small"
                :aria-label="$gettext('%{name} bearbeiten', { name: article.name })"
                @click="editing = article.id"
              >
                <oc-icon name="pencil" size="small" />
              </oc-button>
              <oc-button
                appearance="raw"
                size="small"
                :aria-label="$gettext('%{name} löschen', { name: article.name })"
                @click="askDelete(article)"
              >
                <oc-icon name="delete-bin" size="small" />
              </oc-button>
            </span>
          </div>
          <template v-if="canWrite && editing !== article.id">
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
              v-if="editingNote === article.id"
              :id="`zk-note-${article.id}`"
              class="zk-note"
              :label="$gettext('%{name}: Notiz', { name: article.name })"
              :default-value="$gettext('Notiz')"
              :model-value="noteOf(article.id)"
              @change="commitNote(article.id, $event)"
              @keydown.enter.prevent="onNoteEnter(article.id, $event)"
              @keydown.esc.stop="cancelNote(article.id)"
              @focusout="onNoteFocusOut(article.id, $event)"
            >
              <template #label>
                <label class="ext:sr-only" :for="`zk-note-${article.id}`">{{
                  $gettext('%{name}: Notiz', { name: article.name })
                }}</label>
              </template>
            </oc-text-input>
            <button
              v-else
              :id="`zk-note-btn-${article.id}`"
              type="button"
              class="zk-note zk-note-button"
              :class="{ 'zk-note-empty': noteOf(article.id) === '' }"
              :aria-label="$gettext('%{name}: Notiz bearbeiten', { name: article.name })"
              @click="startNote(article.id)"
            >
              {{ noteOf(article.id) || $gettext('Notiz hinzufügen') }}
            </button>
          </template>
          <template v-else-if="editing !== article.id">
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
            'Diese Einträge stehen in der Datei der Materialliste, gehören aber zu keinem bekannten Material. Sie bleiben beim Speichern erhalten.'
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
          <oc-button
            v-if="canWrite"
            size="large"
            class="zk-remove"
            :class="{ 'zk-remove-confirm': confirmRemove === item.id }"
            :aria-label="
              confirmRemove === item.id
                ? $gettext('%{id} wirklich entfernen?', { id: item.id })
                : $gettext('%{id} entfernen', { id: item.id })
            "
            @click="onRemove(item.id)"
            @blur="confirmRemove = null"
            @keydown.esc="confirmRemove = null"
          >
            {{
              confirmRemove === item.id ? $gettext('Wirklich entfernen?') : $gettext('Entfernen')
            }}
          </oc-button>
        </li>
      </ul>
    </section>

    <CategoryManager
      v-if="canWrite"
      :categories="catalog.categories"
      :articles="catalog.articles"
      @save="(c) => st.edit({ type: 'upsertCategory', category: c })"
      @remove="(id) => st.edit({ type: 'removeCategory', id })"
    />

    <ConfirmDialog
      v-if="deleting"
      :title="$gettext('%{name} löschen?', { name: deleting.name })"
      :confirm-label="$gettext('Löschen')"
      @confirm="confirmDelete"
      @cancel="deleting = null"
    />
    <ConfirmDialog
      v-if="blocked"
      :title="blocked"
      :confirm-label="$gettext('OK')"
      :cancel-label="$gettext('Schließen')"
      @confirm="blocked = null"
      @cancel="blocked = null"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { UseStock } from '../composables/useStock'
import { articleUsage, uniqueId } from '../domain/catalogEdit'
import type { Article } from '../domain/types'
import ArticleForm, { type ArticleInput } from './ArticleForm.vue'
import CategoryManager from './CategoryManager.vue'
import ConfirmDialog from './ConfirmDialog.vue'

/** Reiter „Material“ der Materialliste: Stückzahlen, Notizen, Material anlegen und bearbeiten. */
const props = defineProps<{ st: UseStock }>()

const { $gettext } = useGettext()
const st = props.st
const { entries, catalog, catalogData, loading, canWrite, setQuantity, setNote, removeEntry } = st

const adding = ref(false)
const editing = ref<string | null>(null)
const deleting = ref<Article | null>(null)
/** Meldung, warum ein Artikel nicht gelöscht werden kann */
const blocked = ref<string | null>(null)

function startAdd() {
  adding.value = !adding.value
}

function ensureCategory(input: ArticleInput): string {
  if (!input.newCategory) return input.category
  const id = uniqueId(
    input.newCategory,
    catalog.value.categories.map((c) => c.id)
  )
  st.edit({ type: 'upsertCategory', category: { id, name: input.newCategory } })
  return id
}

function onAdd(input: ArticleInput) {
  const category = ensureCategory(input)
  const id = uniqueId(
    input.name,
    catalog.value.articles.map((a) => a.id)
  )
  st.edit({ type: 'upsertArticle', article: { id, name: input.name, category } })
  if (input.quantity > 0) setQuantity(id, input.quantity)
  adding.value = false
}

function onEdit(id: string, input: ArticleInput) {
  const category = ensureCategory(input)
  st.edit({ type: 'upsertArticle', article: { id, name: input.name, category } })
  editing.value = null
}

function askDelete(article: Article) {
  const used = articleUsage(catalogData.value, article.id)
  if (used.length > 0) {
    blocked.value = $gettext('„%{name}“ wird noch verwendet in: %{where}', {
      name: article.name,
      where: used.join(', ')
    })
    return
  }
  deleting.value = article
}

function confirmDelete() {
  if (deleting.value) st.edit({ type: 'removeArticle', id: deleting.value.id })
  deleting.value = null
}

const query = ref('')
const confirmRemove = ref<string | null>(null)
const editingNote = ref<string | null>(null)

// Filter „Nur vorhandene“: pro Betrachter im Browser gemerkt, Vorgabe aus.
const FILTER_KEY = 'zeltkonfigurator.inventory.onlyAvailable'
function readFilter(): boolean {
  try {
    return localStorage.getItem(FILTER_KEY) === '1'
  } catch {
    return false
  }
}
const onlyAvailable = ref(readFilter())
watch(onlyAvailable, (value) => {
  try {
    localStorage.setItem(FILTER_KEY, value ? '1' : '0')
  } catch {
    // Speicher nicht verfügbar: Der Filter gilt dann nur für diese Sitzung.
  }
})

const groups = computed(() => {
  const q = query.value.trim().toLowerCase()
  return catalog.value.categories
    .map(({ id: category, name: title }) => {
      const categoryMatches = q !== '' && title.toLowerCase().includes(q)
      const articles = catalog.value.articles.filter(
        (a) =>
          a.category === category &&
          (!onlyAvailable.value || quantityOf(a.id) > 0) &&
          (q === '' || categoryMatches || a.name.toLowerCase().includes(q))
      )
      return { category, title, articles }
    })
    .filter((g) => g.articles.length > 0)
})

const unknown = computed(() => {
  const known = new Set(catalog.value.articles.map((a) => a.id))
  const q = query.value.trim().toLowerCase()
  return Object.entries(entries.value)
    .filter(([id]) => !known.has(id))
    .filter(([, e]) => !onlyAvailable.value || e.quantity > 0)
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

/** Öffnet das Notizfeld und setzt den Fokus hinein. */
async function startNote(id: string) {
  editingNote.value = id
  await nextTick()
  document.getElementById(`zk-note-${id}`)?.focus()
}

/** Speichert die Notiz und schließt das Feld; doppelte Auslöser (change, blur) sind wirkungslos. */
function commitNote(id: string, value: string) {
  if (editingNote.value !== id) {
    return
  }
  editingNote.value = null
  setNote(id, value)
}

function focusNoteButton(id: string) {
  void nextTick(() => document.getElementById(`zk-note-btn-${id}`)?.focus())
}

function onNoteEnter(id: string, event: KeyboardEvent) {
  commitNote(id, (event.target as HTMLInputElement).value)
  focusNoteButton(id)
}

function cancelNote(id: string) {
  if (editingNote.value === id) {
    editingNote.value = null
    focusNoteButton(id)
  }
}

function onNoteFocusOut(id: string, event: FocusEvent) {
  commitNote(id, (event.target as HTMLInputElement).value)
}

/** Zweistufiges Entfernen: erster Klick fragt nach, zweiter entfernt den Eintrag. */
function onRemove(id: string) {
  if (confirmRemove.value === id) {
    confirmRemove.value = null
    removeEntry(id)
  } else {
    confirmRemove.value = id
  }
}
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
.zk-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1.5rem;
}
.zk-search {
  flex: 1 1 16rem;
}
.zk-note-button {
  min-height: 44px;
  padding: 0.25rem 0.5rem;
  text-align: left;
  background: none;
  border: 1px dashed var(--oc-role-outline, #888);
  border-radius: 0.25rem;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.zk-note-empty {
  color: var(--oc-role-on-surface-variant, inherit);
}
.zk-remove-confirm {
  background-color: var(--oc-role-error, #b3261e);
  color: var(--oc-role-on-error, #fff);
}
.zk-name {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.zk-article-actions {
  display: inline-flex;
  gap: 0.25rem;
}
.zk-qty {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.zk-hint,
.zk-count {
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
  .zk-grow {
    flex: 1 1 100%;
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
