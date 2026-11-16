import { packlistName, STOCK_FILE } from '../domain/fileNames'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import type { PacklistFile, StockFile } from '../domain/types'
import {
  ConflictError,
  DataStoreError,
  ForbiddenError,
  InvalidFileError,
  NotFoundError
} from './DataStore'
import type { DataStore, PacklistDocument, Versioned } from './DataStore'

/**
 * Schmale WebDAV-Schnittstelle, relativ zum Space. Alle Pfade ohne führenden Schrägstrich.
 * Fehler werden unverändert geworfen; der Statuscode steht in `statusCode` (HttpError) oder
 * `response.status`. ETags sind "nackt" (ohne Anführungszeichen).
 */
export interface WebDavFiles {
  read(path: string): Promise<{ body: unknown; etag: string | null }>
  /** etag = null: Datei darf noch nicht existieren (If-None-Match: *), sonst If-Match. */
  write(path: string, content: string, etag: string | null): Promise<{ etag: string | null }>
  mkdir(path: string): Promise<void>
}

export interface WebDavDataStoreOptions {
  files: WebDavFiles
  /** Ordner im Space, z. B. "Zeltkonfigurator" */
  folder: string
  canWrite: () => Promise<boolean>
  parseStockFile: (json: unknown) => StockFile
}

const STOCK = 'Die Bestandsdatei'
const PACKLIST = 'Die Packliste'

export function statusOf(error: unknown): number | undefined {
  const e = error as { statusCode?: unknown; response?: { status?: unknown } } | null
  if (typeof e?.statusCode === 'number') return e.statusCode
  if (typeof e?.response?.status === 'number') return e.response.status
  return undefined
}

function mapError(error: unknown, what: string): unknown {
  if (error instanceof DataStoreError) return error
  switch (statusOf(error)) {
    case 404:
      return new NotFoundError(`${what} wurde nicht gefunden.`, { cause: error })
    case 401:
    case 403:
      return new ForbiddenError(`Kein Zugriff auf ${what}.`, { cause: error })
    case 412:
      return new ConflictError(`${what} wurde inzwischen von jemand anderem geändert.`, {
        cause: error
      })
    default:
      return error
  }
}

function parseFile<T>(body: unknown, parser: (json: unknown) => T, what: string): T {
  let json: unknown = body
  if (typeof body === 'string') {
    try {
      json = parseYaml(body)
    } catch (e) {
      throw new InvalidFileError(`${what} enthält kein gültiges YAML.`, { cause: e })
    }
  }
  try {
    return parser(json)
  } catch (e) {
    if (e instanceof InvalidFileError) throw e
    throw new InvalidFileError(`${what} hat ein unerwartetes Format.`, { cause: e })
  }
}

/** Schreibt die Datei als YAML und liefert den neuen ETag (notfalls durch erneutes Lesen). */
async function writeFile(
  files: WebDavFiles,
  path: string,
  file: unknown,
  etag: string | null,
  what: string
): Promise<string> {
  const content = stringifyYaml(file, { lineWidth: 0 })
  const result = await files.write(path, content, etag)
  if (result.etag) return result.etag
  const reread = await files.read(path)
  if (!reread.etag) throw new DataStoreError(`${what} wurde gespeichert, der ETag fehlt aber.`)
  return reread.etag
}

/** Bestand am festen Ablageort. */
export class WebDavDataStore implements DataStore {
  private foldersReady = false

  constructor(private readonly options: WebDavDataStoreOptions) {}

  canWrite(): Promise<boolean> {
    return this.options.canWrite()
  }

  async loadStock(): Promise<Versioned<StockFile>> {
    try {
      const { body, etag } = await this.options.files.read(this.stockPath())
      return { data: parseFile(body, this.options.parseStockFile, STOCK), etag }
    } catch (e) {
      if (statusOf(e) === 404) {
        return { data: { schemaVersion: 1, stock: {} }, etag: null }
      }
      throw mapError(e, STOCK)
    }
  }

