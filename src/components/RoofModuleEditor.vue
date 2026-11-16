<template>
  <form class="zk-editor" :aria-label="title" @submit.prevent="save">
    <h3 class="ext:text-lg ext:font-bold ext:mb-3">{{ title }}</h3>

    <oc-text-input
      :id="`${uid}-name`"
      v-model="draft.name"
      class="zk-editor-name"
      :label="$gettext('Name des Dachs')"
      required-mark
      :error-message="tried && !draft.name.trim() ? $gettext('Bitte einen Namen eingeben') : ''"
      :fix-message-line="true"
      :error-message-debounced-time="0"
    />

    <fieldset v-for="section in sections" :key="section.key" class="zk-editor-section">
      <legend>{{ section.legend }}</legend>
      <p class="zk-hint">{{ section.hint }}</p>
      <div v-for="(entry, i) in draft[section.key]" :key="entry.id || i" class="zk-variant">
        <div class="zk-editor-row">
          <oc-text-input
            :id="`${uid}-${section.key}-${i}`"
            v-model="entry.label"
            class="zk-editor-grow"
            :label="section.labelText(i)"
            required-mark
            :error-message="
              tried && !entry.label.trim() ? $gettext('Bitte eine Bezeichnung eingeben') : ''
            "
            :fix-message-line="true"
            :error-message-debounced-time="0"
          />
          <oc-button
            size="small"
            :disabled="draft[section.key].length <= 1"
            :aria-label="
              $gettext('%{name} entfernen', { name: entry.label || section.labelText(i) })
            "
            @click="draft[section.key].splice(i, 1)"
          >
            <oc-icon name="delete-bin" size="small" />
          </oc-button>
        </div>
        <PartsEditor
          v-model:parts="entry.parts"
          :articles="catalog.articles"
          :categories="catalog.categories"
        />
      </div>
      <oc-button size="small" @click="draft[section.key].push({ id: '', label: '', parts: [] })">
        <oc-icon name="add" size="small" />
        <span>{{ section.addText }}</span>
      </oc-button>
    </fieldset>

    <fieldset class="zk-editor-section">
      <legend>{{ $gettext('Immer dabei') }}</legend>
      <p class="zk-hint">
        {{ $gettext('Was dieses Dach immer braucht, egal welche Variante, z. B. das Dächle.') }}
      </p>
      <PartsEditor
        v-model:parts="draft.parts"
        :articles="catalog.articles"
        :categories="catalog.categories"
      />
    </fieldset>

    <div class="ext:flex ext:flex-wrap ext:gap-2 ext:mt-4">
      <oc-button submit="submit" appearance="filled" color-role="primary">{{
        $gettext('Dach speichern')
      }}</oc-button>
      <oc-button type="button" @click="emit('cancel')">{{ $gettext('Abbrechen') }}</oc-button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, reactive, ref, useId } from 'vue'
import { useGettext } from 'vue3-gettext'
import { uniqueId } from '../domain/catalogEdit'
import type { Catalog, RoofModule } from '../domain/types'
import PartsEditor from './PartsEditor.vue'
import './editor.css'

/** Dach-Baustein anlegen oder bearbeiten: Varianten, Aufbauten, feste Teile. */
const props = defineProps<{ title: string; module: RoofModule; catalog: Catalog }>()
const emit = defineEmits<{ save: [module: RoofModule]; cancel: [] }>()
const { $gettext } = useGettext()

const uid = `zk-rm-${useId()}`
const draft = reactive<RoofModule>(JSON.parse(JSON.stringify(props.module)))
const tried = ref(false)

const sections = computed(() => [
  {
    key: 'roofs' as const,
    legend: $gettext('Dach-Varianten'),
    hint: $gettext(
      'Woraus das Dach besteht. Mehrere Varianten = Ausweichmöglichkeiten, z. B. Jurtendach oder 6 Kohtenblätter; die erste ist die Vorgabe.'
    ),
    labelText: (i: number) => $gettext('Variante %{n}', { n: String(i + 1) }),
    addText: $gettext('Variante hinzufügen')
  },
  {
    key: 'setups' as const,
    legend: $gettext('Aufbauten'),
    hint: $gettext(
      'Wie das Dach aufgebaut wird und welches Gestänge dafür nötig ist, z. B. „Gestellt“ (Masten) oder „Gehängt“ (lange Mittelpfosten). Der erste ist die Vorgabe.'
    ),
    labelText: (i: number) => $gettext('Aufbau %{n}', { n: String(i + 1) }),
    addText: $gettext('Aufbau hinzufügen')
  }
])

function withIds<T extends { id: string; label: string }>(list: T[]): T[] {
  const taken: string[] = []
  return list.map((e) => {
    const id = e.id || uniqueId(e.label, [...taken, ...list.map((x) => x.id).filter(Boolean)])
    taken.push(id)
    return { ...e, id, label: e.label.trim() }
  })
}

function save() {
  tried.value = true
  const labelsOk = [...draft.roofs, ...draft.setups].every((e) => e.label.trim() !== '')
  if (!draft.name.trim() || !labelsOk) return
  const plain = JSON.parse(JSON.stringify(draft)) as RoofModule
  emit('save', {
    ...plain,
    name: plain.name.trim(),
    roofs: withIds(plain.roofs),
    setups: withIds(plain.setups)
  })
}
</script>

<style>
.zk-variant {
  padding: 0.5rem 0 0.75rem;
  border-bottom: 1px dashed var(--oc-role-outline-variant, #ccc);
  margin-bottom: 0.5rem;
}
</style>
