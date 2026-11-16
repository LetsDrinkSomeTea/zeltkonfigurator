import { chooseRoof, isRoofAvailable } from '../../../src/domain/roof'
import { jurte } from './testCatalog'

const [primary, alt] = jurte.roofs

describe('chooseRoof', () => {
  it('bevorzugte, wenn vollständig vorhanden', () => {
    const c = chooseRoof(jurte.roofs, primary, { 'dach-jurte': 1, kohtenblatt: 6 })
    expect(c).toEqual({ roof: primary, fallback: false, complete: true })
  })

  it('nächste vollständige, wenn die bevorzugte fehlt', () => {
    const c = chooseRoof(jurte.roofs, primary, { kohtenblatt: 6 })
    expect(c).toEqual({ roof: alt, fallback: true, complete: true })
  })

  it('bevorzugte ist die zweite: Ausweichen auf die erste', () => {
    const c = chooseRoof(jurte.roofs, alt, { 'dach-jurte': 1, kohtenblatt: 5 })
    expect(c).toEqual({ roof: primary, fallback: true, complete: true })
  })

  it('keine vollständig: bevorzugte mit Fehlbestand', () => {
    const c = chooseRoof(jurte.roofs, primary, { kohtenblatt: 5 })
    expect(c).toEqual({ roof: primary, fallback: false, complete: false })
  })

  it('Bestand 0', () => {
    expect(chooseRoof(jurte.roofs, primary, {}).complete).toBe(false)
  })

  it('summiert gleiche Artikel innerhalb einer Konfiguration', () => {
    const roof = {
      id: 'x',
      label: 'x',
      parts: [
        { articleId: 'a', quantity: 1 },
        { articleId: 'a', quantity: 1 }
      ]
    }
    expect(isRoofAvailable(roof, { a: 1 })).toBe(false)
    expect(isRoofAvailable(roof, { a: 2 })).toBe(true)
  })
})
