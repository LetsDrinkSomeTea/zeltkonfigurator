<template>
  <div class="zk-confirm-backdrop zk-no-print" @click.self="emit('cancel')">
    <div
      ref="dialog"
      class="zk-confirm"
      role="alertdialog"
      aria-modal="true"
      :aria-labelledby="`${uid}-title`"
      @keydown="onKeydown"
    >
      <h2 :id="`${uid}-title`" class="ext:font-bold ext:text-lg ext:mb-4">{{ title }}</h2>
      <div class="ext:flex ext:flex-wrap ext:justify-end ext:gap-2">
        <oc-button ref="cancelButton" class="zk-confirm-cancel" @click="emit('cancel')">
          {{ cancelLabel ?? $gettext('Abbrechen') }}
        </oc-button>
        <oc-button
          class="zk-confirm-ok"
          appearance="filled"
          color-role="primary"
          @click="emit('confirm')"
        >
          {{ confirmLabel ?? $gettext('Entfernen') }}
        </oc-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { useGettext } from 'vue3-gettext'

/**
 * Zugänglicher Bestätigungsdialog: Fokus startet auf „Abbrechen“, Escape bricht ab, Tab bleibt
 * im Dialog, und der Fokus kehrt danach zum auslösenden Element zurück.
 */
defineProps<{ title: string; confirmLabel?: string; cancelLabel?: string }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const { $gettext } = useGettext()

const uid = `zk-confirm-${useId()}`
const dialog = ref<HTMLElement>()
const cancelButton = ref<{ $el: HTMLElement }>()
let opener: HTMLElement | null = null

onMounted(async () => {
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  await nextTick()
  cancelButton.value?.$el?.focus()
})

onBeforeUnmount(() => {
  if (opener?.isConnected) {
    opener.focus()
  }
})

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    emit('cancel')
    return
  }
  if (event.key !== 'Tab' || !dialog.value) {
    return
  }
  const buttons = [...dialog.value.querySelectorAll<HTMLElement>('button')]
  const first = buttons[0]
  const last = buttons[buttons.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}
</script>

<style>
.zk-confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgb(0 0 0 / 50%);
}
.zk-confirm {
  max-width: 28rem;
  width: 100%;
  padding: 1.5rem;
  border-radius: 0.5rem;
  background: var(--oc-role-surface, #fff);
  color: var(--oc-role-on-surface, inherit);
  box-shadow: 0 4px 24px rgb(0 0 0 / 30%);
}
</style>
