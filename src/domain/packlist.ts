import { allocate } from './allocation'
import {
  DEFAULT_FINISH_ORDER,
  type Catalog,
  type PackItem,
  type PacklistFile,
  type Stock,
  type TentConfig,
  type TentRoof,
  type TentType
} from './types'

/** Neue, leere Packliste. */
export function createPacklist(name: string, catalog: Catalog, stock: Stock): PacklistFile {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    name,
    tents: [],
    finishOrder: [...DEFAULT_FINISH_ORDER],
    items: [],
    deviations: [],
    materials: [],
    extraItems: [],
    fingerprint: fingerprint(catalog, stock),
    updatedAt: new Date().toISOString()
  }
}

export type TentOptions = Pick<TentConfig, 'roofs' | 'wallId' | 'buildId' | 'finish'>

/** Vorgabe je Baustein: erstes Dach, erster Aufbau. */
export function defaultTentRoofs(type: TentType): TentRoof[] {
  return type.modules.map((m) => ({ roofId: m.roofs[0].id, setupId: m.setups[0].id }))
}

/** Standardkonfiguration des Zelttyps: `defaults`, sonst jeweils die erste Möglichkeit. */
export function defaultTentOptions(type: TentType): TentOptions {
  const d = type.defaults ?? {}
  const wall = type.walls.find((w) => w.id === d.wallId) ?? type.walls[0]
  const build = wall.builds.find((b) => b.id === d.buildId) ?? wall.builds[0]
  return {
    roofs: defaultTentRoofs(type),
    wallId: wall.id,
    buildId: build?.id ?? '',
    finish: d.finish ?? 'blanko'
  }
}

/** Entspricht das Zelt der Standardkonfiguration seines Typs? */
export function hasDefaultOptions(tent: TentConfig, type: TentType): boolean {
  const d = defaultTentOptions(type)
  return (
    tent.roofs.length === d.roofs.length &&
    tent.roofs.every(
      (r, i) => r.roofId === d.roofs[i].roofId && r.setupId === d.roofs[i].setupId
    ) &&
    tent.wallId === d.wallId &&
    tent.buildId === d.buildId &&
    tent.finish === d.finish
  )
}

/** Neues Zelt in der Standardkonfiguration des Zelttyps. */
export function createTentConfig(type: TentType): TentConfig {
  return { id: crypto.randomUUID(), typeId: type.id, ...defaultTentOptions(type) }
}

/** Rechnet items/deviations/fingerprint neu und übernimmt Haken nach F-36. */
export function recalculate(list: PacklistFile, catalog: Catalog, stock: Stock): PacklistFile {
  const result = allocate(list.tents, list.finishOrder, catalog, stock, list.materials)
  const old = new Map(list.items.map((i) => [i.articleId, i]))
  const items: PackItem[] = result.items.map((item) => {
    const prev = old.get(item.articleId)
    return { ...item, checked: !!prev && prev.checked && prev.quantity === item.quantity }
  })
  return {
    ...list,
    items,
    deviations: result.deviations,
    fingerprint: fingerprint(catalog, stock),
    updatedAt: new Date().toISOString()
  }
}

/** Kanonisches JSON: Objektschlüssel sortiert, Arrays in Reihenfolge. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const entries = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`)
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

/** cyrb53: 53-Bit-String-Hash, synchron, ohne Abhängigkeiten. */
function hash53(str: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0')
}

/** Stabiler Hash über Katalog und Bestand; ändert er sich, ist die Packliste veraltet. */
export function fingerprint(catalog: Catalog, stock: Stock): string {
  const relevant: Record<string, number> = {}
  for (const a of catalog.articles) relevant[a.id] = stock[a.id] ?? 0
  return hash53(canonical({ catalog, stock: relevant }))
}
