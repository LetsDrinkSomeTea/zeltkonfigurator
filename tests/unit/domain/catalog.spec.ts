import { defaultTentOptions } from '../../../src/domain/packlist'
import { describe, expect, it } from 'vitest'
import { catalog } from '../../../src/domain/catalog'
import type { Part, TentType } from '../../../src/domain/types'

const { articles, tentTypes } = catalog
const articleIds = new Set(articles.map((a) => a.id))

function tent(id: string): TentType {
  const t = tentTypes.find((x) => x.id === id)
  if (!t) throw new Error(`Zelttyp ${id} fehlt`)
  return t
}

function count(parts: Part[], articleId: string): number {
  return parts.filter((p) => p.articleId === articleId).reduce((s, p) => s + p.quantity, 0)
}

function allParts(t: TentType): Part[] {
  return [...t.roofs.flatMap((r) => r.parts), ...t.fixed, ...t.walls.flatMap((w) => w.parts)]
}

const unique = (ids: string[]) => new Set(ids).size === ids.length

describe('Katalog: Konsistenz', () => {
  it('hat eindeutige Artikel- und Zelttyp-IDs', () => {
    expect(unique(articles.map((a) => a.id))).toBe(true)
    expect(unique(tentTypes.map((t) => t.id))).toBe(true)
  })

  it('hat in jedem Zelttyp eindeutige Dach-, Wand- und Bauart-IDs', () => {
    for (const t of tentTypes) {
      expect(unique(t.roofs.map((r) => r.id)), `${t.id} roofs`).toBe(true)
      expect(unique(t.walls.map((w) => w.id)), `${t.id} walls`).toBe(true)
      for (const w of t.walls) {
        expect(unique(w.builds.map((b) => b.id)), `${t.id}/${w.id} builds`).toBe(true)
      }
    }
  })

  it('verwendet nur bekannte Artikel mit positiven ganzzahligen Mengen', () => {
    for (const t of tentTypes) {
      for (const p of allParts(t)) {
        expect(articleIds.has(p.articleId), `${t.id}: ${p.articleId}`).toBe(true)
        expect(Number.isInteger(p.quantity) && p.quantity > 0, `${t.id}: ${p.articleId}`).toBe(true)
      }
    }
  })

  it('hat je Zelttyp mindestens eine Dach- und eine Wandoption', () => {
    for (const t of tentTypes) {
      expect(t.roofs.length, t.id).toBeGreaterThanOrEqual(1)
      expect(t.walls.length, t.id).toBeGreaterThanOrEqual(1)
    }
  })

  it('hat Bauarten genau dann, wenn die Wandoption Segmente hat', () => {
    for (const t of tentTypes) {
      for (const w of t.walls) {
        if (w.segments > 0) expect(w.builds.length, `${t.id}/${w.id}`).toBeGreaterThanOrEqual(1)
        else expect(w.builds, `${t.id}/${w.id}`).toHaveLength(0)
      }
    }
  })

  it('hat für jede verwendete Wandrolle mindestens einen Einzel-Artikel (span 1)', () => {
    for (const t of tentTypes) {
      for (const w of t.walls) {
        for (const b of w.builds) {
          for (const role of b.layers) {
            const found = articles.some((a) => a.wall?.role === role && a.wall.span === 1)
            expect(found, `${t.id}/${w.id}/${b.id}: ${role}`).toBe(true)
          }
        }
      }
    }
  })

  it('führt Wandmaterial nur in der Kategorie "wand"', () => {
    for (const a of articles) {
      expect(a.category === 'wand', a.id).toBe(a.wall !== undefined)
    }
  })

  it('kennt Normalbahnen und den Erdstreifen nur in blanko', () => {
    for (const a of articles) {
      if (a.wall && (a.wall.role === 'normalbahn' || a.wall.role === 'erdstreifen')) {
        expect(a.wall.finish, a.id).toBe('blanko')
      }
    }
  })

  it('hat Superbahnen und Erweiterungsstreifen je einzel/doppel in allen Ausführungen', () => {
    for (const role of ['superbahn', 'erweiterungsstreifen'] as const) {
      for (const span of [1, 2] as const) {
        for (const finish of ['blanko', 'fenster', 'gaze'] as const) {
          const found = articles.filter(
            (a) => a.wall?.role === role && a.wall.span === span && a.wall.finish === finish
          )
          expect(found, `${role} ${span} ${finish}`).toHaveLength(1)
        }
      }
    }
  })

  it('hat lesbare Namen', () => {
    const a = articles.find((x) => x.id === 'superbahn-doppel-gaze')
    expect(a?.name).toBe('Superbahn doppel, Gaze (323 × 209 cm)')
  })
})