  async saveStock(file: StockFile, etag: string | null): Promise<string> {
    try {
      await this.ensureFolders()
      return await writeFile(this.options.files, this.stockPath(), file, etag, STOCK)
    } catch (e) {
      throw mapError(e, STOCK)
    }
  }

  private stockPath(): string {
    return `${this.options.folder}/${STOCK_FILE}`
  }

  private async ensureFolders(): Promise<void> {
    if (this.foldersReady) return
    const parts = this.options.folder.split('/').filter(Boolean)
    for (const path of parts.map((_, i) => parts.slice(0, i + 1).join('/'))) {
      try {
        await this.options.files.mkdir(path)
      } catch (e) {
        // 405 = Ordner existiert bereits
        if (statusOf(e) !== 405) throw e
      }
    }
    this.foldersReady = true
  }
}

export interface WebDavPacklistDocumentOptions {
  files: WebDavFiles
  /** Pfad der Datei im Space, ohne führenden Schrägstrich */
  path: string
  canWrite: () => Promise<boolean>
  parsePacklistFile: (json: unknown) => PacklistFile
  close?: () => void
}

/** Eine Packlisten-Datei an beliebiger Stelle eines Space. */
export class WebDavPacklistDocument implements PacklistDocument {
  readonly name: string
  readonly close?: () => void

  constructor(private readonly options: WebDavPacklistDocumentOptions) {
    this.name = packlistName(options.path)
    this.close = options.close
  }

  canWrite(): Promise<boolean> {
    return this.options.canWrite()
  }

  async load(): Promise<Versioned<PacklistFile | null>> {
    try {
      const { body, etag } = await this.options.files.read(this.options.path)
      if (typeof body === 'string' && body.trim() === '') {
        return { data: null, etag }
      }
      const data = parseFile(body, this.options.parsePacklistFile, PACKLIST)
      // Maßgeblich ist der Dateiname – auch wenn die Datei umbenannt oder kopiert wurde.
      return { data: { ...data, name: this.name }, etag }
    } catch (e) {
      throw mapError(e, PACKLIST)
    }
  }

  async save(file: PacklistFile, etag: string | null): Promise<string> {
    try {
      return await writeFile(this.options.files, this.options.path, file, etag, PACKLIST)
    } catch (e) {
      throw mapError(e, PACKLIST)
    }
  }
}

// ---------------------------------------------------------------------- Adapter

/** Das, was wir von `clientService.webdav` brauchen (strukturell kompatibel zu WebDAV aus web-client). */
export interface WebDavApi<S> {
  getFileContents(
    space: S,
    target: { path: string },
    options?: { responseType?: 'text' }
  ): Promise<{ body: unknown; headers?: { ETag?: string; [key: string]: unknown } }>
  putFileContents(
    space: S,
    options: { path: string; content: string; previousEntityTag?: string; overwrite?: boolean }
  ): Promise<{ etag?: string }>
  createFolder(space: S, options: { path: string; fetchFolder?: boolean }): Promise<unknown>
}

/** Entfernt Anführungszeichen und "W/", damit GET- und PROPFIND-ETags vergleichbar sind. */
export function normalizeEtag(etag: string | null | undefined): string | null {
  if (!etag) return null
  return etag.replace(/^W\//, '').replace(/"/g, '') || null
}

export function createWebDavFiles<S>(webdav: WebDavApi<S>, space: S): WebDavFiles {
  return {
    async read(path) {
      const res = await webdav.getFileContents(space, { path }, { responseType: 'text' })
      return { body: res.body, etag: normalizeEtag(res.headers?.ETag) }
    },
    async write(path, content, etag) {
      const resource = await webdav.putFileContents(space, {
        path,
        content,
        ...(etag ? { previousEntityTag: `"${etag}"` } : { overwrite: false })
      })
      return { etag: normalizeEtag(resource.etag) }
    },
    async mkdir(path) {
      await webdav.createFolder(space, { path, fetchFolder: false })
    }
  }
}
