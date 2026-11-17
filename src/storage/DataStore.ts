import type { PacklistFile, StockFile } from '../domain/types'

/** Jemand anderes hat die Datei geändert; etag = neuer Stand, falls bekannt. */
export type ChangeListener = (change: { etag: string | null }) => void

export interface Versioned<T> {
  data: T
  /** null = Datei existiert noch nicht */
  etag: string | null
}

/**
 * Zugriff auf den Bestand. Er liegt immer am selben Ort (Space und Ordner aus der
 * App-Konfiguration). Umsetzungen: WebDavDataStore (OpenCloud), MemoryDataStore (Tests, Vorschau).
 */
export interface DataStore {
  canWrite(): Promise<boolean>

  /** Fehlt die Datei: leerer Bestand mit etag = null (kein Fehler). */
  loadStock(): Promise<Versioned<StockFile>>
  /** etag = zuletzt gelesener Stand, null = neu anlegen. Liefert den neuen ETag. */
  saveStock(file: StockFile, etag: string | null): Promise<string>
  /** Meldet Änderungen der Bestandsdatei durch andere. Liefert die Abmeldung. */
  watchStock?(listener: ChangeListener): () => void
}

/**
 * Eine geöffnete Packlisten-Datei. Packlisten sind gewöhnliche Dateien und können überall
 * liegen; die Datei bestimmt Ort und Namen der Liste.
 */
export interface PacklistDocument {
  /** Name der Liste = Dateiname ohne Endung. */
  readonly name: string
  canWrite(): Promise<boolean>
  /** data = null: Die Datei ist leer (frisch über „Neu“ angelegt). */
  load(): Promise<Versioned<PacklistFile | null>>
  /** etag = zuletzt gelesener Stand. Liefert den neuen ETag. */
  save(file: PacklistFile, etag: string | null): Promise<string>
  /** Meldet Änderungen der Datei durch andere. Liefert die Abmeldung. */
  watch?(listener: ChangeListener): () => void
  /** Zurück zur Dateiansicht, sofern die Umgebung das anbietet. */
  close?(): void
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
