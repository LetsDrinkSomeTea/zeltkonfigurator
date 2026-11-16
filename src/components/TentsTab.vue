<template>
  <div>{{ pl.list.value?.tents.length }}</div>
</template>

<script setup lang="ts">
import type { UsePacklist } from '../composables/usePacklist'

/** Reiter „Zelte“: Konfigurator. Umsetzung: AP 6. */
defineProps<{ pl: UsePacklist }>()
</script>
