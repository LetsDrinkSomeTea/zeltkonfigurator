import { allocate } from '../../../src/domain/allocation'
import type { Finish, Stock, TentConfig } from '../../../src/domain/types'
import { buildVariants, coverWalls } from '../../../src/domain/walls'
import {
  articles,
  catalog,
  DEFAULT_ORDER,
  normalBuild,
  stockOf,
  streifenBuild,
  superBuild,
  tent
} from './testCatalog'

function walls(tents: TentConfig[], stock: Stock, order: Finish[] = DEFAULT_ORDER) {
  const res = allocate(tents, order, catalog, stockOf(stock))
  const used = Object.fromEntries(
    res.items
      .filter((i) => i.category === 'wand')
      .map((i) => [i.articleId, { q: i.quantity, m: i.missing }])
  )
  return { res, used }
}

describe('buildVariants', () => {
  const ids = (vs: ReturnType<typeof buildVariants>) => vs.map((v) => `${v.build.id}:${v.finish}`)

  it('Reihenfolge 1-4 mit Standard-Ausweichreihenfolge', () => {
    const vs = buildVariants([superBuild, streifenBuild], superBuild, 'fenster', DEFAULT_ORDER)
    expect(ids(vs)).toEqual([
      'super:fenster',
      'normal+streifen:fenster',
      'super:gaze',
      'super:blanko',
      'normal+streifen:gaze',
      'normal+streifen:blanko'
    ])
  })

  it('benutzerdefinierte Ausweichreihenfolge', () => {
    const vs = buildVariants([superBuild, streifenBuild], streifenBuild, 'gaze', [
      'blanko',
      'fenster',
      'gaze'
    ])
    expect(ids(vs)).toEqual([
      'normal+streifen:gaze',
      'super:gaze',
      'normal+streifen:blanko',
      'normal+streifen:fenster',
      'super:blanko',
      'super:fenster'
    ])
  })

  it('Bauart ohne Ausführungs-Lage wird nur einmal versucht', () => {
    const vs = buildVariants([normalBuild], normalBuild, 'gaze', DEFAULT_ORDER)
    expect(ids(vs)).toEqual(['normal:gaze'])
  })

  it('unvollständige finishOrder wird ergänzt', () => {
    const vs = buildVariants([superBuild], superBuild, 'blanko', ['fenster'])
    expect(ids(vs)).toEqual(['super:blanko', 'super:fenster', 'super:gaze'])
  })
})

