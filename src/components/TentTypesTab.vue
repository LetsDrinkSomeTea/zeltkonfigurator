<template>
  <div>
    <div v-if="st.canWrite.value && !editing" class="ext:mb-4">
      <oc-button appearance="filled" color-role="primary" @click="startNew">
        <oc-icon name="add" size="small" />
        <span>{{ $gettext('Neuer Zelttyp') }}</span>
      </oc-button>
    </div>

    <TentTypeEditor
      v-if="editing"
      class="ext:mb-6"
      :title="
        editing.isNew
          ? $gettext('Neuer Zelttyp')
          : $gettext('%{name} bearbeiten', { name: editing.data.name })
      "
      :tent-type="editing.data"
      :catalog="st.catalog.value"
      @save="onSave"
      @cancel="editing = null"
    />

    <ul class="zk-type-list">
      <li v-for="t in st.catalogData.value.tentTypes" :key="t.id" class="zk-type-row">
        <div class="zk-type-text">
          <strong>{{ t.name }}</strong>
          <span class="zk-hint">{{ summary(t) }}</span>
        </div>
        <div v-if="st.canWrite.value" class="zk-type-actions">
          <oc-button size="small" @click="startEdit(t)">
            <oc-icon name="pencil" size="small" />
            <span>{{ $gettext('Bearbeiten') }}</span>
          </oc-button>
          <oc-button
            size="small"
            :aria-label="$gettext('%{name} kopieren', { name: t.name })"
            @click="startCopy(t)"
          >
            <oc-icon name="file-copy" size="small" />
            <span>{{ $gettext('Kopieren') }}</span>
          </oc-button>
          <oc-button
            size="small"
            :aria-label="$gettext('%{name} löschen', { name: t.name })"
            @click="deleting = t"
          >
            <oc-icon name="delete-bin" size="small" />
          </oc-button>
        </div>
      </li>
    </ul>

    <ConfirmDialog
      v-if="deleting"
      :title="$gettext('Zelttyp %{name} löschen?', { name: deleting.name })"
      :confirm-label="$gettext('Löschen')"
      @confirm="confirmDelete"
      @cancel="deleting = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { UseStock } from '../composables/useStock'
import { uniqueId } from '../domain/catalogEdit'
import type { TentTypeData } from '../domain/types'
import ConfirmDialog from './ConfirmDialog.vue'
import TentTypeEditor from './TentTypeEditor.vue'
import './editor.css'

/** Reiter „Zelttypen“ der Materialliste. */
const props = defineProps<{ st: UseStock }>()
const { $gettext, $ngettext } = useGettext()

const editing = ref<{ isNew: boolean; data: TentTypeData } | null>(null)
const deleting = ref<TentTypeData | null>(null)

function summary(t: TentTypeData): string {
  const names = t.modules.map(
    (m) => props.st.catalogData.value.modules.find((x) => x.id === m.moduleId)?.name ?? m.moduleId
  )
  const counted = new Map<string, number>()
  for (const n of names) counted.set(n, (counted.get(n) ?? 0) + 1)
  const roofs = [...counted].map(([n, c]) => (c > 1 ? `${c} × ${n}` : n)).join(' + ')
  const wall =
    t.wall.segments > 0
      ? $ngettext('%{n} Wandsegment', '%{n} Wandsegmente', t.wall.segments, {
          n: String(t.wall.segments)
        })
      : $gettext('ohne Seitenwand')
  return `${roofs} · ${wall}`
}

function startNew() {
  const first = props.st.catalogData.value.modules[0]
  editing.value = {
    isNew: true,
    data: {
      id: '',
      name: '',
      modules: first ? [{ moduleId: first.id }] : [],
      wall: { segments: 0, options: ['keine'] },
      fixed: []
    }
  }
}

function startEdit(t: TentTypeData) {
  editing.value = { isNew: false, data: t }
}

function startCopy(t: TentTypeData) {
  editing.value = {
    isNew: true,
    data: {
      ...JSON.parse(JSON.stringify(t)),
      id: '',
      name: $gettext('%{name} (Kopie)', { name: t.name })
    }
  }
}

function onSave(data: TentTypeData) {
  const id =
    data.id ||
    uniqueId(
      data.name,
      props.st.catalogData.value.tentTypes.map((t) => t.id)
    )
  props.st.edit({ type: 'upsertTentType', tentType: { ...data, id } })
  editing.value = null
}

function confirmDelete() {
  if (deleting.value) props.st.edit({ type: 'removeTentType', id: deleting.value.id })
  deleting.value = null
}
</script>
