import { allocate, UnknownConfigError } from '../../../src/domain/allocation'
import type { AllocationResult, Finish, Stock, TentConfig } from '../../../src/domain/types'
import { catalog, DEFAULT_ORDER, stockOf, tent } from './testCatalog'

function run(tents: TentConfig[], stock: Stock, order: Finish[] = DEFAULT_ORDER) {
  const original = JSON.stringify(stock)
  const res = allocate(tents, order, catalog, stock)
  expect(JSON.stringify(stock)).toBe(original) // Eingabe bleibt unverändert
  for (const i of res.items) {
    const sum = Object.values(i.perTent).reduce((a, b) => a + b, 0)
    expect(sum, i.articleId).toBe(i.quantity + i.missing)
    const missingSum = Object.values(i.missingPerTent).reduce((a, b) => a + b, 0)
    expect(missingSum, i.articleId).toBe(i.missing)
    expect(Object.values(i.missingPerTent).every((n) => n > 0)).toBe(true)
  }
  return res
}

const item = (res: AllocationResult, id: string) => res.items.find((i) => i.articleId === id)

describe('allocate: Grundlagen', () => {
  it('leere Zeltliste ergibt leeres Ergebnis mit Status ok', () => {
    expect(run([], stockOf())).toEqual({ items: [], deviations: [], status: 'ok' })
  })

  it('vollständiger Wunsch: Status ok, keine Abweichungen', () => {
    const res = run([tent('a')], stockOf({ 'sb-2-fenster': 2 }))
    expect(res.status).toBe('ok')
    expect(res.deviations).toEqual([])
    expect(item(res, 'sb-2-fenster')).toMatchObject({ quantity: 2, missing: 0, perTent: { a: 2 } })
    expect(item(res, 'nagel')).toMatchObject({ quantity: 4 })
    expect(item(res, 'mast')).toMatchObject({ quantity: 3, name: 'Mast', category: 'stange' })
  })

  it('Bestand 0: alles fehlt, Wand in Wunschvariante gezählt', () => {
    const res = run([tent('a')], {})
    expect(res.status).toBe('fehlt')
    expect(item(res, 'dach-jurte')).toMatchObject({ quantity: 0, missing: 1 })
    expect(item(res, 'mast')).toMatchObject({ quantity: 0, missing: 3 })
    expect(item(res, 'sb-2-fenster')).toMatchObject({ quantity: 0, missing: 2, perTent: { a: 2 } })
    expect(res.deviations).toContainEqual({
      tentId: 'a',
      kind: 'wand',
      wanted: 'Superbahn Fenster',
      got: null,
      segments: 4
    })
    expect(res.deviations).toContainEqual({
      tentId: 'a',
      kind: 'dach',
      wanted: 'Jurtendach',
      got: null
    })
  })

  it('sortiert nach Kategorie, dann Name', () => {
    const res = run([tent('a')], stockOf({ 'sb-2-fenster': 2 }))
    expect(res.items.map((i) => i.articleId)).toEqual([
      'dach-jurte',
      'sb-2-fenster',
      'mast',
      'seitenstange',
      'nagel',
      'daechle'
    ])
  })

  it('Parts mit Menge 0 erzeugen keine Zeile', () => {
    const res = run([tent('a', { wallId: 'keine', buildId: '' })], stockOf())
    expect(item(res, 'nagel')).toBeUndefined()
  })

  it('Zelt ohne Wand braucht keine Wandteile', () => {
    const res = run([tent('a', { wallId: 'keine', buildId: '' })], stockOf())
    expect(res.status).toBe('ok')
    expect(res.items.some((i) => i.category === 'wand')).toBe(false)
  })
})

describe('allocate: mehrere Zelte', () => {
  it('erstes Zelt gewinnt bei Konkurrenz um dieselben Teile', () => {
    const res = run([tent('a'), tent('b')], stockOf({ 'sb-2-fenster': 2 }))
    const sb = item(res, 'sb-2-fenster')!
    expect(sb).toMatchObject({ quantity: 2, missing: 2, perTent: { a: 2, b: 2 } })
    expect(res.deviations.filter((d) => d.tentId === 'a')).toEqual([])
    expect(res.deviations).toContainEqual({
      tentId: 'b',
      kind: 'wand',
      wanted: 'Superbahn Fenster',
      got: null,
      segments: 4
    })
    expect(res.status).toBe('fehlt')
  })

  it('führt den Fehlbestand pro Zelt mit', () => {
    const res = run([tent('a'), tent('b')], stockOf({ nagel: 6, 'sb-2-fenster': 2 }))
    expect(item(res, 'nagel')!.missingPerTent).toEqual({ b: 2 })
    expect(item(res, 'sb-2-fenster')!.missingPerTent).toEqual({ b: 2 })
    expect(item(res, 'mast')!.missingPerTent).toEqual({})
  })

  it('Reihenfolge der Zelte bestimmt, wer die Wunschteile bekommt', () => {
    const stock = stockOf({ 'sb-2-fenster': 2, 'sb-2-gaze': 2 })
    const res = run([tent('a'), tent('b')], stock)
    expect(res.deviations).toEqual([
      { tentId: 'b', kind: 'wand', wanted: 'Superbahn Fenster', got: 'Superbahn Gaze', segments: 4 }
    ])
    const swapped = run([tent('b', { finish: 'gaze' }), tent('a')], stock)
    expect(swapped.deviations).toEqual([])
  })

  it('Bodennägel der Wandoption: perTent und Fehlbestand', () => {
    const res = run([tent('a'), tent('b')], stockOf({ nagel: 6, 'sb-2-fenster': 4 }))
    expect(item(res, 'nagel')).toMatchObject({
      quantity: 6,
      missing: 2,
      perTent: { a: 4, b: 4 }
    })
    expect(res.status).toBe('fehlt')
  })
})

