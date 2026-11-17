<template>
  <form class="zk-editor" :aria-label="title" @submit.prevent="save">
    <h3 class="ext:text-lg ext:font-bold ext:mb-3">{{ title }}</h3>

    <oc-text-input
      :id="`${uid}-name`"
      v-model="draft.name"
      class="zk-editor-name"
      :label="$gettext('Name des Zelttyps')"
      required-mark
      :error-message="tried && !draft.name.trim() ? $gettext('Bitte einen Namen eingeben') : ''"
      :fix-message-line="true"
      :error-message-debounced-time="0"
    />

    <fieldset class="zk-editor-section">
      <legend>{{ $gettext('Dächer') }}</legend>
      <p class="zk-hint">
        {{
          $gettext(
            'Ein Zelt besteht aus einem oder mehreren Dächern, z. B. drei Jurten für eine Dreierjurtenburg. Pro Dach wählt man in der Packliste Dach-Variante und Aufbau.'
          )
        }}
      </p>
      <div v-for="(ref_, i) in draft.modules" :key="i" class="zk-editor-row">
        <oc-select
          :id="`${uid}-module-${i}`"
          class="zk-editor-grow"
          :label="$gettext('Dach %{n}', { n: String(i + 1) })"
          :options="modules"
          option-label="name"
          :clearable="false"
          :searchable="true"
          :model-value="modules.find((m) => m.id === ref_.moduleId)"
          @update:model-value="(m: RoofModule | null) => m && setModule(i, m.id)"
        />
        <fieldset v-if="setupsOf(ref_.moduleId).length > 1" class="zk-editor-checks">
          <legend>{{ $gettext('Angebotene Aufbauten') }}</legend>
          <oc-checkbox
            v-for="s in setupsOf(ref_.moduleId)"
            :key="s.id"
            :label="s.label"
            :model-value="offers(ref_, s.id)"
            @update:model-value="(on: boolean) => toggleSetup(i, s.id, on)"
          />
        </fieldset>
        <oc-button
          size="small"
          :disabled="draft.modules.length <= 1"
          :aria-label="$gettext('Dach %{n} entfernen', { n: String(i + 1) })"
          @click="draft.modules.splice(i, 1)"
        >
          <oc-icon name="delete-bin" size="small" />
        </oc-button>
      </div>
      <oc-button size="small" :disabled="modules.length === 0" @click="addModule">
        <oc-icon name="add" size="small" />
        <span>{{ $gettext('Dach hinzufügen') }}</span>
      </oc-button>
      <p v-if="modules.length === 0" class="zk-error">
        {{ $gettext('Es gibt noch keine Dächer. Lege sie im Reiter „Dächer“ an.') }}
      </p>
    </fieldset>

    <fieldset class="zk-editor-section">
      <legend>{{ $gettext('Seitenwand') }}</legend>
      <oc-text-input
        :id="`${uid}-segments`"
        class="zk-editor-small"
        type="number"
        min="0"
        :label="$gettext('Wandsegmente')"
        :description-message="
          $gettext('Anzahl der Seitenwand-Felder rundherum, z. B. 12 bei einer Jurte.')
        "
        :model-value="String(draft.wall.segments)"
        @update:model-value="
          (v: string) => (draft.wall.segments = Math.max(0, Math.floor(Number(v) || 0)))
        "
      />
      <fieldset class="zk-editor-checks">
        <legend>{{ $gettext('Wählbare Wände') }}</legend>
        <oc-checkbox
          v-for="o in wallOptions"
          :key="o.id"
          :label="o.label"
          :model-value="draft.wall.options.includes(o.id)"
          @update:model-value="(on: boolean) => toggleWall(o.id, on)"
        />
      </fieldset>
      <p v-if="tried && draft.wall.options.length === 0" class="zk-error">
        {{ $gettext('Bitte mindestens eine Wand auswählen') }}
      </p>
      <div class="zk-editor-row">
        <oc-select
          :id="`${uid}-default-wall`"
          class="zk-editor-grow"
          :label="$gettext('Standard-Wand')"
          :options="chosenWalls"
          option-label="label"
          :clearable="false"
          :searchable="false"
          :model-value="
            chosenWalls.find((o) => o.id === (draft.defaults?.wallId ?? draft.wall.options[0]))
          "
          @update:model-value="(o: Labeled | null) => o && setDefault({ wallId: o.id })"
        />
        <oc-select
          v-if="(draft.defaults?.wallId ?? draft.wall.options[0]) === 'hoch'"
          :id="`${uid}-default-build`"
          class="zk-editor-grow"
          :label="$gettext('Standard-Bauart')"
          :options="builds"
          option-label="label"
          :clearable="false"
          :searchable="false"
          :model-value="builds.find((o) => o.id === (draft.defaults?.buildId ?? 'super'))"
          @update:model-value="(o: Labeled | null) => o && setDefault({ buildId: o.id })"
        />
        <oc-select
          v-if="['hoch', 'nur-streifen'].includes(draft.defaults?.wallId ?? draft.wall.options[0])"
          :id="`${uid}-default-finish`"
          class="zk-editor-grow"
          :label="$gettext('Standard-Ausführung')"
          :options="finishes"
          option-label="label"
          :clearable="false"
          :searchable="false"
          :model-value="finishes.find((o) => o.id === (draft.defaults?.finish ?? 'blanko'))"
          @update:model-value="(o: Labeled | null) => o && setDefault({ finish: o.id as Finish })"
        />
      </div>
    </fieldset>

    <fieldset class="zk-editor-section">
      <legend>{{ $gettext('Weiteres Material') }}</legend>
      <p class="zk-hint">
        {{
          $gettext(
            'Was das Zelt unabhängig vom Dach braucht, z. B. Seitenstangen, Abspannseile, Heringe, Bodenplane.'
          )
        }}
      </p>
      <PartsEditor
        v-model:parts="draft.fixed"
        :articles="catalog.articles"
        :categories="catalog.categories"
      />
    </fieldset>

    <div class="ext:flex ext:flex-wrap ext:gap-2 ext:mt-4">
      <oc-button submit="submit" appearance="filled" color-role="primary">{{
        $gettext('Zelttyp speichern')
      }}</oc-button>
      <oc-button type="button" @click="emit('cancel')">{{ $gettext('Abbrechen') }}</oc-button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, reactive, ref, useId } from 'vue'
