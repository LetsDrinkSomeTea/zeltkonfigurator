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
  WebDavDataStore,
  WebDavPacklistDocument
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

  async mkdir(path: string) {
    this.check('mkdir', path)
    if (this.folders.has(path)) throw new HttpErr(405)
    this.folders.add(path)
  }
}

const stock: StockFile = { schemaVersion: 1, stock: { 'stange-a': { quantity: 4 } } }

function packlist(id: string, updatedAt: string, checked = false): PacklistFile {
  return {
    schemaVersion: 1,
    id,
    name: `Liste ${id}`,
    materials: [],
    tents: [
      {
        id: 't1',
        typeId: 'x',
        roofs: [{ roofId: 'r', setupId: 's' }],
        wallId: 'w',
        buildId: '',
        finish: 'blanko'
      }
    ],
    finishOrder: ['gaze', 'fenster', 'blanko'],
    items: [
      {
        articleId: 'a',
        name: 'A',
        category: 'kleinteil',
        quantity: 1,
        missing: 0,
        perTent: { t1: 1 },
        missingPerTent: {},
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
    path: 'Zeltkonfigurator/Zeltmaterial.bestand',
    canWrite: async () => writable,
    parseStockFile
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
    expect([...files.folders]).toEqual(['Zeltkonfigurator'])
    const raw = files.files.get('Zeltkonfigurator/Zeltmaterial.bestand')!.content
    expect(parseYaml(raw)).toEqual(stock)
    expect(raw.trimStart().startsWith('{')).toBe(false)
    expect(await store.loadStock()).toEqual({ data: stock, etag })
  })

  it('creates no folders for a file on the top level and uses the configured file name', async () => {
    const top = new WebDavDataStore({
      files,
      path: 'Material.bestand',
      canWrite: async () => true,
      parseStockFile
    })
    await top.saveStock(stock, null)
    expect(files.calls.filter((c) => c.startsWith('mkdir'))).toEqual([])
    expect(files.files.has('Material.bestand')).toBe(true)
    expect((await top.loadStock()).data).toEqual(stock)
  })

  it('creates all parent folders of a nested file', async () => {
    const nested = new WebDavDataStore({
      files,
      path: 'Lager/Zelte/Material.bestand',
      canWrite: async () => true,
      parseStockFile
    })
    await nested.saveStock(stock, null)
    expect([...files.folders]).toEqual(['Lager', 'Lager/Zelte'])
  })

  it('only creates folders once', async () => {
    const etag = await store.saveStock(stock, null)
    await store.saveStock(stock, etag)
    expect(files.calls.filter((c) => c.startsWith('mkdir')).length).toBe(1)
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
    expect(etag).toBe(files.files.get('Zeltkonfigurator/Zeltmaterial.bestand')!.etag)
  })

  it('maps 403 to ForbiddenError', async () => {
    files.failWith['write Zeltkonfigurator/Zeltmaterial.bestand'] = 403
    await expect(store.saveStock(stock, null)).rejects.toBeInstanceOf(ForbiddenError)
    files.failWith['read Zeltkonfigurator/Zeltmaterial.bestand'] = 401
    await expect(store.loadStock()).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('maps 404 on write with an etag to NotFoundError', async () => {
    await expect(store.saveStock(stock, 'old')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('rejects invalid YAML with InvalidFileError', async () => {
    files.put('Zeltkonfigurator/Zeltmaterial.bestand', '{ nicht json')
    await expect(store.loadStock()).rejects.toBeInstanceOf(InvalidFileError)
  })

  it('rejects an unknown schema version with InvalidFileError', async () => {
    files.put(
      'Zeltkonfigurator/Zeltmaterial.bestand',
      JSON.stringify({ schemaVersion: 2, stock: {} })
    )
    await expect(store.loadStock()).rejects.toBeInstanceOf(InvalidFileError)
  })

  it('wraps unexpected parser errors in InvalidFileError', async () => {
    const strict = new WebDavDataStore({
      files,
      path: 'Z/Zeltmaterial.bestand',
      canWrite: async () => true,
      parseStockFile: () => {
        throw new TypeError('kaputt')
      }
    })
    files.put('Z/Zeltmaterial.bestand', '{}')
    await expect(strict.loadStock()).rejects.toBeInstanceOf(InvalidFileError)
  })

  it('does not swallow unrelated errors', async () => {
    files.failWith['read Zeltkonfigurator/Zeltmaterial.bestand'] = 500
    await expect(store.loadStock()).rejects.toBeInstanceOf(HttpErr)
  })
})

describe('packlist document', () => {
  const PATH = 'Lager/2027/Sommerlager.packliste'
  const doc = (path = PATH) =>
    new WebDavPacklistDocument({
      files,
      path,
      canWrite: async () => writable,
      parsePacklistFile
    })

  it('is named after the file', () => {
    expect(doc().name).toBe('Sommerlager')
  })

  it('reports an empty file as data = null with its etag', async () => {
    files.put(PATH, '')
    expect(await doc().load()).toEqual({ data: null, etag: 'e1' })
  })

  it('saves in place and loads with the file name as list name', async () => {
    files.put(PATH, '')
    const etag = await doc().save(packlist('p1', '2026-01-01T00:00:00Z'), 'e1')
    expect(files.calls.filter((c) => c.startsWith('mkdir'))).toEqual([])
    expect(parseYaml(files.files.get(PATH)!.content).name).toBe('Liste p1')
    const loaded = await doc().load()
    expect(loaded.etag).toBe(etag)
    expect(loaded.data?.name).toBe('Sommerlager')
    expect(loaded.data?.items).toHaveLength(1)
  })

  it('maps a missing file to NotFoundError', async () => {
    await expect(doc('nope.packliste').load()).rejects.toBeInstanceOf(NotFoundError)
  })

  it('rejects broken files with InvalidFileError', async () => {
    files.put(PATH, '{ nope')
    await expect(doc().load()).rejects.toBeInstanceOf(InvalidFileError)
  })

  it('detects conflicting saves', async () => {
    files.put(PATH, '')
    const first = await doc().save(packlist('p1', '2026-01-01T00:00:00Z'), 'e1')
    await doc().save(packlist('p1', '2026-01-02T00:00:00Z'), first)
    await expect(doc().save(packlist('p1', '2026-01-03T00:00:00Z'), first)).rejects.toBeInstanceOf(
      ConflictError
    )
  })

  it('maps 403 to ForbiddenError and delegates canWrite', async () => {
    files.put(PATH, '')
    files.failWith[`write ${PATH}`] = 403
    await expect(doc().save(packlist('p1', 'x'), 'e1')).rejects.toBeInstanceOf(ForbiddenError)
    writable = false
    expect(await doc().canWrite()).toBe(false)
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
      createFolder: async (...a) => {
        calls.push(['mkdir', ...a])
      }
    }
    const f = createWebDavFiles(api, 'space')
    expect(await f.read('d/a.json')).toEqual({ body: '{}', etag: 'x1' })
    expect(await f.write('d/a.json', 'c', 'x1')).toEqual({ etag: 'x2' })
    expect(await f.write('d/b.json', 'c', null)).toEqual({ etag: 'x2' })
    await f.mkdir('d')

    expect(calls[1]).toEqual([
      'put',
      'space',
      { path: 'd/a.json', content: 'c', previousEntityTag: '"x1"' }
    ])
    expect(calls[2]).toEqual(['put', 'space', { path: 'd/b.json', content: 'c', overwrite: false }])
    expect(calls[3]).toEqual(['mkdir', 'space', { path: 'd', fetchFolder: false }])
  })
})
