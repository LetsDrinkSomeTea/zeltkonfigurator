import {
  createPacklist,
  createTentConfig,
  fingerprint,
  recalculate,
  summarize
} from '../../../src/domain/packlist'
import type { Catalog, PacklistFile } from '../../../src/domain/types'
import { catalog, jurte, stockOf, tent } from './testCatalog'

describe('createPacklist / createTentConfig', () => {
  it('legt eine leere Packliste mit Standardwerten an', () => {
    const stock = stockOf()
    const l = createPacklist('Pfila', catalog, stock)
    expect(l).toMatchObject({
      schemaVersion: 1,
      name: 'Pfila',
      tents: [],
      items: [],
      deviations: [],
      extraItems: [],
      finishOrder: ['gaze', 'fenster', 'blanko'],
      fingerprint: fingerprint(catalog, stock)
    })
    expect(l.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(Number.isNaN(Date.parse(l.updatedAt))).toBe(false)
    expect(createPacklist('x', catalog, stock).id).not.toBe(l.id)
  })

  it('finishOrder ist eine Kopie der Vorgabe', () => {
    const a = createPacklist('a', catalog, {})
    a.finishOrder.reverse()
    expect(createPacklist('b', catalog, {}).finishOrder).toEqual(['gaze', 'fenster', 'blanko'])
  })

  it('Zelt mit Vorgaben des Typs', () => {
    const t = createTentConfig(jurte)
    expect(t).toMatchObject({
      typeId: 'jurte',
      roofId: 'jurtendach',
      wallId: 'keine',
      buildId: '',
      finish: 'blanko'
    })
    expect(t.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('erste Bauart der ersten Wandoption', () => {
    const type = { ...jurte, walls: [jurte.walls[2], jurte.walls[0]] }
    expect(createTentConfig(type)).toMatchObject({ wallId: 'hoch', buildId: 'super' })
  })
})

describe('recalculate', () => {
  const stock = stockOf({ 'sb-2-fenster': 2, 'sb-2-gaze': 2 })
  const base = (): PacklistFile => ({
    ...createPacklist('L', catalog, stock),
    tents: [tent('a')]
  })

  it('berechnet items, deviations und fingerprint', () => {
    const l = recalculate(base(), catalog, stock)
    expect(l.items.length).toBeGreaterThan(0)
    expect(l.items.every((i) => i.checked === false)).toBe(true)
    expect(l.deviations).toEqual([])
    expect(l.fingerprint).toBe(fingerprint(catalog, stock))
  })

  it('mutiert die Eingabe nicht', () => {
    const l = base()
    const copy = JSON.parse(JSON.stringify(l))
    const out = recalculate(l, catalog, stock)
    expect(l).toEqual(copy)
    expect(out).not.toBe(l)
  })

  it('übernimmt Haken bei gleichem Artikel und gleicher Menge (F-36)', () => {
    const l1 = recalculate(base(), catalog, stock)
    l1.items.find((i) => i.articleId === 'mast')!.checked = true
    l1.items.find((i) => i.articleId === 'sb-2-fenster')!.checked = true
    const l2 = recalculate(
      { ...l1, tents: [tent('a'), tent('b', { wallId: 'keine', buildId: '' })] },
      catalog,
      stock
    )
    const get = (id: string) => l2.items.find((i) => i.articleId === id)!
    expect(get('sb-2-fenster').checked).toBe(true) // Menge unverändert
    expect(get('mast').checked).toBe(false) // 3 → 6
    expect(get('mast').quantity).toBe(6)
  })

  it('Haken bleibt nicht, wenn die Menge sich über Bestand ändert', () => {
    const l1 = recalculate(base(), catalog, stock)
    l1.items.find((i) => i.articleId === 'sb-2-fenster')!.checked = true
    const l2 = recalculate(l1, catalog, stockOf({ 'sb-2-fenster': 1, 'sb-2-gaze': 2 }))
    expect(l2.items.find((i) => i.articleId === 'sb-2-fenster')!.checked).toBe(false)
  })

  it('neue Zeilen sind nicht abgehakt, entfernte verschwinden', () => {
    const l1 = recalculate(base(), catalog, stock)
    l1.items.forEach((i) => (i.checked = true))
    const l2 = recalculate({ ...l1, tents: [] }, catalog, stock)
    expect(l2.items).toEqual([])
  })

  it('lässt extraItems und Metadaten unverändert', () => {
    const l = {
      ...base(),
      date: '2026-07-01',
      extraItems: [{ id: 'e', text: 'Hammer', quantity: 1, checked: true }]
    }
    const out = recalculate(l, catalog, stock)
    expect(out.extraItems).toEqual(l.extraItems)
    expect(out.date).toBe('2026-07-01')
    expect(out.id).toBe(l.id)
  })
})

describe('fingerprint', () => {
  const stock = stockOf({ 'sb-2-fenster': 2 })

  it('ist stabil und unabhängig von der Schlüsselreihenfolge', () => {
    const reordered = Object.fromEntries(Object.entries(stock).reverse())
    expect(fingerprint(catalog, stock)).toBe(fingerprint(catalog, reordered))
    expect(fingerprint(catalog, stock)).toMatch(/^[0-9a-f]+$/)
  })

  it('fehlender Eintrag entspricht 0', () => {
    expect(fingerprint(catalog, {})).toBe(fingerprint(catalog, { mast: 0 }))
  })

  it('ignoriert Bestand unbekannter Artikel', () => {
    expect(fingerprint(catalog, { ...stock, unbekannt: 5 })).toBe(fingerprint(catalog, stock))
  })

  it('ändert sich bei anderem Bestand', () => {
    expect(fingerprint(catalog, { ...stock, mast: 1 })).not.toBe(fingerprint(catalog, stock))
  })

  it('ändert sich bei geändertem Katalog', () => {
    const renamed: Catalog = {
      ...catalog,
      articles: catalog.articles.map((a) => (a.id === 'mast' ? { ...a, name: 'Mast lang' } : a))
    }
    const moreParts: Catalog = {
      ...catalog,
      tentTypes: [{ ...jurte, fixed: [...jurte.fixed, { articleId: 'nagel', quantity: 1 }] }]
    }
    const base = fingerprint(catalog, stock)
    expect(fingerprint(renamed, stock)).not.toBe(base)
    expect(fingerprint(moreParts, stock)).not.toBe(base)
  })
})

describe('summarize', () => {
  it('zählt items und extraItems', () => {
    const l: PacklistFile = {
      ...createPacklist('S', catalog, {}),
      date: '2026-08-01',
      tents: [tent('a'), tent('b')],
      items: [
        {
          articleId: 'x',
          name: 'x',
          category: 'stange',
          quantity: 1,
          missing: 0,
          toCut: 0,
          perTent: {},
          checked: true
        },
        {
          articleId: 'y',
          name: 'y',
          category: 'stange',
          quantity: 1,
          missing: 0,
          toCut: 0,
          perTent: {},
          checked: false
        }
      ],
      extraItems: [{ id: 'e', text: 't', quantity: 1, checked: true }]
    }
    expect(summarize(l)).toEqual({
      id: l.id,
      name: 'S',
      date: '2026-08-01',
      tentCount: 2,
      itemCount: 3,
      checkedCount: 2,
      updatedAt: l.updatedAt
    })
  })

  it('lässt date weg, wenn keines gesetzt ist', () => {
    expect('date' in summarize(createPacklist('S', catalog, {}))).toBe(false)
  })
})