describe('Wand: Doppel- und Einzelteile', () => {
  it('Doppel zuerst, Einzel für den Rest', () => {
    const { used, res } = walls([tent('a', { wallId: 'hoch5' })], {
      'sb-2-fenster': 5,
      'sb-1-fenster': 5
    })
    expect(used).toEqual({ 'sb-2-fenster': { q: 2, m: 0 }, 'sb-1-fenster': { q: 1, m: 0 } })
    expect(res.status).toBe('ok')
  })

  it('nur Einzel vorhanden', () => {
    const { used } = walls([tent('a')], { 'sb-1-fenster': 4 })
    expect(used).toEqual({ 'sb-1-fenster': { q: 4, m: 0 } })
  })

  it('ungerader Rest mit nur Doppelteilen: 4 gedeckt, 1 fehlt als Einzelteil', () => {
    const { used, res } = walls([tent('a', { wallId: 'hoch5' })], { 'sb-2-fenster': 3 })
    expect(used['sb-2-fenster']).toEqual({ q: 2, m: 0 })
    expect(used['sb-1-fenster']).toEqual({ q: 0, m: 1 })
    expect(res.deviations).toEqual([
      { tentId: 'a', kind: 'wand', wanted: 'Superbahn Fenster', got: null, segments: 1 }
    ])
    expect(res.status).toBe('fehlt')
  })

  it('ungerader Rest wird von Einzelteilen einer anderen Ausführung gedeckt', () => {
    const { res } = walls([tent('a', { wallId: 'hoch5' })], {
      'sb-2-fenster': 2,
      'sb-1-gaze': 1
    })
    expect(res.deviations).toEqual([
      { tentId: 'a', kind: 'wand', wanted: 'Superbahn Fenster', got: 'Superbahn Gaze', segments: 1 }
    ])
    expect(res.status).toBe('mit-ausweichmaterial')
  })

  it('Normalbahn + Streifen: Bahn und Streifen unabhängig einzel/doppel', () => {
    const { used, res } = walls([tent('a', { buildId: 'normal+streifen' })], {
      'nb-2': 2,
      'es-2-fenster': 1,
      'es-1-fenster': 2
    })
    expect(used).toEqual({
      'nb-2': { q: 2, m: 0 },
      'es-2-fenster': { q: 1, m: 0 },
      'es-1-fenster': { q: 2, m: 0 }
    })
    expect(res.deviations).toEqual([])
  })

  it('eine Doppel-Normalbahn mit zwei Einzelstreifen für 2 Segmente (Rest einer Superbahn-Lücke)', () => {
    const { used, res } = walls([tent('a')], {
      'sb-2-fenster': 1,
      'nb-2': 1,
      'es-1-fenster': 2
    })
    expect(used).toEqual({
      'sb-2-fenster': { q: 1, m: 0 },
      'nb-2': { q: 1, m: 0 },
      'es-1-fenster': { q: 2, m: 0 }
    })
    expect(res.deviations).toEqual([
      {
        tentId: 'a',
        kind: 'wand',
        wanted: 'Superbahn Fenster',
        got: 'Normalbahn + Erweiterungsstreifen Fenster',
        segments: 2
      }
    ])
  })

  it('k ist das Maximum, das ALLE Lagen decken (Streifen limitiert)', () => {
    const { used } = walls([tent('a', { buildId: 'normal+streifen' })], {
      'nb-2': 2,
      'es-2-fenster': 1
    })
    // Streifen decken nur 2 Segmente; Bahn wird auch nur für 2 gebucht, Rest fehlt je Lage
    expect(used['nb-2']).toEqual({ q: 1, m: 1 })
    expect(used['es-2-fenster']).toEqual({ q: 1, m: 1 })
  })

  it('mehrere Artikel für dieselbe Rolle/Spanne/Ausführung werden in Katalogreihenfolge genutzt', () => {
    const extra = {
      id: 'sb-2-fenster-folie',
      name: 'Superbahn doppel Fenster (Folie)',
      category: 'wand' as const,
      wall: { role: 'superbahn' as const, span: 2 as const, finish: 'fenster' as const }
    }
    const stock: Stock = { 'sb-2-fenster': 1, 'sb-2-fenster-folie': 1 }
    const plan = coverWalls(
      4,
      [superBuild],
      superBuild,
      'fenster',
      DEFAULT_ORDER,
      [...articles, extra],
      stock
    )
    expect(plan.taken).toEqual([
      { articleId: 'sb-2-fenster', quantity: 1 },
      { articleId: 'sb-2-fenster-folie', quantity: 1 }
    ])
    expect(plan.uncovered).toBe(0)
  })
})