describe('Katalog: Stichproben aus den Anforderungen', () => {
  it('hat die Zelttypen in der Reihenfolge der Anforderungen', () => {
    expect(tentTypes.map((t) => t.id)).toEqual([
      'kohte',
      'hochkohte',
      'jurte',
      'grossjurte',
      'gigajurte9',
      'gigajurte12',
      'theaterjurte',
      'dreierjurtenburg',
      'cafelounge',
      'sudan',
      'yellowstone'
    ])
  })

  it('Jurte: 12 Segmente und zwei Dächer', () => {
    const t = tent('jurte')
    expect(t.roofs.map((r) => r.id)).toEqual(['jurtendach', 'kohtenblaetter'])
    expect(t.walls.map((w) => w.id)).toEqual(['keine', 'normal', 'hoch'])
    expect(t.walls.filter((w) => w.segments > 0).every((w) => w.segments === 12)).toBe(true)
  })

  it.each([
    ['grossjurte', 16],
    ['gigajurte9', 18],
    ['gigajurte12', 24],
    ['theaterjurte', 14],
    ['dreierjurtenburg', 27]
  ])('%s hat %i Wandsegmente', (id, segments) => {
    const hoch = tent(id).walls.find((w) => w.id === 'hoch')
    expect(hoch?.segments).toBe(segments)
    expect(count(tent(id).fixed, 'seitenstange')).toBe(segments)
  })

  it('Cafélounge: Großjurte, Jurte und Kohte; Holzgestänge statt Jurtengestänge', () => {
    const t = tent('cafelounge')
    expect(t.roofs[0].parts).toEqual([
      { articleId: 'grossjurtendach', quantity: 1 },
      { articleId: 'jurtendach', quantity: 1 },
      { articleId: 'kohtenblatt', quantity: 4 }
    ])
    expect(t.walls.find((w) => w.id === 'hoch')?.segments).toBe(24)
    expect(count(t.fixed, 'holzgestaenge-cafelounge')).toBe(2)
    expect(count(t.fixed, 'seitenstange')).toBe(0)
    expect(count(t.fixed, 'mast-375')).toBe(2)
    expect(count(t.fixed, 'kohtenkreuz')).toBe(1)
  })

  it('Theaterjurte hat eigene Abdeckplane und Spinne', () => {
    const t = tent('theaterjurte')
    expect(count(t.fixed, 'theaterjurtendaechle')).toBe(1)
    expect(count(t.fixed, 'theaterjurtenspinne')).toBe(1)
  })

  it('60-cm-T-Profile nur bei der Gigajurte (8), PacMan auf jedes T-Profil', () => {
    for (const t of tentTypes) {
      const giga = t.id === 'gigajurte9' || t.id === 'gigajurte12'
      expect(count(t.fixed, 't-profil-60'), t.id).toBe(giga ? 8 : 0)
      expect(count(t.fixed, 'pacman'), t.id).toBe(
        count(t.fixed, 't-profil-30') + count(t.fixed, 't-profil-60')
      )
    }
  })

  it('Gigajurte 12 m: Dach aus Gigajurtendach, 12 Zwischendachteilen und 6 Kohtenblättern', () => {
    const roof = tent('gigajurte12').roofs[0]
    expect(roof.parts).toEqual([
      { articleId: 'gigajurtendach', quantity: 1 },
      { articleId: 'jurten-zwischendachteil', quantity: 12 },
      { articleId: 'kohtenblatt', quantity: 6 }
    ])
  })

  it('Hochkohte: nur-streifen, normal, hoch', () => {
    expect(tent('hochkohte').walls.map((w) => w.id)).toEqual(['nur-streifen', 'normal', 'hoch'])
  })

  it('Kohte: keine und erdstreifen, Erdstreifen mit einem Segment', () => {
    const t = tent('kohte')
    expect(t.walls.map((w) => w.id)).toEqual(['keine', 'erdstreifen'])
    expect(t.walls[0].label).toBe('Ohne Erdstreifen')
    expect(t.walls[1].segments).toBe(1)
  })

  it('Hochkohte und hohe Wand: Bodennägel 2 je Segment, hohe Wand baut Superbahn zuerst', () => {
    const hoch = tent('hochkohte').walls.find((w) => w.id === 'hoch')
    expect(hoch?.parts).toEqual([{ articleId: 'bodennagel', quantity: 16 }])
    expect(hoch?.builds.map((b) => b.id)).toEqual(['super', 'normal+streifen'])
  })

  it('Weißzelte haben eine Zelthaut, keine Wand und eine Bodenplane', () => {
    for (const [id, boden] of [
      ['sudan', 'bodenplane-rund'],
      ['yellowstone', 'bodenplane-eckig']
    ]) {
      const t = tent(id)
      expect(t.roofs).toHaveLength(1)
      expect(t.walls.map((w) => w.id)).toEqual(['keine'])
      expect(count(t.fixed, boden)).toBe(1)
    }
  })
})

describe('Standardkonfigurationen', () => {
  it('verweisen nur auf vorhandene Dächer, Wände und Bauarten', () => {
    for (const t of tentTypes) {
      const d = t.defaults
      if (!d) continue
      if (d.roofId)
        expect(
          t.roofs.some((r) => r.id === d.roofId),
          `${t.id} roof`
        ).toBe(true)
      const wall = t.walls.find((w) => w.id === (d.wallId ?? t.walls[0].id))
      expect(wall, `${t.id} wall`).toBeDefined()
      if (d.buildId)
        expect(
          wall!.builds.some((b) => b.id === d.buildId),
          `${t.id} build`
        ).toBe(true)
    }
  })

  it('Jurten: hohe Wand aus Superbahnen mit Gaze', () => {
    const jurten = [
      'jurte',
      'grossjurte',
      'gigajurte9',
      'gigajurte12',
      'theaterjurte',
      'dreierjurtenburg',
      'cafelounge'
    ]
    for (const id of jurten) {
      expect(defaultTentOptions(tent(id)), id).toMatchObject({
        wallId: 'hoch',
        buildId: 'super',
        finish: 'gaze'
      })
    }
  })

  it('Kohte mit Erdstreifen, Hochkohte normal und blanko', () => {
    expect(defaultTentOptions(tent('kohte'))).toMatchObject({ wallId: 'erdstreifen' })
    expect(defaultTentOptions(tent('hochkohte'))).toMatchObject({
      wallId: 'normal',
      buildId: 'normal',
      finish: 'blanko'
    })
  })
})