import { useGettext } from 'vue3-gettext'
import type {
  Catalog,
  Finish,
  RoofModule,
  TentDefaults,
  TentTypeData,
  WallOptionId
} from '../domain/types'
import PartsEditor from './PartsEditor.vue'
import './forms.css'
import './editor.css'

interface Labeled {
  id: string
  label: string
}

/** Zelttyp anlegen oder bearbeiten: Dächer, Seitenwand, weiteres Material. */
const props = defineProps<{ title: string; tentType: TentTypeData; catalog: Catalog }>()
const emit = defineEmits<{ save: [tentType: TentTypeData]; cancel: [] }>()
const { $gettext } = useGettext()

const uid = `zk-tt-${useId()}`
const draft = reactive<TentTypeData>(JSON.parse(JSON.stringify(props.tentType)))
const tried = ref(false)

const modules = computed(() => props.catalog.modules)
const setupsOf = (id: string) => modules.value.find((m) => m.id === id)?.setups ?? []
const offers = (ref_: TentTypeData['modules'][number], setupId: string) =>
  !ref_.setupIds || ref_.setupIds.length === 0 || ref_.setupIds.includes(setupId)

const wallOptions = computed<{ id: WallOptionId; label: string }[]>(() => [
  { id: 'keine', label: $gettext('Keine Seitenwand') },
  { id: 'normal', label: $gettext('Normal (Normalbahnen)') },
  { id: 'hoch', label: $gettext('Hoch (Superbahn oder Normalbahn + Streifen)') },
  { id: 'nur-streifen', label: $gettext('Nur Erweiterungsstreifen') },
  { id: 'erdstreifen', label: $gettext('Erdstreifen (Kohte)') }
])
const chosenWalls = computed(() =>
  wallOptions.value.filter((o) => draft.wall.options.includes(o.id))
)
const builds = computed<Labeled[]>(() => [
  { id: 'super', label: $gettext('Superbahn') },
  { id: 'normal+streifen', label: $gettext('Normalbahn + Erweiterungsstreifen') }
])
const finishes = computed<Labeled[]>(() => [
  { id: 'blanko', label: $gettext('Blanko') },
  { id: 'fenster', label: $gettext('Fenster') },
  { id: 'gaze', label: $gettext('Gaze') }
])

function setModule(index: number, moduleId: string) {
  draft.modules[index] = { moduleId }
}

function addModule() {
  const last = draft.modules.at(-1)
  draft.modules.push({ moduleId: last?.moduleId ?? modules.value[0].id })
}

function toggleSetup(index: number, setupId: string, on: boolean) {
  const ref_ = draft.modules[index]
  const all = setupsOf(ref_.moduleId).map((s) => s.id)
  const current = ref_.setupIds && ref_.setupIds.length > 0 ? ref_.setupIds : all
  const next = all.filter((id) => (id === setupId ? on : current.includes(id)))
  // Mindestens ein Aufbau bleibt; alle angeboten = keine Einschränkung speichern.
  if (next.length === 0) return
  draft.modules[index] =
    next.length === all.length ? { moduleId: ref_.moduleId } : { ...ref_, setupIds: next }
}

function toggleWall(id: WallOptionId, on: boolean) {
  const order = wallOptions.value.map((o) => o.id)
  const set = new Set(draft.wall.options)
  if (on) set.add(id)
  else set.delete(id)
  draft.wall.options = order.filter((o) => set.has(o))
  if (draft.defaults?.wallId && !set.has(draft.defaults.wallId as WallOptionId)) {
    draft.defaults = {}
  }
}

function setDefault(patch: TentDefaults) {
  draft.defaults = { ...draft.defaults, ...patch }
}

function save() {
  tried.value = true
  if (!draft.name.trim() || draft.wall.options.length === 0 || draft.modules.length === 0) return
  emit('save', { ...JSON.parse(JSON.stringify(draft)), name: draft.name.trim() })
}
</script>
