<template>
  <div>{{ pl.list.value?.items.length }}</div>
</template>

<script setup lang="ts">
import type { UsePacklist } from '../composables/usePacklist'

/** Reiter „Packliste“: abhaken, freie Zeilen, Druck. Umsetzung: AP 7. */
defineProps<{ pl: UsePacklist }>()
</script>
