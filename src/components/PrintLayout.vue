<template>
  <div class="zk-print">
    <h1 class="zk-print-title">{{ list.name }}</h1>
    <p class="zk-print-meta">
      <span v-if="list.date">{{ $gettext('Datum') }}: {{ formatDate(list.date) }} · </span>
      {{ $gettext('Gedruckt am') }}: {{ printedAt }}
    </p>

    <section class="zk-print-section">
      <h2>{{ $gettext('Gesamt') }}</h2>
      <template v-for="group in groups" :key="group.category">
        <h3>{{ group.title }}</h3>
        <ul class="zk-print-list">
          <li v-for="item in group.items" :key="item.articleId" class="zk-print-row">
            <span class="zk-print-box" aria-hidden="true">{{
              isCheckable(item) ? (item.checked ? '☑' : '☐') : '–'
            }}</span>
            <span class="zk-print-qty">{{ item.quantity }} ×</span>
            <span>{{ item.name }}</span>
            <span v-if="item.missing > 0" class="zk-print-hint">
              ({{ $gettext('%{n} fehlen', { n: String(item.missing) }) }})
            </span>
          </li>
        </ul>
      </template>
    </section>

    <section v-if="list.extraItems.length > 0" class="zk-print-section">
      <h2>{{ $gettext('Zusätzliches') }}</h2>
      <ul class="zk-print-list">
        <li v-for="extra in list.extraItems" :key="extra.id" class="zk-print-row">
          <span class="zk-print-box" aria-hidden="true">{{ extra.checked ? '☑' : '☐' }}</span>
          <span class="zk-print-qty">{{ extra.quantity }} ×</span>
          <span>{{ extra.text }}</span>
        </li>
      </ul>
    </section>

    <section v-if="list.tents.length > 0" class="zk-print-section">
      <h2>{{ $gettext('Pro Zelt') }}</h2>
      <article v-for="tent in list.tents" :key="tent.id" class="zk-print-tent">
        <h3>{{ tentTitle(list, tent, catalog) }}</h3>
        <dl class="zk-print-desc">
          <template v-for="line in describeTent(tent, catalog)" :key="line.label">
            <dt>{{ line.label }}</dt>
            <dd>{{ line.value }}</dd>
          </template>
        </dl>
        <ul class="zk-print-list">
          <li v-for="t in itemsForTent(list, tent.id)" :key="t.item.articleId" class="zk-print-row">
            <span class="zk-print-box" aria-hidden="true">{{
              isCheckable(t.item) ? (t.item.checked ? '☑' : '☐') : '–'
            }}</span>
            <span class="zk-print-qty">{{ t.quantity }} ×</span>
            <span>{{ t.item.name }}</span>
          </li>
        </ul>
      </article>
    </section>

    <section v-if="list.deviations.length > 0" class="zk-print-section">
      <h2>{{ $gettext('Abweichungen') }}</h2>
      <ul class="zk-print-list">
        <li v-for="(d, i) in list.deviations" :key="i" class="zk-print-row">
          {{ deviationTent(d.tentId) }}: {{ d.wanted }} →
          {{ d.got ?? $gettext('fehlt') }}
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { catalog } from '../domain/catalog'
import type { Deviation, PacklistFile } from '../domain/types'
import {
  describeTent,
  formatDate,
  groupByCategory,
  isCheckable,
  itemsForTent,
  tentTitle
} from './checklistView'

/** Druckansicht: auf dem Bildschirm verborgen, nur im Druck sichtbar. */
const props = defineProps<{ list: PacklistFile }>()
const { $gettext } = useGettext()

const groups = computed(() => groupByCategory(props.list.items))
const printedAt = new Date().toLocaleString('de-DE')

function deviationTent(tentId: Deviation['tentId']): string {
  const tent = props.list.tents.find((t) => t.id === tentId)
  return tent ? tentTitle(props.list, tent, catalog) : tentId
}
</script>

<style>
.zk-print {
  display: none;
}
@media print {
  body * {
    visibility: hidden;
  }
  .zk-print,
  .zk-print * {
    visibility: visible;
  }
  .zk-print {
    display: block;
    position: absolute;
    inset: 0 auto auto 0;
    width: 100%;
    background: #fff;
    color: #000;
    font-size: 11pt;
    box-shadow: none;
  }
  .zk-print * {
    color: #000 !important;
    background: transparent !important;
    box-shadow: none !important;
  }
  .zk-print-row {
    break-inside: avoid;
    list-style: none;
    padding: 1pt 0;
  }
  .zk-print-list {
    padding: 0;
    margin: 0 0 6pt;
  }
  .zk-print-tent {
    break-inside: avoid;
    margin-bottom: 10pt;
  }
  .zk-print-box {
    display: inline-block;
    width: 1.4em;
    font-size: 1.2em;
  }
  .zk-print-qty {
    font-weight: 700;
    margin-right: 0.3em;
  }
  .zk-print-desc {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0 1em;
    margin: 0 0 4pt;
  }
  .zk-print-desc dd {
    margin: 0;
  }
  .zk-print h1 {
    font-size: 18pt;
  }
  .zk-print h2 {
    font-size: 14pt;
    margin: 10pt 0 4pt;
  }
  .zk-print h3 {
    font-size: 12pt;
    margin: 6pt 0 2pt;
    break-after: avoid;
  }
}
</style>
