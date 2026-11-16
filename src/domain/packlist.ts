import type { Catalog, PacklistFile, Stock, TentConfig, TentType } from './types'

/** Neue, leere Packliste. Umsetzung: AP 2. */
export function createPacklist(name: string, catalog: Catalog, stock: Stock): PacklistFile {
  void [name, catalog, stock]
  throw new Error('not implemented')
}

/** Neues Zelt mit den Vorgaben des Zelttyps (erstes Dach, erste Wandoption, erste Bauart). */
export function createTentConfig(type: TentType): TentConfig {
  void type
  throw new Error('not implemented')
}

/** Rechnet items/deviations/fingerprint neu und übernimmt Haken nach F-36. */
export function recalculate(list: PacklistFile, catalog: Catalog, stock: Stock): PacklistFile {
  void [list, catalog, stock]
  throw new Error('not implemented')
}

/** Stabiler Hash über Katalog und Bestand; ändert er sich, ist die Packliste veraltet. */
export function fingerprint(catalog: Catalog, stock: Stock): string {
  void [catalog, stock]
  throw new Error('not implemented')
}
