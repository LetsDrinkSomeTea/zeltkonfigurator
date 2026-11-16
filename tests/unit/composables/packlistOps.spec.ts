import { applyOp } from '../../../src/composables/packlistOps'
import { catalog } from '../../../src/domain/catalog'
import { createPacklist, createTentConfig } from '../../../src/domain/packlist'

describe('applyOp mit unbekanntem Zelttyp', () => {
  it('lässt das festgeschriebene Material stehen statt zu werfen', () => {
    const list = createPacklist('Alt', catalog, {})
    const tent = { ...createTentConfig(catalog.tentTypes[0]), typeId: 'gibt-es-nicht-mehr' }
    const broken = { ...list, tents: [tent] }
    const next = applyOp(broken, { type: 'recalc' }, { catalog, stock: {} })
    expect(next.tents).toHaveLength(1)
    expect(next.items).toEqual(broken.items)
    const removed = applyOp(next, { type: 'removeTent', tentId: tent.id }, { catalog, stock: {} })
    expect(removed.tents).toHaveLength(0)
  })
})

describe('applyOp moveTentTo', () => {
  const ctx = { catalog, stock: {} }
  const base = createPacklist('Liste', catalog, {})
  const tents = ['a', 'b', 'c'].map((id) => ({ ...createTentConfig(catalog.tentTypes[0]), id }))
  const list = { ...base, tents }
  const ids = (l: typeof list) => l.tents.map((t) => t.id)

  it('verschiebt ein Zelt an die Zielposition', () => {
    expect(ids(applyOp(list, { type: 'moveTentTo', tentId: 'a', index: 2 }, ctx))).toEqual([
      'b',
      'c',
      'a'
    ])
    expect(ids(applyOp(list, { type: 'moveTentTo', tentId: 'c', index: 0 }, ctx))).toEqual([
      'c',
      'a',
      'b'
    ])
  })

  it('begrenzt den Index und ignoriert unbekannte Zelte und Nullbewegungen', () => {
    expect(ids(applyOp(list, { type: 'moveTentTo', tentId: 'a', index: 99 }, ctx))).toEqual([
      'b',
      'c',
      'a'
    ])
    expect(applyOp(list, { type: 'moveTentTo', tentId: 'x', index: 1 }, ctx)).toBe(list)
    expect(applyOp(list, { type: 'moveTentTo', tentId: 'b', index: 1 }, ctx)).toBe(list)
  })
})
