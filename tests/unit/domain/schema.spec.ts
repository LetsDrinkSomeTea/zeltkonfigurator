import { parsePacklistFile, parseStockFile } from '../../../src/domain/schema'
import { InvalidFileError } from '../../../src/storage/DataStore'

const validStock = () => ({
  schemaVersion: 1,
  stock: { mast: { quantity: 3, note: 'zwei verbogen' }, alt: { quantity: 0 } }
})

const validList = () => ({
  schemaVersion: 1,
  id: 'p1',
  name: 'Pfila',
  date: '2026-08-01',
  tents: [
    {
      id: 't1',
      typeId: 'jurte',
      label: 'Küche',
      roofs: [{ roofId: 'r', setupId: 's' }],
      wallId: 'w',
      buildId: '',
      finish: 'gaze'
    }
  ],
  finishOrder: ['blanko', 'gaze', 'fenster'],
  items: [
    {
      articleId: 'mast',
      name: 'Mast',
      category: 'stange',
      quantity: 2,
      missing: 1,
      perTent: { t1: 3 },
      missingPerTent: { t1: 1 },
      checked: false
    }
  ],
  deviations: [
    { tentId: 't1', kind: 'wand', wanted: 'A', got: null as string | null, segments: 2 },
    { tentId: 't1', kind: 'dach', wanted: 'A', got: 'B' }
  ],
  extraItems: [{ id: 'e1', text: 'Hammer', quantity: 1, checked: true }],
  fingerprint: 'abc',
  updatedAt: '2026-08-01T10:00:00.000Z'
})

/** Klont die Gültig-Datei, wendet `mutate` an und erwartet InvalidFileError mit Feldnamen. */
function rejects(
  parse: (j: unknown) => unknown,
  base: unknown,
  mutate: (o: any) => void,
  field: RegExp
) {
  const o = JSON.parse(JSON.stringify(base))
  mutate(o)
  expect(() => parse(o)).toThrow(InvalidFileError)
  expect(() => parse(o)).toThrow(field)
}

describe('parseStockFile', () => {
  it('akzeptiert gültige Datei, auch unbekannte Artikel', () => {
    expect(parseStockFile(validStock())).toEqual(validStock())
  })

  it('akzeptiert leeren Bestand', () => {
    expect(parseStockFile({ schemaVersion: 1, stock: {} }).stock).toEqual({})
  })

  it.each([null, 5, 'x', [], undefined])('lehnt %j als Wurzel ab', (v) => {
    expect(() => parseStockFile(v)).toThrow(InvalidFileError)
  })

  it('schemaVersion', () => {
    rejects(parseStockFile, validStock(), (o) => (o.schemaVersion = 2), /schemaVersion/)
    rejects(parseStockFile, validStock(), (o) => delete o.schemaVersion, /schemaVersion/)
  })

  it('stock fehlt oder falscher Typ', () => {
    rejects(parseStockFile, validStock(), (o) => delete o.stock, /stock/)
    rejects(parseStockFile, validStock(), (o) => (o.stock = []), /stock/)
  })

  it.each([-1, 1.5, '3', null, NaN])('quantity %j ungültig', (q) => {
    const o = validStock()
    ;(o.stock.mast as any).quantity = q
    expect(() => parseStockFile(o)).toThrow(/stock\.mast\.quantity/)
  })

  it('Eintrag kein Objekt', () => {
    rejects(parseStockFile, validStock(), (o) => (o.stock.mast = 3), /stock\.mast/)
  })

  it('note muss Text sein', () => {
    rejects(parseStockFile, validStock(), (o) => (o.stock.mast.note = 5), /stock\.mast\.note/)
  })
})

