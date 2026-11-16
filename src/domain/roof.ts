import type { RoofConfig, Stock } from './types'

export interface RoofChoice {
  roof: RoofConfig
  /** true, wenn nicht die bevorzugte Dachkonfiguration gewählt wurde */
  fallback: boolean
  /** true, wenn alle Teile der gewählten Konfiguration frei sind */
  complete: boolean
}

/** Alle Teile der Konfiguration im Bestand vorhanden? Gleiche Artikel werden summiert. */
export function isRoofAvailable(roof: RoofConfig, stock: Stock): boolean {
  const need = new Map<string, number>()
  for (const p of roof.parts) {
    need.set(p.articleId, (need.get(p.articleId) ?? 0) + p.quantity)
  }
  for (const [articleId, qty] of need) {
    if ((stock[articleId] ?? 0) < qty) return false
  }
  return true
}

/**
 * Wählt die Dachkonfiguration: bevorzugte, wenn vollständig vorhanden; sonst die erste
 * andere (in deklarierter Reihenfolge) vollständig vorhandene; sonst die bevorzugte mit Fehlbestand.
 */
export function chooseRoof(roofs: RoofConfig[], preferred: RoofConfig, stock: Stock): RoofChoice {
  if (isRoofAvailable(preferred, stock)) {
    return { roof: preferred, fallback: false, complete: true }
  }
  for (const roof of roofs) {
    if (roof.id !== preferred.id && isRoofAvailable(roof, stock)) {
      return { roof, fallback: true, complete: true }
    }
  }
  return { roof: preferred, fallback: false, complete: false }
}
