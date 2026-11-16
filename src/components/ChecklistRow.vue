<template>
  <li
    class="zk-row ext:flex ext:items-center ext:gap-3"
    :class="{ 'zk-row-done': checked && checkable, 'zk-row-inactive': !checkable }"
  >
    <label v-if="checkable" class="zk-row-label ext:flex ext:items-center ext:gap-3 ext:grow">
      <input
        type="checkbox"
        class="zk-row-box"
        :checked="checked"
        :disabled="disabled"
        @change="emit('toggle')"
      />
      <span class="zk-row-text">
        <span class="zk-row-qty">{{ quantity }} ×</span> {{ name }}
      </span>
    </label>
    <div v-else class="zk-row-label ext:flex ext:items-center ext:gap-3 ext:grow">
      <span class="zk-row-text">
        <span v-if="quantity > 0" class="zk-row-qty">{{ quantity }} ×</span> {{ name }}
      </span>
    </div>
    <span v-if="missing > 0" class="zk-hint zk-hint-missing">{{
      $gettext('%{n} fehlen', { n: String(missing) })
    }}</span>
    <span v-if="toCut > 0" class="zk-hint zk-hint-cut">{{
      $gettext('%{n} vor Ort schlagen', { n: String(toCut) })
    }}</span>
  </li>
</template>

<script setup lang="ts">
import { useGettext } from 'vue3-gettext'

withDefaults(
  defineProps<{
    name: string
    quantity: number
    checked?: boolean
    /** false: keine Checkbox (nichts aus dem Bestand zu packen) */
    checkable?: boolean
    missing?: number
    toCut?: number
    disabled?: boolean
  }>(),
  { checked: false, checkable: true, missing: 0, toCut: 0, disabled: false }
)
const emit = defineEmits<{ toggle: [] }>()
const { $gettext } = useGettext()
</script>

<style>
.zk-row {
  min-height: 44px;
  padding: 0.25rem 0.5rem;
  border-bottom: 1px solid var(--oc-role-outline-variant, #ccc);
  list-style: none;
}
.zk-row-label {
  min-height: 44px;
  cursor: pointer;
}
.zk-row-box {
  width: 1.5rem;
  height: 1.5rem;
  flex: none;
}
.zk-row-qty {
  font-weight: 700;
}
.zk-row-done .zk-row-text {
  text-decoration: line-through;
  opacity: 0.55;
}
.zk-row-inactive {
  opacity: 0.6;
}
.zk-hint {
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
}
.zk-hint-missing {
  color: var(--oc-role-error, #b3261e);
}
.zk-hint-cut {
  color: var(--oc-role-on-surface-variant, #555);
}
</style>
