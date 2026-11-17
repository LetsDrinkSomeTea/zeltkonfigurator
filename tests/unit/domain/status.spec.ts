import {
  countMissingItems,
  derivePacklistStatus,
  hasCheckedItems
} from '../../../src/domain/view/status'
import type { PackItem } from '../../../src/domain/types'

const item = (patch: Partial<PackItem>) => ({ missing: 0, checked: false, ...patch }) as PackItem

describe('status helpers', () => {
  it('counts articles with missing material', () => {
    const items = [item({ missing: 2 }), item({}), item({ missing: 1 })]
    expect(countMissingItems({ items })).toBe(2)
  })

  it('detects checked items and extras', () => {
    expect(hasCheckedItems({ items: [item({})], extraItems: [] })).toBe(false)
    expect(hasCheckedItems({ items: [item({ checked: true })], extraItems: [] })).toBe(true)
    expect(
      hasCheckedItems({
        items: [],
        extraItems: [{ id: 'e', text: 'x', quantity: 1, checked: true }]
      })
    ).toBe(true)
  })
})

describe('derivePacklistStatus mit weiterem Material', () => {
  it('ist nicht leer, wenn nur weiteres Material eingetragen ist', () => {
    expect(
      derivePacklistStatus({
        tents: [],
        materials: [{ articleId: 'braeter', quantity: 1 }],
        items: [],
        deviations: []
      })
    ).toBe('ok')
  })
})
