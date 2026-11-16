import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import type { Component } from 'vue'
import { catalog } from '../../../src/domain/catalog'
import { createPacklist, createTentConfig, recalculate } from '../../../src/domain/packlist'
import type { PacklistFile, Stock, TentConfig } from '../../../src/domain/types'
import { storeKey } from '../../../src/composables/useStore'
import { MemoryDataStore } from '../../../src/storage/MemoryDataStore'

const Dummy = { render: (): null => null }

export function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/listen', name: 'zeltkonfigurator-listen', component: Dummy },
      { path: '/listen/:id', name: 'zeltkonfigurator-liste', component: Dummy },
      { path: '/bestand', name: 'zeltkonfigurator-bestand', component: Dummy }
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
  options: { route?: string; props?: Record<string, unknown> } = {}
) {
  const router = createTestRouter()
  await router.push(options.route ?? '/listen')
  await router.isReady()
  const wrapper = mount(component, {
    props: options.props,
    global: { plugins: [...defaultPlugins(), router], provide: { [storeKey as symbol]: store } }
  })
  return { wrapper, router }
}

export async function settle(ms = 0) {
  await new Promise((resolve) => setTimeout(resolve, ms))
  await Promise.resolve()
}
