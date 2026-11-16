/* eslint-disable require-await -- die Schnittstelle ist asynchron, die Umsetzung im Speicher nicht */
import type { PacklistFile, PacklistSummary, StockFile } from '../domain/types'
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  type DataStore,
  type Versioned
} from './DataStore'

export interface MemoryDataStoreOptions {
  /** Vorgabe: true */
  writable?: boolean
  stock?: StockFile
  packlists?: PacklistFile[]
}

interface Entry<T> {
  data: T
  etag: string
}

/** DataStore im Arbeitsspeicher für Tests und lokale Entwicklung, mit echter ETag-Semantik. */
export class MemoryDataStore implements DataStore {
  private readonly writable: boolean
  private stock: Entry<StockFile> | null = null
  private readonly packlists = new Map<string, Entry<PacklistFile>>()
  private counter = 0

  constructor(options: MemoryDataStoreOptions = {}) {
    this.writable = options.writable ?? true
    if (options.stock) {
      this.stock = { data: structuredClone(options.stock), etag: this.nextEtag() }
    }
    for (const list of options.packlists ?? []) {
      this.packlists.set(list.id, { data: structuredClone(list), etag: this.nextEtag() })
    }
  }

  private nextEtag(): string {
    this.counter += 1
    return `"etag-${this.counter}"`
  }

  private assertWritable(): void {
    if (!this.writable) {
      throw new ForbiddenError('Keine Schreibberechtigung')
    }
  }

  async canWrite(): Promise<boolean> {
    return this.writable
  }

  async loadStock(): Promise<Versioned<StockFile>> {
    if (!this.stock) {
      return { data: { schemaVersion: 1, stock: {} }, etag: null }
    }
    return { data: structuredClone(this.stock.data), etag: this.stock.etag }
  }

  async saveStock(file: StockFile, etag: string | null): Promise<string> {
    this.assertWritable()
    if ((this.stock?.etag ?? null) !== etag) {
      throw new ConflictError('Der Bestand wurde zwischenzeitlich geändert')
    }
    const next = this.nextEtag()
    this.stock = { data: structuredClone(file), etag: next }
    return next
  }

  async listPacklists(): Promise<PacklistSummary[]> {
    return [...this.packlists.values()]
      .map(({ data }) => {
        const all = [...data.items, ...data.extraItems]
        const summary: PacklistSummary = {
          id: data.id,
          name: data.name,
          tentCount: data.tents.length,
          itemCount: all.length,
          checkedCount: all.filter((item) => item.checked).length,
          updatedAt: data.updatedAt
        }
        if (data.date !== undefined) {
          summary.date = data.date
        }
        return summary
      })
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0))
  }

  async loadPacklist(id: string): Promise<Versioned<PacklistFile>> {
    const entry = this.packlists.get(id)
    if (!entry) {
      throw new NotFoundError(`Packliste ${id} nicht gefunden`)
    }
    return { data: structuredClone(entry.data), etag: entry.etag }
  }

  async savePacklist(file: PacklistFile, etag: string | null): Promise<string> {
    this.assertWritable()
    const current = this.packlists.get(file.id)
    if ((current?.etag ?? null) !== etag) {
      throw new ConflictError(`Die Packliste ${file.id} wurde zwischenzeitlich geändert`)
    }
    const next = this.nextEtag()
    this.packlists.set(file.id, { data: structuredClone(file), etag: next })
    return next
  }

  async deletePacklist(id: string): Promise<void> {
    this.assertWritable()
    if (!this.packlists.delete(id)) {
      throw new NotFoundError(`Packliste ${id} nicht gefunden`)
    }
  }
}
