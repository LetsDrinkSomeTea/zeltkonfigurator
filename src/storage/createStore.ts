import type { DataStore } from './DataStore'

/**
 * Erzeugt den DataStore für den Betrieb in OpenCloud (WebDavDataStore).
 * Muss innerhalb von setup() einer Komponente aufgerufen werden. Umsetzung: AP 1.
 */
export function createStore(): DataStore {
  throw new Error('not implemented')
}
