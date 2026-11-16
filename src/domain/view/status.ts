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
