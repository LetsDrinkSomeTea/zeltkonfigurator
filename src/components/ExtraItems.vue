<template>
  <section class="zk-extras ext:mt-6" aria-labelledby="zk-extras-h">
    <h2 id="zk-extras-h" class="ext:text-lg ext:font-bold">{{ $gettext('Zusätzliches') }}</h2>
    <ul class="ext:p-0">
      <li
        v-for="extra in visible"
        :key="extra.id"
        class="zk-row ext:flex ext:items-center ext:gap-3"
        :class="{ 'zk-row-done': extra.checked }"
      >
        <label class="zk-row-label ext:flex ext:items-center ext:gap-3 ext:grow">
          <input
            type="checkbox"
            class="zk-row-box"
            :checked="extra.checked"
            :disabled="!canWrite"
            @change="emit('toggle', extra.id)"
          />
          <span class="zk-row-text">
            <span class="zk-row-qty">{{ extra.quantity }} ×</span> {{ extra.text }}
          </span>
        </label>
        <oc-button
          v-if="canWrite"
          class="zk-extra-remove"
          size="small"
          :aria-label="$gettext('Entfernen: %{text}', { text: extra.text })"
          @click="emit('remove', extra.id)"
        >
          {{ $gettext('Entfernen') }}
        </oc-button>
      </li>
    </ul>
    <p v-if="extras.length === 0" class="ext:my-2">{{ $gettext('Keine zusätzlichen Zeilen.') }}</p>
    <form
      v-if="canWrite"
      class="zk-extras-form ext:flex ext:flex-wrap ext:items-end ext:gap-2 ext:mt-2"
      @submit.prevent="submit"
    >
      <label class="ext:flex ext:flex-col ext:grow">
        <span>{{ $gettext('Text') }}</span>
        <input v-model="text" type="text" class="zk-input" required />
      </label>
      <label class="ext:flex ext:flex-col">
        <span>{{ $gettext('Menge') }}</span>
        <input
          v-model.number="quantity"
          type="number"
          min="1"
          step="1"
          class="zk-input zk-input-qty"
          required
        />
      </label>
      <oc-button submit="submit" appearance="filled" color-role="primary">
        {{ $gettext('Hinzufügen') }}
      </oc-button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { ExtraItem } from '../domain/types'

const props = defineProps<{ extras: ExtraItem[]; canWrite: boolean; onlyOpen?: boolean }>()
const emit = defineEmits<{
  toggle: [id: string]
  remove: [id: string]
  add: [text: string, quantity: number]
}>()
const { $gettext } = useGettext()

const text = ref('')
const quantity = ref<number>(1)

const visible = computed(() =>
  props.onlyOpen ? props.extras.filter((e) => !e.checked) : props.extras
)

function submit() {
  const t = text.value.trim()
  const q = Number(quantity.value)
  if (!t || !Number.isInteger(q) || q < 1) {
    return
  }
  emit('add', t, q)
  text.value = ''
  quantity.value = 1
}
</script>

<style>
.zk-input {
  min-height: 44px;
  padding: 0 0.5rem;
  border: 1px solid var(--oc-role-outline, #888);
  border-radius: 4px;
  background: var(--oc-role-surface, #fff);
  color: var(--oc-role-on-surface, #000);
}
.zk-input-qty {
  width: 5rem;
}
</style>
