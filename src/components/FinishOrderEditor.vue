<template>
  <section class="zk-finish-order ext:mb-4" aria-labelledby="zk-finish-order-title">
    <h3 id="zk-finish-order-title" class="ext:font-bold">
      {{ $gettext('Ausweichreihenfolge der Ausführungen') }}
    </h3>
    <p class="ext:mb-2">
      {{
        $gettext(
          'Ist die gewünschte Ausführung nicht in ausreichender Menge da, weicht die App in dieser Reihenfolge aus.'
        )
      }}
    </p>
    <oc-list raw class="ext:flex ext:flex-col ext:gap-1">
      <li
        v-for="(finish, index) in order"
        :key="finish"
        class="ext:flex ext:items-center ext:gap-2"
      >
        <span class="ext:grow">{{ index + 1 }}. {{ finishLabel(finish) }}</span>
        <template v-if="!readOnly">
          <oc-button
            size="small"
            :disabled="index === 0"
            :aria-label="$gettext('%{name} nach oben', { name: finishLabel(finish) })"
            @click="move(index, -1)"
          >
            <oc-icon name="arrow-up" size="small" />
          </oc-button>
          <oc-button
            size="small"
            :disabled="index === order.length - 1"
            :aria-label="$gettext('%{name} nach unten', { name: finishLabel(finish) })"
            @click="move(index, 1)"
          >
            <oc-icon name="arrow-down" size="small" />
          </oc-button>
        </template>
      </li>
    </oc-list>
  </section>
</template>

<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
import type { Finish } from '../domain/types'

const props = defineProps<{ order: Finish[]; readOnly?: boolean }>()
const emit = defineEmits<{ (e: 'update:order', order: Finish[]): void }>()
const { $gettext } = useGettext()

function finishLabel(finish: Finish): string {
  switch (finish) {
    case 'blanko':
      return $gettext('Blanko')
    case 'fenster':
      return $gettext('Fenster')
    default:
      return $gettext('Gaze')
  }
}

function move(index: number, direction: -1 | 1) {
  const next = [...props.order]
  const target = index + direction
  if (target < 0 || target >= next.length) {
    return
  }
  ;[next[index], next[target]] = [next[target], next[index]]
  emit('update:order', next)
}
</script>