describe('allocate: Dach', () => {
  it('nimmt die bevorzugte Dachkonfiguration, wenn vorhanden', () => {
    const res = run([tent('a', { wallId: 'keine', buildId: '' })], stockOf())
    expect(item(res, 'dach-jurte')?.quantity).toBe(1)
    expect(item(res, 'kohtenblatt')).toBeUndefined()
  })

  it('weicht auf die nächste vollständige Konfiguration aus (Abweichung)', () => {
    const res = run(
      [tent('a', { wallId: 'keine', buildId: '' })],
      stockOf({ 'dach-jurte': 0, kohtenblatt: 6 })
    )
    expect(item(res, 'kohtenblatt')?.quantity).toBe(6)
    expect(item(res, 'dach-jurte')).toBeUndefined()
    expect(res.deviations).toEqual([
      { tentId: 'a', kind: 'dach', wanted: 'Jurtendach', got: '6 Kohtenblätter' }
    ])
    expect(res.status).toBe('mit-ausweichmaterial')
  })

  it('unvollständige Ausweichkonfiguration zählt nicht; bevorzugte mit Fehlbestand', () => {
    const res = run(
      [tent('a', { wallId: 'keine', buildId: '' })],
      stockOf({ 'dach-jurte': 0, kohtenblatt: 5 })
    )
    expect(item(res, 'dach-jurte')).toMatchObject({ quantity: 0, missing: 1 })
    expect(item(res, 'kohtenblatt')).toBeUndefined()
    expect(res.deviations).toEqual([{ tentId: 'a', kind: 'dach', wanted: 'Jurtendach', got: null }])
    expect(res.status).toBe('fehlt')
  })

  it('zweites Zelt bekommt das Ausweichdach, wenn das erste das Jurtendach nimmt', () => {
    const res = run(
      [tent('a', { wallId: 'keine', buildId: '' }), tent('b', { wallId: 'keine', buildId: '' })],
      stockOf({ 'dach-jurte': 1, kohtenblatt: 6 })
    )
    expect(res.deviations).toEqual([
      { tentId: 'b', kind: 'dach', wanted: 'Jurtendach', got: '6 Kohtenblätter' }
    ])
  })

  it('bevorzugtes Alternativdach wird gewählt, auch wenn es nicht das erste ist', () => {
    const res = run([tent('a', { roofId: 'kohten', wallId: 'keine', buildId: '' })], stockOf())
    expect(item(res, 'kohtenblatt')?.quantity).toBe(6)
    expect(res.deviations).toEqual([])
  })
})

describe('allocate: Status', () => {
  it('mit-ausweichmaterial bei Wandabweichung ohne Fehlbestand', () => {
    const res = run([tent('a')], stockOf({ 'sb-2-gaze': 2 }))
    expect(res.status).toBe('mit-ausweichmaterial')
  })

  it('fehlt hat Vorrang vor Ausweichmaterial', () => {
    const res = run(
      [tent('a'), tent('b', { wallId: 'keine', buildId: '' })],
      stockOf({ 'sb-2-gaze': 2, mast: 3 })
    )
    expect(res.status).toBe('fehlt')
  })
})

describe('allocate: unbekannte Konfiguration', () => {
  it.each([
    ['typeId', { typeId: 'x' }, /Zelt "t1".*Zelttyp "x"/],
    ['roofId', { roofId: 'x' }, /Zelt "t1".*Dachkonfiguration "x"/],
    ['setupId', { setupId: 'x' }, /Zelt "t1".*Aufbau "x"/],
    ['wallId', { wallId: 'x' }, /Zelt "t1".*Wandoption "x"/],
    ['buildId', { buildId: 'x' }, /Zelt "t1".*Bauart "x"/]
  ])('wirft UnknownConfigError bei unbekannter %s', (_n, over, re) => {
    const call = () => allocate([tent('t1', over)], DEFAULT_ORDER, catalog, stockOf())
    expect(call).toThrow(UnknownConfigError)
    expect(call).toThrow(re)
  })

  it('leere buildId fällt auf die erste Bauart zurück', () => {
    const res = run([tent('a', { buildId: '' })], stockOf({ 'sb-2-fenster': 2 }))
    expect(res.status).toBe('ok')
    expect(item(res, 'sb-2-fenster')?.quantity).toBe(2)
  })

  it('leere buildId bei Option ohne Bauarten ist in Ordnung', () => {
    expect(() => run([tent('a', { wallId: 'keine', buildId: '' })], stockOf())).not.toThrow()
  })
})
