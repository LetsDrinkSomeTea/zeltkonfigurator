import type { PacklistFile } from '../types'

export type PacklistStatus = 'leer' | 'ok' | 'ausweichmaterial' | 'fehlt'

/** Gesamtstatus aus dem gespeicherten Rechenergebnis (F-29). */
export function derivePacklistStatus(
  list: Pick<PacklistFile, 'tents' | 'items' | 'deviations'>
): PacklistStatus {
  if (list.tents.length === 0) {
    return 'leer'
  }
  if (list.items.some((item) => item.missing > 0)) {
    return 'fehlt'
  }
  if (list.deviations.length > 0) {
    return 'ausweichmaterial'
  }
  return 'ok'
}

/** Anzahl der Artikel, von denen Material fehlt. */
export function countMissingItems(list: Pick<PacklistFile, 'items'>): number {
  return list.items.filter((item) => item.missing > 0).length
}

/** Ist schon etwas abgehakt (Artikel oder freie Zeilen)? */
export function hasCheckedItems(list: Pick<PacklistFile, 'items' | 'extraItems'>): boolean {
  return list.items.some((i) => i.checked) || list.extraItems.some((e) => e.checked)
}
