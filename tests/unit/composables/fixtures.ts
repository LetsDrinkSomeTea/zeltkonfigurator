import { createApp, effectScope } from 'vue'
import type {
  Catalog,
  PacklistFile,
  PackItem,
  Stock,
  TentConfig,
  TentType
} from '../../../src/domain/types'
import { storeKey } from '../../../src/composables/useStore'
import type { DataStore } from '../../../src/storage/DataStore'

export const fakeCatalog: Catalog = {
  articles: [],
  tentTypes: [
    {
      id: 'kohte',
      name: 'Kohte',
      roofs: [{ id: 'r1', label: 'Dach', parts: [] }],
      walls: [
        { id: 'w0', label: 'Keine Wand', segments: 0, builds: [], parts: [] },
        {
          id: 'w1',
          label: 'Wand A',
          segments: 4,
          builds: [
            { id: 'a1', label: 'A1', layers: ['normalbahn'] },
            { id: 'a2', label: 'A2', layers: ['superbahn'] }
          ],
          parts: []
        },
        {
          id: 'w2',
          label: 'Wand B',
          segments: 6,
          builds: [{ id: 'b1', label: 'B1', layers: ['normalbahn'] }],
          parts: []
        }
      ],
      fixed: []
    }
  ]
}

export function fakeFingerprint(_catalog: Catalog, stock: Stock): string {
  return `fp:${JSON.stringify(stock)}`
}

/** Je Zelt ein Artikel; Haken bleiben bei gleichem Artikel erhalten. */
export function fakeRecalculate(list: PacklistFile, catalog: Catalog, stock: Stock): PacklistFile {
  const checked = new Map(list.items.map((i) => [i.articleId, i.checked]))
  const items: PackItem[] = list.tents.map((t) => ({
    articleId: `art-${t.id}`,
    name: `Artikel ${t.id}`,
    category: 'dach',
    quantity: 1,
    missing: 0,
    perTent: { [t.id]: 1 },
    checked: checked.get(`art-${t.id}`) ?? false
  }))
  return { ...list, items, fingerprint: fakeFingerprint(catalog, stock) }
}

export function fakeDefaultTentOptions(type: TentType) {
  return {
    roofId: type.roofs[0].id,
    wallId: type.walls[0].id,
    buildId: type.walls[0].builds[0]?.id ?? '',
    finish: 'blanko' as const
  }
}

export function fakeCreateTentConfig(type: TentType): TentConfig {
  return { id: 'tent-fake', typeId: type.id, ...fakeDefaultTentOptions(type) }
}

export function fakeCreatePacklist(name: string, catalog: Catalog, stock: Stock): PacklistFile {
  return {
    schemaVersion: 1,
    id: `list-${Math.random().toString(36).slice(2, 8)}`,
    name,
    tents: [],
    finishOrder: ['gaze', 'fenster', 'blanko'],
    items: [],
    deviations: [],
    extraItems: [],
    fingerprint: fakeFingerprint(catalog, stock),
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
}

export function tent(id: string, wallId = 'w1', buildId = 'a1'): TentConfig {
  return { id, typeId: 'kohte', roofId: 'r1', wallId, buildId, finish: 'blanko' }
}

/** Packliste mit zwei Zelten (t1, t2) und passenden Positionen. */
export function makeList(overrides: Partial<PacklistFile> = {}): PacklistFile {
  const base: PacklistFile = {
    ...fakeCreatePacklist('Sommerlager', fakeCatalog, {}),
    id: 'p1',
    tents: [tent('t1'), tent('t2')]
  }
  return { ...fakeRecalculate(base, fakeCatalog, {}), ...overrides }
}

/** Führt fn mit dem Store im Vue-Kontext aus (inject/provide) und in einem effectScope. */
export function withStore<T>(store: DataStore, fn: () => T): T {
  const app = createApp({ render: (): null => null })
  app.provide(storeKey, store)
  const scope = effectScope()
  return scope.run(() => app.runWithContext(fn)) as T
}
