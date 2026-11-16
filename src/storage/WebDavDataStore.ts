import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import type { PacklistFile, PacklistSummary, StockFile } from '../domain/types'
import {
  ConflictError,
  DataStoreError,
  ForbiddenError,
  InvalidFileError,
  NotFoundError
} from './DataStore'
import type { DataStore, Versioned } from './DataStore'

/**
 * Schmale WebDAV-Schnittstelle, relativ zum Space. Alle Pfade ohne führenden Schrägstrich.
 * Fehler werden unverändert geworfen; der Statuscode steht in `statusCode` (HttpError) oder
 * `response.status`. ETags sind "nackt" (ohne Anführungszeichen).
 */
export interface WebDavFiles {
  read(path: string): Promise<{ body: unknown; etag: string | null }>
  /** etag = null: Datei darf noch nicht existieren (If-None-Match: *), sonst If-Match. */
  write(path: string, content: string, etag: string | null): Promise<{ etag: string | null }>
  /** Namen der direkten Kinder. */
  list(path: string): Promise<string[]>
  mkdir(path: string): Promise<void>
  remove(path: string): Promise<void>
}

export interface WebDavDataStoreOptions {
  files: WebDavFiles
  /** Ordner im Space, z. B. "Zeltkonfigurator" */
  folder: string
  canWrite: () => Promise<boolean>
  parseStockFile: (json: unknown) => StockFile
  parsePacklistFile: (json: unknown) => PacklistFile
}

const EXT = '.yaml'
const STOCK_FILE = 'bestand.yaml'
const PACKLIST_DIR = 'packlisten'
const ID_PATTERN = /^[A-Za-z0-9_-]+$/

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

export class WebDavDataStore implements DataStore {
  private foldersReady = false

  constructor(private readonly options: WebDavDataStoreOptions) {}

  canWrite(): Promise<boolean> {
    return this.options.canWrite()
  }

  async loadStock(): Promise<Versioned<StockFile>> {
    const path = this.stockPath()
    try {
      const { body, etag } = await this.options.files.read(path)
      return { data: this.parse(body, this.options.parseStockFile, 'Die Bestandsdatei'), etag }
    } catch (e) {
      if (statusOf(e) === 404) {
        return { data: { schemaVersion: 1, stock: {} }, etag: null }
      }
      throw mapError(e, 'Die Bestandsdatei')
    }
  }

  saveStock(file: StockFile, etag: string | null): Promise<string> {
    return this.save(this.stockPath(), file, etag, 'Die Bestandsdatei')
  }

  async listPacklists(): Promise<PacklistSummary[]> {
    let names: string[]
    try {
      names = await this.options.files.list(this.packlistDir())
    } catch (e) {
      if (statusOf(e) === 404) return []
      throw mapError(e, 'Der Ordner der Packlisten')
    }
    const summaries: PacklistSummary[] = []
    for (const name of names.filter((n) => n.endsWith(EXT))) {
      try {
        const { data } = await this.loadPacklist(name.slice(0, -EXT.length))
        summaries.push(summarize(data))
      } catch (e) {
        // Defekte oder zwischenzeitlich gelöschte Dateien überspringen, alles andere melden.
        if (e instanceof InvalidFileError || e instanceof NotFoundError) continue
        throw e
      }
    }
    return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async loadPacklist(id: string): Promise<Versioned<PacklistFile>> {
    const path = this.packlistPath(id)
    try {
      const { body, etag } = await this.options.files.read(path)
      return { data: this.parse(body, this.options.parsePacklistFile, 'Die Packliste'), etag }
    } catch (e) {
      throw mapError(e, 'Die Packliste')
    }
  }

  savePacklist(file: PacklistFile, etag: string | null): Promise<string> {
    return this.save(this.packlistPath(file.id), file, etag, 'Die Packliste')
  }

  async deletePacklist(id: string): Promise<void> {
    try {
      await this.options.files.remove(this.packlistPath(id))
    } catch (e) {
      throw mapError(e, 'Die Packliste')
    }
  }

  // ------------------------------------------------------------------ intern

  private stockPath(): string {
    return `${this.options.folder}/${STOCK_FILE}`
  }

  private packlistDir(): string {
    return `${this.options.folder}/${PACKLIST_DIR}`
  }

  private packlistPath(id: string): string {
    if (!ID_PATTERN.test(id)) throw new InvalidFileError(`Ungültige Packlisten-ID „${id}“.`)
    return `${this.packlistDir()}/${id}${EXT}`
  }

  private parse<T>(body: unknown, parser: (json: unknown) => T, what: string): T {
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

  private async save(
    path: string,
    file: unknown,
    etag: string | null,
    what: string
  ): Promise<string> {
    const content = stringifyYaml(file, { lineWidth: 0 })
    try {
      await this.ensureFolders()
      const result = await this.options.files.write(path, content, etag)
      if (result.etag) return result.etag
      const reread = await this.options.files.read(path)
      if (!reread.etag) throw new DataStoreError(`${what} wurde gespeichert, der ETag fehlt aber.`)
      return reread.etag
    } catch (e) {
      throw mapError(e, what)
    }
  }

  private async ensureFolders(): Promise<void> {
    if (this.foldersReady) return
    const parts = this.options.folder.split('/').filter(Boolean)
    const paths = parts.map((_, i) => parts.slice(0, i + 1).join('/'))
    paths.push(this.packlistDir())
    for (const path of paths) {
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

function summarize(file: PacklistFile): PacklistSummary {
  const items = file.items ?? []
  const extra = file.extraItems ?? []
  return {
    id: file.id,
    name: file.name,
    ...(file.date !== undefined && { date: file.date }),
    tentCount: (file.tents ?? []).length,
    itemCount: items.length + extra.length,
    checkedCount: items.filter((i) => i.checked).length + extra.filter((i) => i.checked).length,
    updatedAt: file.updatedAt
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
  listFiles(
    space: S,
    target: { path: string },
    options?: { depth?: number }
  ): Promise<{ children?: { name?: string }[] }>
  createFolder(space: S, options: { path: string; fetchFolder?: boolean }): Promise<unknown>
  deleteFile(space: S, options: { path: string }): Promise<unknown>
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
    async list(path) {
      const { children } = await webdav.listFiles(space, { path }, { depth: 1 })
      return (children ?? []).map((c) => c.name ?? '').filter(Boolean)
    },
    async mkdir(path) {
      await webdav.createFolder(space, { path, fetchFolder: false })
    },
    async remove(path) {
      await webdav.deleteFile(space, { path })
    }
  }
}
