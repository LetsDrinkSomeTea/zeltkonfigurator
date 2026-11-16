import type { PacklistFile, PacklistSummary, StockFile } from '../domain/types'

export interface Versioned<T> {
  data: T
  /** null = Datei existiert noch nicht */
  etag: string | null
}

/**
 * Zugriff auf die Dateien im Space. Einzige Stelle, an der die Oberfläche Daten liest
 * oder schreibt. Umsetzungen: WebDavDataStore (OpenCloud), MemoryDataStore (Tests, Entwicklung).
 */
export interface DataStore {
  canWrite(): Promise<boolean>

  /** Fehlt die Datei: leerer Bestand mit etag = null (kein Fehler). */
  loadStock(): Promise<Versioned<StockFile>>
  /** etag = zuletzt gelesener Stand, null = neu anlegen. Liefert den neuen ETag. */
  saveStock(file: StockFile, etag: string | null): Promise<string>

  listPacklists(): Promise<PacklistSummary[]>
  loadPacklist(id: string): Promise<Versioned<PacklistFile>>
  /** etag = zuletzt gelesener Stand, null = neu anlegen. Liefert den neuen ETag. */
  savePacklist(file: PacklistFile, etag: string | null): Promise<string>
  deletePacklist(id: string): Promise<void>
}

export class DataStoreError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = new.target.name
  }
}

/** App-Konfiguration fehlt oder der konfigurierte Space wurde nicht gefunden. */
export class NotConfiguredError extends DataStoreError {}
export class NotFoundError extends DataStoreError {}
export class ForbiddenError extends DataStoreError {}
/** Die Datei wurde seit dem letzten Lesen geändert (ETag passt nicht). */
export class ConflictError extends DataStoreError {}
/** Datei ist kein gültiges YAML oder passt nicht zum Schema. */
export class InvalidFileError extends DataStoreError {}
