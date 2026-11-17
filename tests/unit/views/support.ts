import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import type { VueWrapper } from '@vue/test-utils'
import { expect } from 'vitest'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import type { Component } from 'vue'
import { catalog } from '../../../src/domain/catalog'
import { createPacklist, createTentConfig, recalculate } from '../../../src/domain/packlist'
import type { PacklistFile, Stock, TentConfig } from '../../../src/domain/types'
import { documentKey, storeKey } from '../../../src/composables/useStore'
import { MemoryDataStore } from '../../../src/storage/MemoryDataStore'

const Dummy = { render: (): null => null }

export function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/liste/:driveAliasAndItem(.*)?',
        name: 'zeltkonfigurator-liste',
        component: Dummy
      },
      {
        path: '/bestand/:driveAliasAndItem(.*)?',
        name: 'zeltkonfigurator-bestand',
        component: Dummy
      }
    ]
  })
}

/** Bestand mit der gleichen Menge für alle Artikel, einzelne Artikel überschreibbar. */
export function fullStock(quantity: number, overrides: Stock = {}): Stock {
  const stock: Stock = {}
  for (const a of catalog.articles) {
    stock[a.id] = quantity
  }
  return { ...stock, ...overrides }
}

export function tentOf(typeId: string, patch: Partial<TentConfig> = {}): TentConfig {
  const type = catalog.tentTypes.find((t) => t.id === typeId)!
  return { ...createTentConfig(type), ...patch }
}

/** Packliste, berechnet mit dem echten Rechenkern gegen den angegebenen Bestand. */
export function listFor(
  tents: TentConfig[],
  stock: Stock,
  overrides: Partial<PacklistFile> = {}
): PacklistFile {
  const base = { ...createPacklist('Sommerlager', catalog, stock), id: 'p1', tents }
  return { ...recalculate(base, catalog, stock), ...overrides }
}

export function storeWith(
  stock: Stock,
  packlists: PacklistFile[],
  writable = true
): MemoryDataStore {
  const quantities = Object.fromEntries(Object.entries(stock).map(([k, v]) => [k, { quantity: v }]))
  return new MemoryDataStore({
    writable,
    stock: { schemaVersion: 1, stock: quantities },
    packlists
  })
}

export async function mountWithStore(
  component: Component,
  store: MemoryDataStore,
  options: { route?: string; props?: Record<string, unknown>; close?: () => void } = {}
) {
  const router = createTestRouter()
  await router.push(options.route ?? '/liste/p1.packliste')
  await router.isReady()
  const wrapper = mount(component, {
    props: options.props,
    global: {
      plugins: [...defaultPlugins(), router],
      stubs: { OcIcon: true },
      provide: {
        [storeKey as symbol]: store,
        // Die geöffnete Datei ist in den Tests immer die Packliste „p1“.
        [documentKey as symbol]: () => ({ ...store.document('p1'), close: options.close })
      }
    }
  })
  return { wrapper, router }
}

/** Zelt ohne Seitenwand, unabhängig von der Standardkonfiguration des Typs. */
export function bareTent(typeId: string, patch: Partial<TentConfig> = {}): TentConfig {
  return tentOf(typeId, { wallId: 'keine', buildId: '', finish: 'blanko', ...patch })
}

/** Findet das OcSelect einer Zeltoption (IDs enden auf -roof, -wall, -build, -finish) oder per ID. */
export function ocSelect(wrapper: VueWrapper, idOrSuffix: string) {
  return wrapper
    .findAllComponents({ name: 'OcSelect' })
    .find((c) => c.props('id') === idOrSuffix || String(c.props('id')).endsWith(`-${idOrSuffix}`))
}

/** Wählt in einem OcSelect die Option mit der angegebenen id. */
export async function choose(select: ReturnType<typeof ocSelect>, optionId: string) {
  const options = select!.vm.$attrs.options as { id: string }[]
  const option = options.find((o) => o.id === optionId)
  expect(option).toBeDefined()
  select!.vm.$emit('update:modelValue', option)
  await Promise.resolve()
}

export async function settle(ms = 0) {
  await new Promise((resolve) => setTimeout(resolve, ms))
  await Promise.resolve()
}
