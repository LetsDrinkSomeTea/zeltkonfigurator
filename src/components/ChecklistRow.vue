<template>
  <li
    class="zk-row ext:flex ext:flex-wrap ext:items-center ext:gap-x-3"
    :class="{ 'zk-row-done': checked && checkable, 'zk-row-inactive': !checkable }"
  >
    <oc-checkbox
      v-if="checkable && !readonly"
      class="zk-row-label ext:grow"
      size="large"
      :label="label"
      :model-value="checked"
      :disabled="disabled"
      @update:model-value="emit('toggle')"
    />
    <span v-else class="zk-row-label ext:flex ext:items-center ext:grow zk-row-text"
      >{{ label
      }}<span v-if="readonly && checkable && checked" class="ext:sr-only"
        >({{ $gettext('abgehakt') }})</span
      ></span
    >
    <span class="ext:flex ext:flex-wrap ext:gap-2">
      <oc-tag v-if="missing > 0" class="zk-hint zk-hint-missing" size="small">{{
        $ngettext('%{n} fehlt', '%{n} fehlen', missing, { n: String(missing) })
      }}</oc-tag>
    </span>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'

const props = withDefaults(
  defineProps<{
    name: string
    quantity: number
    checked?: boolean
    /** false: keine Checkbox (nichts aus dem Bestand zu packen) */
    checkable?: boolean
    missing?: number
    disabled?: boolean
    /** nur anzeigen: keine Checkbox, abgehakte Zeilen sind durchgestrichen */
    readonly?: boolean
  }>(),
  { checked: false, checkable: true, missing: 0, disabled: false, readonly: false }
)
const emit = defineEmits<{ toggle: [] }>()
const { $gettext } = useGettext()

/** „3 × Name“; Menge 0 (nicht aus dem Bestand) wird ohne Zahl angezeigt */
const label = computed(() =>
  props.quantity > 0 || props.checkable ? `${props.quantity} × ${props.name}` : props.name
)
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
}
/* ganze Zeile als Trefferfläche: das Label füllt die Breite */
.zk-row-label label {
  flex: 1;
  display: flex;
  align-items: center;
  align-self: stretch;
  min-height: 44px;
}
.zk-row-done label,
.zk-row-done .zk-row-text {
  text-decoration: line-through;
  opacity: 0.55;
}
.zk-row-inactive {
  opacity: 0.6;
}
.zk-hint-missing {
  color: var(--oc-role-error);
}
</style>
