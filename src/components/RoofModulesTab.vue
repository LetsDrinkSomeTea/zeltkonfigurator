<template>
  <div>
    <p class="zk-hint ext:mb-4">
      {{
        $gettext(
          'Dächer sind die Bausteine der Zelttypen: z. B. eine Jurte mit ihrem Dach, Dächle und Gestänge. Ein Zelttyp setzt sich aus einem oder mehreren Dächern zusammen.'
        )
      }}
    </p>
    <div v-if="st.canWrite.value && !editing" class="ext:mb-4">
      <oc-button appearance="filled" color-role="primary" @click="startNew">
        <oc-icon name="add" size="small" />
        <span>{{ $gettext('Neues Dach') }}</span>
      </oc-button>
    </div>

    <RoofModuleEditor
      v-if="editing"
      class="ext:mb-6"
      :title="
        editing.isNew
          ? $gettext('Neues Dach')
          : $gettext('%{name} bearbeiten', { name: editing.data.name })
      "
      :module="editing.data"
      :catalog="st.catalog.value"
      @save="onSave"
      @cancel="editing = null"
    />

    <ul class="zk-type-list">
      <li v-for="m in st.catalogData.value.modules" :key="m.id" class="zk-type-row">
        <div class="zk-type-text">
          <strong>{{ m.name }}</strong>
          <span class="zk-hint">{{ summary(m) }}</span>
        </div>
        <div v-if="st.canWrite.value" class="zk-type-actions">
          <oc-button size="small" @click="editing = { isNew: false, data: m }">
            <oc-icon name="pencil" size="small" />
            <span>{{ $gettext('Bearbeiten') }}</span>
          </oc-button>
          <oc-button
            size="small"
            :aria-label="$gettext('%{name} kopieren', { name: m.name })"
            @click="startCopy(m)"
          >
            <oc-icon name="file-copy" size="small" />
            <span>{{ $gettext('Kopieren') }}</span>
          </oc-button>
          <oc-button
            size="small"
            :aria-label="$gettext('%{name} löschen', { name: m.name })"
            @click="askDelete(m)"
          >
            <oc-icon name="delete-bin" size="small" />
          </oc-button>
        </div>
      </li>
    </ul>

    <ConfirmDialog
      v-if="deleting"
      :title="$gettext('Dach %{name} löschen?', { name: deleting.name })"
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
import { ref } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { UseStock } from '../composables/useStock'
import { moduleUsage, uniqueId } from '../domain/catalogEdit'
import type { RoofModule } from '../domain/types'
import ConfirmDialog from './ConfirmDialog.vue'
import RoofModuleEditor from './RoofModuleEditor.vue'
import './editor.css'

/** Reiter „Dächer“ der Materialliste: Dach-Bausteine. */
const props = defineProps<{ st: UseStock }>()
const { $gettext } = useGettext()

const editing = ref<{ isNew: boolean; data: RoofModule } | null>(null)
const deleting = ref<RoofModule | null>(null)
const blocked = ref<string | null>(null)

function summary(m: RoofModule): string {
  return [
    m.roofs.map((r) => r.label).join(' / '),
    $gettext('Aufbau: %{list}', { list: m.setups.map((s) => s.label).join(', ') })
  ].join(' · ')
}

function startNew() {
  editing.value = {
    isNew: true,
    data: {
      id: '',
      name: '',
      roofs: [{ id: '', label: '', parts: [] }],
      setups: [{ id: 'gestellt', label: $gettext('Gestellt'), parts: [] }],
      parts: []
    }
  }
}

function startCopy(m: RoofModule) {
  editing.value = {
    isNew: true,
    data: {
      ...JSON.parse(JSON.stringify(m)),
      id: '',
      name: $gettext('%{name} (Kopie)', { name: m.name })
    }
  }
}

function onSave(data: RoofModule) {
  const id =
    data.id ||
    uniqueId(
      data.name,
      props.st.catalogData.value.modules.map((m) => m.id)
    )
  props.st.edit({ type: 'upsertModule', module: { ...data, id } })
  editing.value = null
}

function askDelete(m: RoofModule) {
  const used = moduleUsage(props.st.catalogData.value, m.id)
  if (used.length > 0) {
    blocked.value = $gettext('„%{name}“ wird noch verwendet in: %{where}', {
      name: m.name,
      where: used.join(', ')
    })
    return
  }
  deleting.value = m
}

function confirmDelete() {
  if (deleting.value) props.st.edit({ type: 'removeModule', id: deleting.value.id })
  deleting.value = null
}
</script>
