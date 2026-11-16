import { describe, expect, it } from 'vitest'
import { applyFileOp } from '../../../src/composables/useStock'
import { catalog, defaultCatalogData, resolveCatalog } from '../../../src/domain/catalog'
import { parseCatalogData, parseStockFile } from '../../../src/domain/schema'
import type { CatalogData, StockFile } from '../../../src/domain/types'
import { InvalidFileError } from '../../../src/storage/DataStore'

const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

describe('Katalog als Daten', () => {
  it('der mitgelieferte Katalog übersteht Speichern und Laden unverändert', () => {
    const parsed = parseCatalogData(copy(defaultCatalogData), 'catalog')
    expect(parsed).toEqual(copy(defaultCatalogData))
    expect(resolveCatalog(parsed).tentTypes.map((t) => t.id)).toEqual(
      catalog.tentTypes.map((t) => t.id)
    )
  })

  it('Bestandsdatei ohne Katalog bleibt ohne, mit Katalog wird er geprüft', () => {
    expect(parseStockFile({ schemaVersion: 1, stock: {} })).toEqual({ schemaVersion: 1, stock: {} })
    const withCatalog = { schemaVersion: 1, stock: {}, catalog: copy(defaultCatalogData) }
    expect(parseStockFile(withCatalog).catalog?.tentTypes).toHaveLength(
      defaultCatalogData.tentTypes.length
    )
  })

  it.each<[string, (c: CatalogData) => unknown, RegExp]>([
    ['doppelte Artikel', (c: CatalogData) => c.articles.push(c.articles[0]), /doppelt/],
    [
      'unbekannte Wandoption',
      (c: CatalogData) => ((c.tentTypes[0].wall.options as string[])[0] = 'xyz'),
      /wall\.options/
    ],
    ['Zelttyp ohne Dach', (c: CatalogData) => (c.tentTypes[0].modules = []), /modules/],
    ['Menge 0', (c: CatalogData) => (c.tentTypes[0].fixed[0].quantity = 0), /quantity/]
  ])('lehnt ab: %s', (_name, mutate, re) => {
    const data = copy(defaultCatalogData)
    mutate(data)
    expect(() => parseCatalogData(data, 'catalog')).toThrow(InvalidFileError)
    expect(() => parseCatalogData(data, 'catalog')).toThrow(re)
  })

  it('Zelttyp mit unbekanntem Dach entfällt und wird gemeldet', () => {
    const data = copy(defaultCatalogData)
    data.tentTypes[0].modules = [{ moduleId: 'gibt-es-nicht' }]
    const resolved = resolveCatalog(data)
    expect(resolved.tentTypes.find((t) => t.id === data.tentTypes[0].id)).toBeUndefined()
    expect(resolved.problems).toEqual([`Zelttyp „Kohte“: unbekanntes Dach „gibt-es-nicht“`])
  })

  it('Wandmaterial und die Kategorie Seitenwand sind immer da', () => {
    const resolved = resolveCatalog({ categories: [], articles: [], modules: [], tentTypes: [] })
    expect(resolved.categories.map((c) => c.id)).toEqual(['wand'])
    expect(resolved.articles.every((a) => a.category === 'wand' && a.wall)).toBe(true)
  })
})

describe('Materialliste bearbeiten (applyFileOp)', () => {
  const empty: StockFile = { schemaVersion: 1, stock: { 't-profil-30': { quantity: 5 } } }

  it('legt beim ersten Bearbeiten den Katalog aus den Vorgaben an', () => {
    const next = applyFileOp(empty, {
      type: 'upsertCategory',
      category: { id: 'kueche', name: 'Küche' }
    })
    expect(next.catalog?.categories.at(-1)).toEqual({ id: 'kueche', name: 'Küche' })
    expect(next.catalog?.tentTypes).toHaveLength(defaultCatalogData.tentTypes.length)
    expect(defaultCatalogData.categories.some((c) => c.id === 'kueche')).toBe(false)
  })

  it('Artikel anlegen, umbenennen und löschen; der Bestand geht mit', () => {
    let f = applyFileOp(empty, {
      type: 'upsertArticle',
      article: { id: 'braeter', name: 'Bräter', category: 'kleinteil' }
    })
    f = applyFileOp(f, { type: 'setQuantity', articleId: 'braeter', quantity: 2 })
    f = applyFileOp(f, {
      type: 'upsertArticle',
      article: { id: 'braeter', name: 'Bräter groß', category: 'kleinteil' }
    })
    expect(f.catalog?.articles.filter((a) => a.id === 'braeter')).toEqual([
      { id: 'braeter', name: 'Bräter groß', category: 'kleinteil' }
    ])
    f = applyFileOp(f, { type: 'removeArticle', id: 'braeter' })
    expect(f.catalog?.articles.some((a) => a.id === 'braeter')).toBe(false)
    expect(f.stock.braeter).toBeUndefined()
    expect(f.stock['t-profil-30']).toEqual({ quantity: 5 })
  })

  it('belegte Kategorien und „Seitenwand“ lassen sich nicht löschen', () => {
    const used = applyFileOp(empty, { type: 'removeCategory', id: 'dach' })
    expect(used.catalog?.categories.some((c) => c.id === 'dach')).toBe(true)
    const wand = applyFileOp(empty, { type: 'removeCategory', id: 'wand' })
    expect(wand.catalog?.categories.some((c) => c.id === 'wand')).toBe(true)
  })

  it('Zelttypen anlegen und löschen', () => {
    const tentType = {
      ...copy(defaultCatalogData.tentTypes[2]),
      id: 'kleine-jurte',
      name: 'Kleine Jurte'
    }
    let f = applyFileOp(empty, { type: 'upsertTentType', tentType })
    expect(resolveCatalog(f.catalog!).tentTypes.some((t) => t.id === 'kleine-jurte')).toBe(true)
    f = applyFileOp(f, { type: 'removeTentType', id: 'kleine-jurte' })
    expect(f.catalog?.tentTypes.some((t) => t.id === 'kleine-jurte')).toBe(false)
  })
})

describe('roofNames', () => {
  it('nummeriert nur mehrfach vorkommende Dächer', async () => {
    const { roofNames } = await import('../../../src/domain/view/roofNames')
    expect(roofNames([{ name: 'Jurte' }])).toEqual([''])
    expect(roofNames([{ name: 'Jurte' }, { name: 'Jurte' }, { name: 'Jurte' }])).toEqual([
      'Jurte 1',
      'Jurte 2',
      'Jurte 3'
    ])
    expect(roofNames([{ name: 'Großjurte' }, { name: 'Jurte' }, { name: 'Kohte' }])).toEqual([
      'Großjurte',
      'Jurte',
      'Kohte'
    ])
  })
})
