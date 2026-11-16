import { allocate } from './allocation'
import {
  DEFAULT_FINISH_ORDER,
  type Catalog,
  type PackItem,
  type PacklistFile,
  type PacklistSummary,
  type Stock,
  type TentConfig,
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
    extraItems: [],
    fingerprint: fingerprint(catalog, stock),
    updatedAt: new Date().toISOString()
  }
}

/** Neues Zelt mit den Vorgaben des Zelttyps (erstes Dach, erste Wandoption, erste Bauart). */
export function createTentConfig(type: TentType): TentConfig {
  const wall = type.walls[0]
  return {
    id: crypto.randomUUID(),
    typeId: type.id,
    roofId: type.roofs[0].id,
    wallId: wall.id,
    buildId: wall.builds[0]?.id ?? '',
    finish: 'blanko'
  }
}

/** Rechnet items/deviations/fingerprint neu und übernimmt Haken nach F-36. */
export function recalculate(list: PacklistFile, catalog: Catalog, stock: Stock): PacklistFile {
  const result = allocate(list.tents, list.finishOrder, catalog, stock)
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

export function summarize(list: PacklistFile): PacklistSummary {
  const rows = [...list.items, ...list.extraItems]
  return {
    id: list.id,
    name: list.name,
    ...(list.date !== undefined ? { date: list.date } : {}),
    tentCount: list.tents.length,
    itemCount: rows.length,
    checkedCount: rows.filter((r) => r.checked).length,
    updatedAt: list.updatedAt
  }
}
