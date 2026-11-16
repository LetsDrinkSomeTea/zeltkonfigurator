import { parse as parseYaml } from 'yaml'
/* eslint-disable require-await -- Fakes müssen asynchrone Signaturen haben */
import { beforeEach, describe, expect, it } from 'vitest'
import { parsePacklistFile, parseStockFile } from '../../../src/domain/schema'
import type { PacklistFile, StockFile } from '../../../src/domain/types'
import {
  ConflictError,
  ForbiddenError,
  InvalidFileError,
  NotFoundError
} from '../../../src/storage/DataStore'
import {
  createWebDavFiles,
  normalizeEtag,
  WebDavDataStore
} from '../../../src/storage/WebDavDataStore'
import type { WebDavApi, WebDavFiles } from '../../../src/storage/WebDavDataStore'

class HttpErr extends Error {
  constructor(public statusCode: number) {
    super(`HTTP ${statusCode}`)
  }
}

/** In-Memory-WebDAV mit ETag-Zähler, If-Match- und If-None-Match-Semantik. */
class FakeFiles implements WebDavFiles {
  files = new Map<string, { content: string; etag: string }>()
  folders = new Set<string>()
  calls: string[] = []
  private counter = 0
  failWith: Record<string, number> = {}
  omitEtagOnWrite = false

  private check(op: string, path: string) {
    this.calls.push(`${op} ${path}`)
    const status = this.failWith[`${op} ${path}`]
    if (status) throw new HttpErr(status)
  }

  put(path: string, content: string) {
    this.files.set(path, { content, etag: `e${++this.counter}` })
  }

  async read(path: string) {
    this.check('read', path)
    const f = this.files.get(path)
    if (!f) throw new HttpErr(404)
    return { body: f.content, etag: f.etag }
  }

  async write(path: string, content: string, etag: string | null) {
    this.check('write', path)
    const existing = this.files.get(path)
    if (etag === null && existing) throw new HttpErr(412)
    if (etag !== null && (!existing || existing.etag !== etag)) {
      throw new HttpErr(existing ? 412 : 404)
    }
    this.put(path, content)
    return { etag: this.omitEtagOnWrite ? null : this.files.get(path)!.etag }
  }

  async list(path: string) {
    this.check('list', path)
    if (!this.folders.has(path)) throw new HttpErr(404)
    return [...this.files.keys()]
      .filter((p) => p.startsWith(path + '/') && !p.slice(path.length + 1).includes('/'))
      .map((p) => p.slice(path.length + 1))
  }

  async mkdir(path: string) {
    this.check('mkdir', path)
    if (this.folders.has(path)) throw new HttpErr(405)
    this.folders.add(path)
  }

  async remove(path: string) {
    this.check('remove', path)
    if (!this.files.delete(path)) throw new HttpErr(404)
  }
}

const stock: StockFile = { schemaVersion: 1, stock: { 'stange-a': { quantity: 4 } } }

function packlist(id: string, updatedAt: string, checked = false): PacklistFile {
  return {
    schemaVersion: 1,
    id,
    name: `Liste ${id}`,
    tents: [{ id: 't1', typeId: 'x', roofId: 'r', wallId: 'w', buildId: '', finish: 'blanko' }],
    finishOrder: ['gaze', 'fenster', 'blanko'],
    items: [
      {
        articleId: 'a',
        name: 'A',
        category: 'kleinteil',
        quantity: 1,
        missing: 0,
        toCut: 0,
        perTent: { t1: 1 },
        checked
      }
    ],
    deviations: [],
    extraItems: [{ id: 'e1', text: 'Hammer', quantity: 1, checked: true }],
    fingerprint: 'f',
    updatedAt
  }
}

let files: FakeFiles
let store: WebDavDataStore
let writable: boolean

beforeEach(() => {
  files = new FakeFiles()
  writable = true
  store = new WebDavDataStore({
    files,
    folder: 'Zeltkonfigurator',
    canWrite: async () => writable,
    parseStockFile,
    parsePacklistFile
  })
})

