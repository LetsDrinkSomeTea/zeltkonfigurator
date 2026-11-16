import { allocate } from '../../../src/domain/allocation'
import { catalog } from '../../../src/domain/catalog'
import { createPacklist, createTentConfig, recalculate } from '../../../src/domain/packlist'
import type { Stock } from '../../../src/domain/types'

const type = (id: string) => catalog.tentTypes.find((t) => t.id === id)!

describe('Rechenkern mit echtem Katalog', () => {
  it('jeder Zelttyp lässt sich in jeder Wandoption und Dachkonfiguration berechnen', () => {
    for (const t of catalog.tentTypes) {
      // jede Dach-Variante und jeder Aufbau, jeweils für einen Baustein
      const variants = t.modules.flatMap((m, i) => [
        ...m.roofs.map((r) => ({ i, patch: { roofId: r.id } })),
        ...m.setups.map((st) => ({ i, patch: { setupId: st.id } }))
      ])
      for (const { i, patch } of variants) {
        for (const wall of t.walls) {
          const base = createTentConfig(t)
          const roofs = base.roofs.map((r, j) => (j === i ? { ...r, ...patch } : r))
          const tent = { ...base, roofs, wallId: wall.id, buildId: '' }
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

  it('2 Hochkohten und eine Jurte: Bedarf und Ausweichen', () => {
    const stock: Stock = {
      kohtenblatt: 8,
      jurtendach: 1,
      kohtendaechle: 2,
      jurtendaechle: 1,
      kohtenkreuz: 2,
      'jurtenspinne-6': 1,
      't-profil-30': 40,
      't-profil-60': 10,
      pacman: 50,
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
    // Stangen sind nicht im Bestand und fehlen
    expect(item('seitenstange')).toMatchObject({ quantity: 0, missing: 28 })
    expect(list.items.filter((i) => i.category !== 'stange').every((i) => i.missing === 0)).toBe(
      true
    )
    expect(list.deviations.filter((d) => d.kind === 'wand')).toHaveLength(2)
  })

  it('Dreierjurtenburg mit einem gehängten Dach: Masten und 60-cm-Profile je Dach', () => {
    const t = type('dreierjurtenburg')
    const base = createTentConfig(t)
    const roofs = base.roofs.map((r, i) => (i === 2 ? { ...r, setupId: 'gehaengt' } : r))
    const res = allocate([{ ...base, roofs }], ['gaze', 'fenster', 'blanko'], catalog, {})
    const need = (id: string) => res.items.find((i) => i.articleId === id)?.missing ?? 0
    // 2 gestellte Jurten: 6 × Mast 375 cm; die gehängte: 2 × Mast 500 cm und 4 × 60 cm
    expect(need('mast-375')).toBe(6)
    expect(need('mast-500')).toBe(2)
    expect(need('t-profil-60')).toBe(4)
    expect(need('jurtenspinne-6')).toBe(3)
    expect(need('pacman')).toBe(need('t-profil-30') + need('t-profil-60'))
    // Abweichung nennt das betroffene Dach
    expect(res.deviations.filter((d) => d.kind === 'dach').map((d) => d.wanted)).toEqual([
      'Jurte 1: Jurtendach',
      'Jurte 2: Jurtendach',
      'Jurte 3: Jurtendach'
    ])
  })
})
