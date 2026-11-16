<template>
  <section class="zk-extras ext:mt-6" aria-labelledby="zk-extras-h">
    <h2 id="zk-extras-h" class="ext:text-lg ext:font-bold">{{ $gettext('Zusätzliches') }}</h2>
    <oc-list raw>
      <li
        v-for="extra in visible"
        :key="extra.id"
        class="zk-row ext:flex ext:items-center ext:gap-3"
        :class="{ 'zk-row-done': extra.checked }"
      >
        <oc-checkbox
          class="zk-row-label ext:grow"
          size="large"
          :label="`${extra.quantity} × ${extra.text}`"
          :model-value="extra.checked"
          :disabled="!canWrite"
          @update:model-value="emit('toggle', extra.id)"
        />
        <oc-button
          v-if="canWrite"
          class="zk-extra-remove"
          size="small"
          :aria-label="$gettext('Entfernen: %{text}', { text: extra.text })"
          @click="pendingRemove = extra"
        >
          {{ $gettext('Entfernen') }}
        </oc-button>
      </li>
    </oc-list>
    <p v-if="extras.length === 0" class="ext:my-2">{{ $gettext('Keine zusätzlichen Zeilen.') }}</p>
    <form
      v-if="canWrite"
      class="zk-extras-form ext:flex ext:flex-wrap ext:items-end ext:gap-2 ext:mt-2"
      @submit.prevent="submit"
    >
      <oc-text-input
        v-model="text"
        class="ext:grow ext:basis-48"
        :label="$gettext('Text')"
        required-mark
        :fix-message-line="true"
        :error-message="textError"
        :error-message-debounced-time="0"
      />
      <oc-text-input
        :model-value="String(quantity)"
        class="zk-input-qty"
        type="number"
        :label="$gettext('Menge')"
        required-mark
        :fix-message-line="true"
        :error-message="quantityError"
        :error-message-debounced-time="0"
        @update:model-value="quantity = Number($event)"
      />
      <oc-button submit="submit" appearance="filled" color-role="primary">
        {{ $gettext('Hinzufügen') }}
      </oc-button>
    </form>

    <ConfirmDialog
      v-if="pendingRemove"
      :title="$gettext('%{name} entfernen?', { name: pendingRemove.text })"
      @confirm="confirmRemove"
      @cancel="pendingRemove = null"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { ExtraItem } from '../domain/types'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps<{ extras: ExtraItem[]; canWrite: boolean; onlyOpen?: boolean }>()
const emit = defineEmits<{
  toggle: [id: string]
  remove: [id: string]
  add: [text: string, quantity: number]
}>()
const { $gettext } = useGettext()

const text = ref('')
const quantity = ref<number>(1)
/** Fehler erscheinen erst nach einem Absendeversuch und verschwinden bei gültiger Eingabe. */
const attempted = ref(false)
const pendingRemove = ref<ExtraItem | null>(null)

const textError = computed(() =>
  attempted.value && !text.value.trim() ? $gettext('Bitte Text eingeben') : ''
)
const quantityError = computed(() => {
  if (!attempted.value) return ''
  const q = Number(quantity.value)
  if (!Number.isFinite(q) || q < 1) return $gettext('Mindestens 1')
  return Number.isInteger(q) ? '' : $gettext('Bitte eine ganze Zahl eingeben')
})

function confirmRemove() {
  if (pendingRemove.value) {
    emit('remove', pendingRemove.value.id)
  }
  pendingRemove.value = null
}

const visible = computed(() =>
  props.onlyOpen ? props.extras.filter((e) => !e.checked) : props.extras
)

function submit() {
  const t = text.value.trim()
  const q = Number(quantity.value)
  attempted.value = true
  if (!t || !Number.isInteger(q) || q < 1) {
    return
  }
  attempted.value = false
  emit('add', t, q)
  text.value = ''
  quantity.value = 1
}
</script>

<style>
.zk-input-qty {
  width: 6rem;
}
.zk-input-qty input,
.zk-extras-form .oc-text-input {
  width: 100%;
  min-width: 0;
}
</style>
