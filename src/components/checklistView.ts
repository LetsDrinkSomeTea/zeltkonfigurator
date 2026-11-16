import { hasFinishLayer } from '../domain/walls'
import type { Catalog, Category, Finish, PackItem, PacklistFile, TentConfig } from '../domain/types'
import { CATEGORIES } from '../domain/types'

export const CATEGORY_TITLES: Record<Category, string> = {
  dach: 'Dächer und Planen',
  wand: 'Seitenwand',
  stange: 'Stangen und Gestänge',
  abspannung: 'Heringe und Abspannung',
  kleinteil: 'Kleinteile',
  boden: 'Bodenplanen'
}

export const FINISH_TITLES: Record<Finish, string> = {
  blanko: 'Blanko',
  fenster: 'Fenster',
  gaze: 'Gaze'
}

export interface ItemGroup {
  category: Category
  title: string
  items: PackItem[]
}

/** Gruppiert nach Kategorie in der Reihenfolge von CATEGORIES; leere Gruppen entfallen. */
export function groupByCategory(items: PackItem[]): ItemGroup[] {
  return CATEGORIES.map((category) => ({
    category,
    title: CATEGORY_TITLES[category],
    items: items.filter((i) => i.category === category)
  })).filter((g) => g.items.length > 0)
}

/** Abhakbar ist nur, was tatsächlich aus dem Bestand gepackt wird. */
export function isCheckable(item: PackItem): boolean {
  return item.quantity > 0
}

export interface TentItem {
  item: PackItem
  quantity: number
}

/** Positionen, die ein Zelt braucht, mit dessen Stückzahl. */
export function itemsForTent(list: PacklistFile, tentId: string): TentItem[] {
  return list.items
    .map((item) => ({ item, quantity: item.perTent[tentId] ?? 0 }))
    .filter((t) => t.quantity > 0)
}

export interface Progress {
  done: number
  total: number
}

/** Abhakbare Zeilen: Positionen mit Bestand plus freie Zeilen. */
export function progress(list: PacklistFile): Progress {
  const items = list.items.filter(isCheckable)
  const total = items.length + list.extraItems.length
  const done =
    items.filter((i) => i.checked).length + list.extraItems.filter((e) => e.checked).length
  return { done, total }
}

export function tentTypeName(tent: TentConfig, catalog: Catalog): string {
  return catalog.tentTypes.find((t) => t.id === tent.typeId)?.name ?? tent.typeId
}

/** Überschrift eines Zeltes: Bezeichnung oder Typname, bei Wiederholung mit laufender Nummer. */
export function tentTitle(list: PacklistFile, tent: TentConfig, catalog: Catalog): string {
  const base = (t: TentConfig) => t.label?.trim() || tentTypeName(t, catalog)
  const name = base(tent)
  const same = list.tents.filter((t) => base(t) === name)
  if (same.length < 2) {
    return name
  }
  return `${name} (${same.findIndex((t) => t.id === tent.id) + 1})`
}

export interface TentDescriptionLine {
  label: string
  value: string
}

/** Konfiguration in Worten; unbekannte Kennungen werden unverändert ausgegeben. */
export function describeTent(tent: TentConfig, catalog: Catalog): TentDescriptionLine[] {
  const type = catalog.tentTypes.find((t) => t.id === tent.typeId)
  const roof = type?.roofs.find((r) => r.id === tent.roofId)
  const wall = type?.walls.find((w) => w.id === tent.wallId)
  const build = wall?.builds.find((b) => b.id === tent.buildId)
  const lines: TentDescriptionLine[] = [{ label: 'Zelttyp', value: type?.name ?? tent.typeId }]
  if (tent.label?.trim()) {
    lines.push({ label: 'Bezeichnung', value: tent.label.trim() })
  }
  lines.push({ label: 'Dach', value: roof?.label ?? tent.roofId })
  lines.push({ label: 'Seitenwand', value: wall?.label ?? tent.wallId })
  if (tent.buildId) {
    lines.push({ label: 'Bauart', value: build?.label ?? tent.buildId })
  }
  // Ausführung nur nennen, wenn die Bauart eine Lage mit wählbarer Ausführung hat.
  if (!build || hasFinishLayer(build)) {
    if (build || !wall || wall.segments > 0) {
      lines.push({ label: 'Ausführung', value: FINISH_TITLES[tent.finish] ?? tent.finish })
    }
  }
  return lines
}

/** Formatiert ein Datum (ISO) nach de-DE; Unlesbares bleibt unverändert. */
export function formatDate(value: string): string {
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
