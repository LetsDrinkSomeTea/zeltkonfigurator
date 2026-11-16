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
