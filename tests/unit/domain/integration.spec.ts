import { allocate } from '../../../src/domain/allocation'
import { catalog } from '../../../src/domain/catalog'
import { createPacklist, createTentConfig, recalculate } from '../../../src/domain/packlist'
import type { Stock } from '../../../src/domain/types'

const type = (id: string) => catalog.tentTypes.find((t) => t.id === id)!

describe('Rechenkern mit echtem Katalog', () => {
  it('jeder Zelttyp lässt sich in jeder Wandoption und Dachkonfiguration berechnen', () => {
    for (const t of catalog.tentTypes) {
      for (const roof of t.roofs) {
        for (const wall of t.walls) {
          const tent = { ...createTentConfig(t), roofId: roof.id, wallId: wall.id, buildId: '' }
          const res = allocate([tent], ['gaze', 'fenster', 'blanko'], catalog, {})
          const wallPieces = res.items
            .filter((i) => i.category === 'wand')
            .reduce((n, i) => n + i.missing, 0)
          expect(res.status, `${t.id}/${wall.id}`).toBe('fehlt')
          expect(wallPieces > 0, `${t.id}/${wall.id}`).toBe(wall.segments > 0)
        }
      }
    }
  })

  it('2 Hochkohten und eine Jurte: Bedarf, Ausweichen und Schlagholz', () => {
    const stock: Stock = {
      kohtenblatt: 8,
      jurtendach: 1,
      kohtendaechle: 2,
      jurtendaechle: 1,
      kohtenkreuz: 2,
      'jurtenspinne-6': 1,
      hering: 40,
      abspannseil: 40,
      bodennagel: 100,
      aufzugseil: 3,
      blockseilrolle: 1,
      'superbahn-doppel-fenster': 6,
      'normalbahn-doppel': 10,
      'erweiterungsstreifen-einzel-gaze': 20
    }
    let list = createPacklist('Sommerlager', catalog, stock)
    const hoch = { wallId: 'hoch', buildId: 'super', finish: 'fenster' as const }
    list = {
      ...list,
      tents: [
        { ...createTentConfig(type('jurte')), ...hoch },
        { ...createTentConfig(type('hochkohte')), ...hoch },
        { ...createTentConfig(type('hochkohte')), ...hoch }
      ]
    }
    list = recalculate(list, catalog, stock)
    const item = (id: string) => list.items.find((i) => i.articleId === id)

    // Jurte zuerst: 6 Doppel-Superbahnen Fenster decken ihre 12 Segmente
    expect(item('superbahn-doppel-fenster')).toMatchObject({ quantity: 6, missing: 0 })
    // beide Hochkohten weichen auf Normalbahn + Streifen (Gaze) aus: 16 Segmente
    expect(item('normalbahn-doppel')).toMatchObject({ quantity: 8, missing: 0 })
    expect(item('erweiterungsstreifen-einzel-gaze')).toMatchObject({ quantity: 16, missing: 0 })
    // Stangen sind nicht im Bestand, dürfen aber geschlagen werden
    expect(item('seitenstange')).toMatchObject({ quantity: 0, missing: 0, toCut: 28 })
    expect(list.items.every((i) => i.missing === 0)).toBe(true)
    expect(list.deviations.filter((d) => d.kind === 'wand')).toHaveLength(2)
  })
})