describe('stock', () => {
  it('returns an empty stock with etag null when the file is missing', async () => {
    expect(await store.loadStock()).toEqual({
      data: { schemaVersion: 1, stock: {} },
      etag: null
    })
  })

  it('creates folders and the file on first save and returns the new etag', async () => {
    const etag = await store.saveStock(stock, null)
    expect(etag).toBeTruthy()
    expect([...files.folders]).toEqual(['Zeltkonfigurator', 'Zeltkonfigurator/packlisten'])
    const raw = files.files.get('Zeltkonfigurator/bestand.zeltbestand')!.content
    expect(parseYaml(raw)).toEqual(stock)
    expect(raw.trimStart().startsWith('{')).toBe(false)
    expect(await store.loadStock()).toEqual({ data: stock, etag })
  })

  it('only creates folders once', async () => {
    const etag = await store.saveStock(stock, null)
    await store.saveStock(stock, etag)
    expect(files.calls.filter((c) => c.startsWith('mkdir')).length).toBe(2)
  })

  it('saves with the previous etag', async () => {
    const first = await store.saveStock(stock, null)
    const second = await store.saveStock({ ...stock, stock: {} }, first)
    expect(second).not.toBe(first)
  })

  it('throws ConflictError for a stale etag', async () => {
    const first = await store.saveStock(stock, null)
    await store.saveStock(stock, first)
    await expect(store.saveStock(stock, first)).rejects.toBeInstanceOf(ConflictError)
  })

  it('throws ConflictError when creating over an existing file', async () => {
    await store.saveStock(stock, null)
    await expect(store.saveStock(stock, null)).rejects.toBeInstanceOf(ConflictError)
  })

  it('re-reads the etag when the write does not return one', async () => {
    files.omitEtagOnWrite = true
    const etag = await store.saveStock(stock, null)
    expect(etag).toBe(files.files.get('Zeltkonfigurator/bestand.zeltbestand')!.etag)
  })

  it('maps 403 to ForbiddenError', async () => {
    files.failWith['write Zeltkonfigurator/bestand.zeltbestand'] = 403
    await expect(store.saveStock(stock, null)).rejects.toBeInstanceOf(ForbiddenError)
    files.failWith['read Zeltkonfigurator/bestand.zeltbestand'] = 401
    await expect(store.loadStock()).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('maps 404 on write with an etag to NotFoundError', async () => {
    await expect(store.saveStock(stock, 'old')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('rejects invalid YAML with InvalidFileError', async () => {
    files.put('Zeltkonfigurator/bestand.zeltbestand', '{ nicht json')
    await expect(store.loadStock()).rejects.toBeInstanceOf(InvalidFileError)
  })

  it('rejects an unknown schema version with InvalidFileError', async () => {
    files.put(
      'Zeltkonfigurator/bestand.zeltbestand',
      JSON.stringify({ schemaVersion: 2, stock: {} })
    )
    await expect(store.loadStock()).rejects.toBeInstanceOf(InvalidFileError)
  })

  it('wraps unexpected parser errors in InvalidFileError', async () => {
    const strict = new WebDavDataStore({
      files,
      folder: 'Z',
      canWrite: async () => true,
      parseStockFile: () => {
        throw new TypeError('kaputt')
      },
      parsePacklistFile
    })
    files.put('Z/bestand.zeltbestand', '{}')
    await expect(strict.loadStock()).rejects.toBeInstanceOf(InvalidFileError)
  })

  it('does not swallow unrelated errors', async () => {
    files.failWith['read Zeltkonfigurator/bestand.zeltbestand'] = 500
    await expect(store.loadStock()).rejects.toBeInstanceOf(HttpErr)
  })
})

describe('packlists', () => {
  it('loads a packlist and maps a missing one to NotFoundError', async () => {
    const etag = await store.savePacklist(packlist('p1', '2026-01-01T00:00:00Z'), null)
    const loaded = await store.loadPacklist('p1')
    expect(loaded.etag).toBe(etag)
    expect(loaded.data.id).toBe('p1')
    await expect(store.loadPacklist('nope')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('rejects ids that are not safe path segments', async () => {
    await expect(store.loadPacklist('../bestand')).rejects.toBeInstanceOf(InvalidFileError)
  })

  it('returns an empty list when the folder does not exist', async () => {
    expect(await store.listPacklists()).toEqual([])
  })

  it('lists summaries sorted by updatedAt desc and skips broken files', async () => {
    await store.savePacklist(packlist('alt', '2026-01-01T00:00:00Z'), null)
    await store.savePacklist(packlist('neu', '2026-03-01T00:00:00Z', true), null)
    files.put('Zeltkonfigurator/packlisten/kaputt.packliste', '{ nope')
    files.put('Zeltkonfigurator/packlisten/readme.txt', 'ignored')

    const list = await store.listPacklists()
    expect(list.map((s) => s.id)).toEqual(['neu', 'alt'])
    expect(list[0]).toEqual({
      id: 'neu',
      name: 'Liste neu',
      tentCount: 1,
      itemCount: 2,
      checkedCount: 2,
      updatedAt: '2026-03-01T00:00:00Z'
    })
    expect(list[1].checkedCount).toBe(1)
  })

  it('propagates permission errors while listing', async () => {
    files.folders.add('Zeltkonfigurator/packlisten')
    files.failWith['list Zeltkonfigurator/packlisten'] = 403
    await expect(store.listPacklists()).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('deletes a packlist; deleting a missing one throws NotFoundError', async () => {
    await store.savePacklist(packlist('p1', '2026-01-01T00:00:00Z'), null)
    await store.deletePacklist('p1')
    expect(files.files.has('Zeltkonfigurator/packlisten/p1.packliste')).toBe(false)
    await expect(store.deletePacklist('p1')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('detects conflicting packlist saves', async () => {
    const first = await store.savePacklist(packlist('p1', '2026-01-01T00:00:00Z'), null)
    await store.savePacklist(packlist('p1', '2026-01-02T00:00:00Z'), first)
    await expect(
      store.savePacklist(packlist('p1', '2026-01-03T00:00:00Z'), first)
    ).rejects.toBeInstanceOf(ConflictError)
  })
})

describe('canWrite', () => {
  it('delegates to the injected function', async () => {
    expect(await store.canWrite()).toBe(true)
    writable = false
    expect(await store.canWrite()).toBe(false)
  })
})

describe('createWebDavFiles adapter', () => {
  it('normalizes etags', () => {
    expect(normalizeEtag('"abc"')).toBe('abc')
    expect(normalizeEtag('W/"abc"')).toBe('abc')
    expect(normalizeEtag('')).toBeNull()
    expect(normalizeEtag(undefined)).toBeNull()
  })

  it('maps calls to the web-client API', async () => {
    const calls: unknown[][] = []
    const api: WebDavApi<string> = {
      getFileContents: async (...a) => {
        calls.push(['get', ...a])
        return { body: '{}', headers: { ETag: '"x1"' } }
      },
      putFileContents: async (...a) => {
        calls.push(['put', ...a])
        return { etag: '"x2"' }
      },
      listFiles: async (...a) => {
        calls.push(['list', ...a])
        return { children: [{ name: 'a.json' }, {}] }
      },
      createFolder: async (...a) => {
        calls.push(['mkdir', ...a])
      },
      deleteFile: async (...a) => {
        calls.push(['rm', ...a])
      }
    }
    const f = createWebDavFiles(api, 'space')
    expect(await f.read('d/a.json')).toEqual({ body: '{}', etag: 'x1' })
    expect(await f.write('d/a.json', 'c', 'x1')).toEqual({ etag: 'x2' })
    expect(await f.write('d/b.json', 'c', null)).toEqual({ etag: 'x2' })
    expect(await f.list('d')).toEqual(['a.json'])
    await f.mkdir('d')
    await f.remove('d/a.json')

    expect(calls[1]).toEqual([
      'put',
      'space',
      { path: 'd/a.json', content: 'c', previousEntityTag: '"x1"' }
    ])
    expect(calls[2]).toEqual(['put', 'space', { path: 'd/b.json', content: 'c', overwrite: false }])
    expect(calls[4]).toEqual(['mkdir', 'space', { path: 'd', fetchFolder: false }])
  })
})