describe('parsePacklistFile', () => {
  it('akzeptiert gültige Datei', () => {
    expect(parsePacklistFile(validList())).toEqual(validList())
  })

  it('date und label sind optional', () => {
    const o = validList() as any
    delete o.date
    delete o.tents[0].label
    const p = parsePacklistFile(o)
    expect('date' in p).toBe(false)
    expect('label' in p.tents[0]).toBe(false)
  })

  it('fehlende finishOrder wird mit der Vorgabe ergänzt', () => {
    const o = validList() as any
    delete o.finishOrder
    expect(parsePacklistFile(o).finishOrder).toEqual(['gaze', 'fenster', 'blanko'])
  })

  it('lehnt Nicht-Objekte ab', () => {
    for (const v of [null, 1, 'x', [], undefined] as unknown[]) {
      expect(() => parsePacklistFile(v)).toThrow(InvalidFileError)
    }
  })

  const cases: [string, (o: any) => void, RegExp][] = [
    ['schemaVersion', (o) => (o.schemaVersion = '1'), /schemaVersion/],
    ['id fehlt', (o) => delete o.id, /"id"/],
    ['id leer', (o) => (o.id = ''), /"id"/],
    ['name Zahl', (o) => (o.name = 3), /"name"/],
    ['date Zahl', (o) => (o.date = 3), /"date"/],
    ['tents kein Array', (o) => (o.tents = {}), /"tents"/],
    ['tents doppelte IDs', (o) => o.tents.push({ ...o.tents[0] }), /tents/],
    ['tent kein Objekt', (o) => (o.tents[0] = 'x'), /tents\[0\]/],
    ['tent.typeId', (o) => delete o.tents[0].typeId, /tents\[0\]\.typeId/],
    ['tent.roofs', (o) => (o.tents[0].roofs = 'x'), /tents\[0\]\.roofs/],
    [
      'tent.roofs[].setupId',
      (o) => delete o.tents[0].roofs[0].setupId,
      /tents\[0\]\.roofs\[0\]\.setupId/
    ],
    ['tent.wallId', (o) => (o.tents[0].wallId = ''), /tents\[0\]\.wallId/],
    ['tent.buildId', (o) => delete o.tents[0].buildId, /tents\[0\]\.buildId/],
    ['tent.finish', (o) => (o.tents[0].finish = 'rot'), /tents\[0\]\.finish/],
    ['tent.label', (o) => (o.tents[0].label = 1), /tents\[0\]\.label/],
    ['finishOrder kein Array', (o) => (o.finishOrder = 'gaze'), /finishOrder/],
    [
      'finishOrder unbekannt',
      (o) => (o.finishOrder = ['gaze', 'fenster', 'rot']),
      /finishOrder\[2\]/
    ],
    ['finishOrder Duplikat', (o) => (o.finishOrder = ['gaze', 'gaze', 'blanko']), /finishOrder/],
    ['finishOrder zu kurz', (o) => (o.finishOrder = ['gaze', 'blanko']), /finishOrder/],
    ['items kein Array', (o) => delete o.items, /"items"/],
    ['item.articleId', (o) => delete o.items[0].articleId, /items\[0\]\.articleId/],
    ['item.name', (o) => (o.items[0].name = null), /items\[0\]\.name/],
    ['item.category', (o) => (o.items[0].category = ''), /items\[0\]\.category/],
    ['item.quantity negativ', (o) => (o.items[0].quantity = -1), /items\[0\]\.quantity/],
    ['item.missing Bruch', (o) => (o.items[0].missing = 0.5), /items\[0\]\.missing/],
    ['item.perTent kein Objekt', (o) => (o.items[0].perTent = []), /items\[0\]\.perTent/],
    [
      'item.missingPerTent fehlt',
      (o) => delete o.items[0].missingPerTent,
      /items\[0\]\.missingPerTent/
    ],
    ['item.missingPerTent Wert', (o) => (o.items[0].missingPerTent.t1 = 0.5), /missingPerTent\.t1/],
    ['item.perTent Wert', (o) => (o.items[0].perTent.t1 = -2), /items\[0\]\.perTent\.t1/],
    ['item.checked', (o) => (o.items[0].checked = 1), /items\[0\]\.checked/],
    ['deviations fehlt', (o) => delete o.deviations, /"deviations"/],
    ['deviation.kind', (o) => (o.deviations[0].kind = 'x'), /deviations\[0\]\.kind/],
    ['deviation.tentId', (o) => (o.deviations[0].tentId = 1), /deviations\[0\]\.tentId/],
    ['deviation.wanted', (o) => delete o.deviations[0].wanted, /deviations\[0\]\.wanted/],
    ['deviation.got', (o) => (o.deviations[0].got = 3), /deviations\[0\]\.got/],
    ['deviation.segments', (o) => (o.deviations[0].segments = -1), /deviations\[0\]\.segments/],
    ['extraItems fehlt', (o) => delete o.extraItems, /"extraItems"/],
    ['extra.id', (o) => delete o.extraItems[0].id, /extraItems\[0\]\.id/],
    ['extra.text', (o) => (o.extraItems[0].text = 1), /extraItems\[0\]\.text/],
    ['extra.quantity', (o) => (o.extraItems[0].quantity = 1.5), /extraItems\[0\]\.quantity/],
    ['extra.checked', (o) => (o.extraItems[0].checked = 'ja'), /extraItems\[0\]\.checked/],
    ['fingerprint', (o) => delete o.fingerprint, /"fingerprint"/],
    ['updatedAt', (o) => (o.updatedAt = 5), /"updatedAt"/]
  ]
  it.each(cases)('lehnt ab: %s', (_name, mutate, field) => {
    rejects(parsePacklistFile, validList(), mutate, field)
  })

  it('Meldung ist auf Deutsch', () => {
    rejects(parsePacklistFile, validList(), (o) => (o.name = 1), /Ungültige Datei.*Text/)
  })
})