describe('Wand: Ausweichreihenfolge', () => {
  const dev = (got: string | null, segments: number, wanted = 'Superbahn Fenster') => ({
    tentId: 'a',
    kind: 'wand',
    wanted,
    got,
    segments
  })

  it('Schritt 1: Wunsch-Bauart in Wunsch-Ausführung hat Vorrang', () => {
    const { res } = walls([tent('a')], {
      'sb-2-fenster': 2,
      'sb-2-gaze': 2,
      'nb-2': 2,
      'es-2-fenster': 2
    })
    expect(res.deviations).toEqual([])
  })

  it('Schritt 2: andere Bauart in Wunsch-Ausführung vor anderer Ausführung', () => {
    const { res } = walls([tent('a')], { 'sb-2-gaze': 2, 'nb-2': 2, 'es-2-fenster': 2 })
    expect(res.deviations).toEqual([dev('Normalbahn + Erweiterungsstreifen Fenster', 4)])
  })

  it('Schritt 3: Wunsch-Bauart in anderer Ausführung', () => {
    const { res } = walls([tent('a')], { 'sb-2-gaze': 2, 'nb-2': 2, 'es-2-gaze': 2 })
    expect(res.deviations).toEqual([dev('Superbahn Gaze', 4)])
  })

  it('Schritt 3 folgt der Ausweichreihenfolge der Packliste', () => {
    const stock = { 'sb-2-gaze': 2, 'sb-2-blanko': 2 }
    expect(walls([tent('a')], stock).res.deviations).toEqual([dev('Superbahn Gaze', 4)])
    expect(walls([tent('a')], stock, ['blanko', 'gaze', 'fenster']).res.deviations).toEqual([
      dev('Superbahn Blanko', 4)
    ])
  })

  it('Schritt 4: andere Bauart in anderer Ausführung', () => {
    const { res } = walls([tent('a')], { 'nb-2': 2, 'es-2-gaze': 2 })
    expect(res.deviations).toEqual([dev('Normalbahn + Erweiterungsstreifen Gaze', 4)])
    expect(res.status).toBe('mit-ausweichmaterial')
  })

  it('Schritt 4 folgt der Ausweichreihenfolge', () => {
    const stock = { 'nb-2': 2, 'es-2-gaze': 2, 'es-2-blanko': 2 }
    expect(walls([tent('a')], stock, ['blanko', 'gaze', 'fenster']).res.deviations).toEqual([
      dev('Normalbahn + Erweiterungsstreifen Blanko', 4)
    ])
  })

  it('Wunsch-Bauart Normal+Streifen: Superbahn ist Schritt 2', () => {
    const { res } = walls([tent('a', { buildId: 'normal+streifen' })], { 'sb-2-fenster': 2 })
    expect(res.deviations).toEqual([
      dev('Superbahn Fenster', 4, 'Normalbahn + Erweiterungsstreifen Fenster')
    ])
  })

  it('mehrere Varianten teilen sich die Segmente', () => {
    const { res } = walls([tent('a')], { 'sb-2-fenster': 1, 'sb-2-gaze': 1 })
    expect(res.deviations).toEqual([dev('Superbahn Gaze', 2)])
  })

  it('Rest nach gedeckten Varianten fehlt in Wunschvariante', () => {
    const { res, used } = walls([tent('a')], { 'sb-2-fenster': 1, 'sb-2-gaze': 0 })
    expect(res.deviations).toEqual([dev(null, 2)])
    expect(used['sb-2-fenster']).toEqual({ q: 1, m: 1 })
  })

  it('Ausweichvariante und Rest zugleich', () => {
    const { res, used } = walls([tent('a')], { 'sb-2-fenster': 1, 'nb-2': 1, 'es-2-blanko': 1 })
    expect(res.deviations).toEqual([dev('Normalbahn + Erweiterungsstreifen Blanko', 2)])
    expect(used['sb-2-fenster']).toEqual({ q: 1, m: 0 })
  })

  it('Normalbahn-Option: Ausführung ist egal, keine Abweichung', () => {
    const { res } = walls([tent('a', { wallId: 'normal', buildId: 'normal', finish: 'gaze' })], {
      'nb-2': 2
    })
    expect(res.deviations).toEqual([])
    expect(res.status).toBe('ok')
  })

  it('Wandoption ändert nie die Höhe: Superbahnen ersetzen keine fehlende Normalwand', () => {
    const { res, used } = walls([tent('a', { wallId: 'normal', buildId: 'normal' })], {
      'sb-2-blanko': 4,
      'sb-2-fenster': 4
    })
    expect(used).toEqual({ 'nb-2': { q: 0, m: 2 } })
    expect(res.deviations).toEqual([dev(null, 4, 'Normalbahn')])
  })
})

describe('Wand: fehlende Teile', () => {
  it('Fallback auf andere Spanne und andere Ausführung, wenn der Katalog nichts Passendes hat', () => {
    const only = articles.filter((a) => a.id === 'sb-2-blanko')
    const plan = coverWalls(3, [superBuild], superBuild, 'fenster', DEFAULT_ORDER, only, {})
    expect(plan.uncovered).toBe(3)
    expect(plan.missing).toEqual([{ articleId: 'sb-2-blanko', quantity: 2 }])
  })

  it('Einzel statt Doppel, wenn es nur Einzelartikel gibt', () => {
    const only = articles.filter((a) => a.id === 'sb-1-fenster')
    const plan = coverWalls(5, [superBuild], superBuild, 'fenster', DEFAULT_ORDER, only, {})
    expect(plan.missing).toEqual([{ articleId: 'sb-1-fenster', quantity: 5 }])
  })

  it('Doppel zuerst gezählt', () => {
    const plan = coverWalls(5, [superBuild], superBuild, 'fenster', DEFAULT_ORDER, articles, {})
    expect(plan.missing).toEqual([
      { articleId: 'sb-2-fenster', quantity: 2 },
      { articleId: 'sb-1-fenster', quantity: 1 }
    ])
  })

  it('jede Lage wird gezählt (Normalbahn + Streifen)', () => {
    const plan = coverWalls(4, [streifenBuild], streifenBuild, 'gaze', DEFAULT_ORDER, articles, {})
    expect(plan.missing).toEqual([
      { articleId: 'nb-2', quantity: 2 },
      { articleId: 'es-2-gaze', quantity: 2 }
    ])
  })
})
