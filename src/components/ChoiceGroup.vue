<template>
  <div class="zk-choice" role="radiogroup" :aria-labelledby="`${uid}-label`">
    <span :id="`${uid}-label`" class="zk-choice-label">{{ label }}</span>
    <div class="zk-choice-options">
      <oc-button
        v-for="o in options"
        :key="o.id"
        role="radio"
        size="small"
        :aria-checked="o.id === modelValue"
        :appearance="o.id === modelValue ? 'filled' : 'outline'"
        :color-role="o.id === modelValue ? 'primary' : 'secondary'"
        :disabled="disabled"
        class="zk-choice-option"
        @click="emit('update:modelValue', o.id)"
      >
        {{ o.label }}
      </oc-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'

/** Auswahl als Knopfleiste: alle Möglichkeiten sichtbar, ein Tipp wählt. */
defineProps<{
  label: string
  options: { id: string; label: string }[]
  modelValue: string
  disabled?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [id: string] }>()
const uid = `zk-choice-${useId()}`
</script>

<style>
.zk-choice {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.75rem;
  margin: 0.25rem 0;
}
.zk-choice-label {
  min-width: 7rem;
  font-size: 0.875rem;
  color: var(--oc-role-on-surface-variant, inherit);
}
.zk-choice-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.zk-choice-option {
  min-height: 2.25rem;
}
</style>
